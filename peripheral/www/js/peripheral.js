var BLEPeripheral = function() {
    return {
        // advertise timeout
        ADVERTISE_TIMEOUT   : 500,
        // service name
        SERVICE_NAME        : 'PP1',

        // service definition
        serviceParam : {
            service : '1000',
            characteristics : [
                {
                    uuid        : '1a00',
                    permissions : {
                        read : true,
                        write : true
                    },
                    properties : {
                        read                    : true,
                        writeWithoutResponse    : true,
                        write                   : true,
                        notify                  : true,
                        indicate                : true
                    }
                }
            ]
        },

        // write buffer
        writeBuffer : {},

        // log flag
        log : false,

        // init peripheral fn
        initPeripheralFn : function() {},

        // debug fn
        debugFn : function() {},

        // set deubg
        setDebug : function(debug) {
            this.log = typeof debug === 'boolean' ? debug : false;

            return this;
        },

        // init bluetooth
        initBluetooth: function(callback) {
            var self  = this;
            var param = {
                'request'     : true,
                'restoreKey'  : 'bleplugin'
            };

            // bluetooth enabled?
            bluetoothle.isEnabled(function(response) {
                // not enabled?
                if(!response.isEnabled) {
                    // initialize it
                    bluetoothle.initialize(function(response) {
                        callback.call(self, response);
                    }, param);
                } else {
                    callback.call(self, { status: 'enabled' });
                }
            });
        },

        // init location
        initLocation: function() {
            var self  = this;

            // is location enabled?
            bluetoothle.isLocationEnabled(function(response) {
                // not enabled?
                if(!response.isLocationEnabled) {
                    // request location
                    bluetoothle.requestLocation(function(response) {
                        // are we good?
                        if(response.requestLocation) {
                            callback.call(self, response);
                        }
                    }, function(response) {
                        callback.call(self, response);
                    });
                } else {
                    callback.call(self, { 'requestLocation' : true });
                }
            }, function(response) {
                callback.call(self, response);
            });
        },

        // init peripheral
        initPeripheral : function(callback) {
            var self    = this;
            var params  = {
                'request'    : true,
                'restoreKey' : 'bleplugin'
            };

            // initialize peripherial
            bluetoothle.initializePeripheral(function(response) {
                // write chunk?
                if(response.status === 'writeRequested'
                && response.value.indexOf('LQ') === 0) {
                    // defer callback and handle write
                    return self.handleChunkWrite.call(self, response);
                }
                // call callback fn
                self.initPeripheralFn.call(self, response);

                callback.call(self, response);
            }, function(response) {
                callback.call(self, response);
            }, params);
        },

        // init service
        initService : function(callback) {
            var self  = this;
            var param = this.serviceParam;

            // remove all services first before adding a new one
            bluetoothle.removeAllServices(function(response) {
                // initialize service
                bluetoothle.addService(function(response) {
                    callback.call(self, response);
                }, function(response) {
                    callback.call(self, response);
                }, param);
            }, function(response) {
                callback.call(self, response);
            });
        },

        // init advertise
        initAdvertise : function (callback) {
            var self  = this;
            var param = {
                'services'                  : [this.serviceParam.service], //iOS
                'service'                   : this.serviceParam.service, //Android
                'name'                      : this.serviceParam.name,
                'mode'                      : 'lowLatency',
                'connectable'               : true,
                'timeout'                   : this.ADVERTISE_TIMEOUT,
                'powerLevel'                : 'high',
                'manufacturerId'            : 01,
                'manufacturerSpecificData'  : 'Rand'
            };

            // stop advertising
            bluetoothle.stopAdvertising(function(response) {
                // re-advertise if we are advertising before
                bluetoothle.startAdvertising(function(response) {
                    callback.call(self, response);
                }, function(response) {
                    callback.call(self, response);
                }, param);
            }, function(response) {
                callback.call(self, response);
            });
        },

        // stop advertising
        stopAdvertising : function(callback) {
            var self = this;

            bluetoothle.stopAdvertising(function(response) {
                callback.call(self, response);
            }, function(response) {
                callback.call(self, response);
            });
        },

        // remove service
        removeService : function(callback) {
            var self = this;

            // remove all services
            bluetoothle.removeService(function(response) {
                callback.call(self, response);
            }, function(response) {
                callback.call(self, response);
            }, { service : this.serviceParam.service });
        },

        // start advertisement
        advertise : function(successCallback, errorCallback) {
            // initialize bluetooth
            this.initBluetooth(function(response) {
                // bluetooth enabled?
                if(response.status === 'enabled') {
                    this.debug('Bluetooth status enabled.');

                    // initialize peripheral
                    initPeripheral.apply(this);
                } else {
                    this.debug('Bluetooth status disabled');

                    errorCallback.call(this, response);
                }
            });

            // initialize peripheral
            var initPeripheral = function() {
                // initialize peripheral
                this.initPeripheral(function(response) {
                    // peripheral enabled?
                    if(response.status === 'enabled') {
                        this.debug('Periperhal initialized.');

                        // initialize service
                        initService.apply(this);
                    }

                    // error?
                    if(response.error) {
                        this.debug('Unable to initialize peripheral: ' + response.message);

                        errorCallback.call(this, response);
                    }
                });
            };

            // initialize service
            var initService = function() {
                // initialize service
                this.initService(function(response) {
                    // service added?
                    if(response.status === 'serviceAdded') {
                        this.debug('Service initialized.');

                        // init advertise
                        initAdvertise.apply(this);
                    }

                    // error?
                    if(response.error) {
                        this.debug('Service already initialized.');

                        // maybe the service is already there?
                        // then let's advertise again.
                        initAdvertise.apply(this);
                    }
                });
            };

            // initialize advertise
            var initAdvertise = function() {
                // initialize advertise
                this.initAdvertise(function(response) {
                    // advertising started?
                    if(response.status === 'advertisingStarted') {
                        this.debug('Advertising initialized.');

                        successCallback.call(this, response);
                    }

                    // error?
                    if(response.error) {
                        this.debug('Unable to initialize advertising: ' + response.message);

                        errorCallback.call(this, response);
                    }
                });
            };
        },

        // notify to subscribed device
        notify : function(data, successCallback, errorCallback) {
            var self    = this;
            // convert to bytes
            var bytes   = bluetoothle.stringToBytes(data.value);
            // encode bytes
            var encoded = bluetoothle.bytesToEncodedString(bytes);

            // set data value
            data.value = encoded;

            // send notify request
            bluetoothle.notify(function(response) {
                successCallback.call(self, response);
            }, function(response) {
                errorCallback.call(self, response);
            }, data);
        },

        // handle write chunk and defer write callback
        handleChunkWrite : function(data) {
            // decode string to bytes
            var decodedBytes    = bluetoothle.encodedStringToBytes(data.value);
            // decode bytes to string
            var decodedString   = bluetoothle.bytesToString(decodedBytes);

            // get the write prefix
            var writePrefix  = decodedString.substring(0, 1);
            // get the write id
            var writeId      = decodedString.substring(2, 6);
            // get the write action
            var writeAction  = decodedBytes[1];
            // get the write data
            var writeData    = decodedString.substring(6);

            // data buffer exists?
            if(!(writeId in this.writeBuffer)) {
                // set write buffer settings
                this.writeBuffer[writeId] = {
                    timeout : Date.now() + 5000,
                    value   : []
                };
            }

            // write eof?
            if(!writeAction) {
                // encode string to bytes
                var encodedBytes = bluetoothle.stringToBytes(this.writeBuffer[writeId].value.join(''));
                // encode bytes to encoded string
                var encodedString = bluetoothle.bytesToString(encodedBytes);

                // update response value
                data.value = encodedString;
                // set chunk write flag
                data.chunk = true;

                // flush buffer by id
                delete this.writeBuffer[writeId];

                this.debug(data);

                return;
            }

            // push data
            this.writeBuffer[writeId].value.push(writeData.replace(/\\u0000/g, ''));
        },

        // debug helper
        debug : function(message) {
            if(typeof message === 'object') {
                message = JSON.stringify(message);
            }

            message = '[debug]: ' + message;
            this.log && console.log(message);
            this.log && this.debugFn.call(this, message);

            return this;
        },

        // on init peripheral
        onInitPeripheral : function(callback) {
            this.initPeripheralFn = callback;

            return this;
        },

        // on debug
        onDebug : function(callback) {
            this.debugFn = callback;

            return this;
        }
    };
};