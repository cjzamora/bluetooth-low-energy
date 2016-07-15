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
                // has response?
                if(response.value) {
                    // get the response value
                    var returnEncoded = bluetoothle.encodedStringToBytes(response.value);
                    // // get the bytes as string
                    var returnString  = bluetoothle.bytesToString(returnEncoded);

                    // replace raw encoded value
                    response.value = returnString;
                }

                successCallback.call(self, response);
            }, function(response) {
                errorCallback.call(self, response);
            }, data);

            successCallback.call(self, { notified : true, sent : true });
        },

        // notify by chunks
        notifyByChunk : function(data, successCallback, errorCallback) {
            // maximum packet size
            var MAX_PACKET_SIZE = 20;
            // max message chunk size
            var MAX_CHUNK_SIZE  = 10;
            // get the total packet size
            var size            = this.byteLength(data.value);
            // convert the message
            var message         = bluetoothle.stringToBytes(data.value);

            // write id, can't think of any random id :p
            var id      = this.generateUid();
            // write action
            var action  = 0x1;

            // create header
            var header = new Uint32Array(6);

            // convert id to bytes
            id = bluetoothle.stringToBytes(id.toString());

            // set -, action on header
            header.set([0x2D, 0x1], 0);
            // set the id bytes
            header.set(id, 2);

            // calculate total transfer iteration
            var total   = Math.ceil(size / MAX_CHUNK_SIZE);
            // total written
            var written = 0;

            // we need to know the scope
            var self = this;

            this.debug('Writting ' + size + ' byte(s) of data.');

            // set the write interval
            var interval = setInterval(function() {
                // initialize payload
                var payload = new Uint32Array(20);
                // chop message
                var slice   = message.slice(written * MAX_CHUNK_SIZE, (written + 1) * MAX_CHUNK_SIZE);

                try {
                    // set payload header
                    payload.set(header, 0);
                    // set the message
                    payload.set(slice, slice.length);

                    // encode message
                    payload = bluetoothle.bytesToString(payload);
                } catch(e) {
                    self.debug('Unable to write chunks.');

                    clearInterval(interval);
                }

                // notify the payload
                self.notify({
                    address         : data.address,
                    characteristic  : data.characteristic,
                    service         : data.service,
                    value           : payload
                }, function(response) {
                    // EOF?
                    if(total == ++written) {
                        // write eof
                        var eof = new Uint32Array(20);

                        // update header
                        header[1] = 0x0;

                        // set header
                        eof.set(header, 0);

                        // encode eof header
                        eof = bluetoothle.bytesToString(eof);

                        // notify eof
                        self.notify({
                            address         : data.address,
                            characteristic  : data.characteristic,
                            service         : data.service,
                            value           : eof
                        }, function(response) {
                            // call success callback
                            successCallback.call(self, { 'eof' : true });
                        }, function(response) {
                            // error callback
                            errorCallback.call(self, response);
                        });

                        // debug
                        self.debug(size + ' byte(s) of data written with write id ' + bluetoothle.bytesToString(id));

                        clearInterval(interval);
                    }
                }, function(response) {
                    // error callback
                    errorCallback.call(self, response);

                    // clear interval
                    clearInterval(interval);
                });
            }, 80);
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
                var encodedString = bluetoothle.bytesToEncodedString(encodedBytes);

                // update response value
                data.value = encodedString;
                // set chunk write flag
                data.chunk = true;

                this.debug(this.byteLength(this.writeBuffer[writeId].value.join('')) + ' byte(s) of data received with write id ' + writeId);
                
                // flush buffer by id
                delete this.writeBuffer[writeId];

                // invoke defered callback
                return this.initPeripheralFn.call(this, data);
            }

            // push data
            this.writeBuffer[writeId].value.push(writeData.replace(/\u0000/g, ''));
        },

        // calculate byte length
        byteLength : function(string) {
            // returns the byte length of an utf8 string
            var s = string.length;

            for (var i = string.length - 1; i >= 0; i --) {
                var code = string.charCodeAt(i);

                if (code > 0x7f && code <= 0x7ff) s++;
                else if (code > 0x7ff && code <= 0xffff) s+=2;
                if (code >= 0xDC00 && code <= 0xDFFF) i--; // trail surrogate
            }

            return s;
        },

        // generate basic uid
        generateUid : function() {
            return ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
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