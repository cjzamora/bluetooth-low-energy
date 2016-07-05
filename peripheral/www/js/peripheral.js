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

        // log flag
        log : true,

        // init peripheral fn
        initPeripheralFn : function() {},

        // debug fn
        debugFn : function() {},

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