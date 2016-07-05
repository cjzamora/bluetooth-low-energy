var BLECentral = function() {
    return {
        // scan timeout
        SCAN_TIMEOUT : 10000,

        // maximum device RSSI
        RSSI_MAX : -100,

        // scan definition
        scanParam : {
            'services'          : ['1000'],
            'allowDuplicates'   : true,
            'scanMode'          : bluetoothle.SCAN_MODE_BALANCED,
            'matchMode'         : bluetoothle.MATCH_MODE_STICKY,
            'matchNum'          : bluetoothle.MATCH_NUM_MAX_ADVERTISEMENT,
            'callbackType'      : bluetoothle.CALLBACK_TYPE_ALL_MATCHES
        },

        // scan in progress?
        scanInProgress : false,

        // log flag
        log : false,

        // subscribe fn
        subscribeFn : function() {},

        // debug fn
        debugFn : function() {},

        // set deubg
        setDebug : function(debug) {
            this.log = typeof debug === 'boolean' ? debug : false;

            return this;
        },

        // init bluetooth
        initBluetooth: function(callback) {
            var self = this;

            // bluetooth enabled?
            bluetoothle.isEnabled(function(response) {
                // not enabled?
                if(!response.isEnabled) {
                    // initialize it
                    bluetoothle.initialize(function(response) {
                        callback.call(self, response);
                    }, { request : true });
                } else {
                    callback.call(self, { status: 'enabled' });
                }
            });
        },

        // init location
        initLocation: function() {
            var self = this;

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

        // init scan
        initScan : function(callback) {
            var self  = this;
            var param = this.scanParam;

            // check scan status
            bluetoothle.isScanning(function(response) {
                // scanning in progress?
                if(!response.isScanning) {
                    // scan in progress flag
                    self.scanInProgress = true;

                    // initialize scan
                    bluetoothle.startScan(function(response) {
                        callback.call(self, response);
                    }, function(response) {
                        callback.call(self, response);
                    }, param);
                } else {
                    // scan in progress flag
                    self.scanInProgress = true;

                    callback.call(self, { status : 'scanInProgress' });
                }
            });
        },

        // init connection
        initConnection : function(address, callback) {
            var self  = this;
            var param = { address : address }; 

            // device connected?
            bluetoothle.isConnected(function(response) {
                // set status
                response.status = response.isConnected ? 'connected' : 'disconnected';

                if(response.status === 'disconnected') {
                    // close connection
                    bluetoothle.close(function(response) {
                        setTimeout(function() {
                            // let's connect
                            bluetoothle.connect(function(response) {
                                callback.call(self, response);
                            }, function(response) {
                                bluetoothle.close(function() {}, function() {}, param);

                                callback.call(self, response);
                            }, param);
                        }, 1000);
                    }, function(response) {
                        callback.call(self, response);
                    }, param);

                    return;
                }

                callback.call(self, response);
            }, function(response) {
                // let's connect
                if(response.error === 'neverConnected') {
                    // let's connect
                    bluetoothle.connect(function(response) {
                        callback.call(self, response);
                    }, function(response) {
                        bluetoothle.close(function() {}, function() {}, param);

                        callback.call(self, response);
                    }, param);
                } else {
                    callback.call(self, { 
                        error   : 'unableToConnect', 
                        message : 'Unable to connect to device.' 
                    });
                }
            }, param);
        },

        // initialize device disovery
        initDiscover : function(address, callback) {
            var self  = this;
            var param = { 'address' : address };

            // discover device information
            bluetoothle.discover(function(response) {
                callback.call(self, response);
            }, function(response) {
                callback.call(self, response);
            }, param);
        },

        // initialize service subscription
        initSubscribe : function(param, callback) {
            var self = this;

            bluetoothle.unsubscribe(function(response) {
                bluetoothle.subscribe(function(response) {
                    callback.call(self, response);
                }, function(response) {
                    callback.call(self, response);
                }, param);
            }, function(response) {
                bluetoothle.subscribe(function(response) {
                    callback.call(self, response);
                }, function(response) {
                    callback.call(self, response);
                }, param);

                callback.call(self, response);
            }, param);
        },

        // initialize device disconnect
        initDisconnect : function(callback) {},

        // stop scanning
        stopScan : function(callback) {
            var self = this; 

            // check scan status
            bluetoothle.isScanning(function(response) {
                // scanning in progress?
                if(response.isScanning) {
                    // set scan flag
                    self.scanInProgress = false;

                    // stop scan
                    bluetoothle.stopScan(function(response) {
                        callback.call(self, response);
                    }, function(response) {
                        callback.call(self, response);
                    });
                } else {
                    callback.call(self, { status : 'scanStopped' });
                }
            });
        },

        // scan peripherals
        scan : function(successCallback, errorCallback) {
            // scan in progress?
            if(this.scanInProgress) {
                this.debug('Scan in-progress');

                return successCallback.call(this, { status : 'scanInProgress' });
            }

            // initialize bluetooth
            this.initBluetooth(function(response) {
                // bluetooth enabled?
                if(response.status === 'enabled') {
                    this.debug('Bluetooth status enabled.');

                    // initialize scan
                    initScan.apply(this);
                } else {
                    this.debug('Bluetooth status disabled');

                    errorCallback.call(this, response);
                }
            });

            // initialize scan
            var initScan = function() {
                // initialize scan
                this.initScan(function(response) {
                    // scan started?
                    if(response.status === 'scanStarted'
                    || response.status === 'scanResult') {
                        this.debug('Scan successful.');

                        return successCallback.call(this, response);
                    }

                    // error?
                    if(response.error) {
                        this.debug('Unable to start scan: ' + response.message);

                       return errorCallback.call(this, response);
                    }
                });
            };
        },

        // connect to address
        connect : function(address, successCallback, errorCallback) {
            // initialize connection
            this.initConnection(address, function(response) {
                // received a status?
                if(response.status) {
                    // discover device
                    initDiscover.call(this, response);
                }

                // received an error?
                if(response.error) {
                    return errorCallback.call(this, response);
                }
            });

            // initialize discover
            var initDiscover = function(device) {
                // initialize discover
                this.initDiscover(address, function(response) {
                    // discovered?
                    if(response.status === 'discovered') {
                        // set discovered data
                        device.info = response;

                        // subscribe
                        initSubscribe.call(this, device);
                    }

                    // error?
                    if(response.error) {
                        return errorCallback.call(this, response);
                    }
                });
            };

            // initialize subscribe
            var initSubscribe = function(device) {
                // get the device services
                var services = device.info.services;
                var service  = {};

                for(var i in services) {
                    var uuid = services[i].uuid;

                    if(uuid === '1000') {
                        service = services[i];
                    }
                }

                // set request params
                var param = {
                    'address'           : device.address,
                    'service'           : service.uuid,
                    'characteristic'    : service.characteristics[0].uuid
                };

                // initialize subscribe
                this.initSubscribe(param, function(response) {
                    this.debug(response);
                    
                    this.subscribeFn.call(this, response);

                    successCallback.call(this, device);
                });
            };
        },

        // write to address
        write : function(data, successCallback, errorCallback) {
            var self    = this;
            // convert to bytes
            var bytes   = bluetoothle.stringToBytes(data.value);
            // encode bytes
            var encoded = bluetoothle.bytesToEncodedString(bytes);

            // set data value
            data.value = encoded;

            // send write request
            bluetoothle.write(function(response) {
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
        },

        // read from address
        read : function(address, message, successCallback, errorCallback) {

        },

        // write by chunks
        writeByChunk : function(data, successCallback, errorCallback) {
            // max packet size in bytes
            var MAX_PACKET_SIZE = 20;
            // get the total packet size
            var size = this.byteLength(data.value);

            // write id, can't think of any random id :p
            var id      = Math.ceil(Math.random() * (9999 - 1000) + 1000);
            // write action
            var action  = 0x1;

            // header
            var header = ['---', action, id, size].join('');
            // convert string to bytes
            var bytes = bluetoothle.stringToBytes(data.value);
            // calculate total iteration
            var totalTransfer = bytes.length / header.length;

            // iterate on total transfer iteration
            for(var i = 1; i <= totalTransfer; i ++) {
                // generate byte headers
                var byteHeader = bluetoothle.stringToBytes(header);
                // slice message
                var message = bytes.slice((i - 1) * 10, i * 10);

                // genearte final payload
                var payload = new Uint8Array(20);

                // fill header
                payload.set(byteHeader, 0);
                // fill message
                payload.set(message, 10);

                (function(payload, scope) {
                    var copy = data;

                    copy.value = bluetoothle.bytesToEncodedString(payload);

                    scope.write(copy, function(response) {
                        console.log(response);
                    }, function(response) {

                    });
                })(payload, this);
            }

            console.log('Write total length in bytes: ' + size);
            console.log('Max packet size: ' + MAX_PACKET_SIZE);
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

        // on subscribe
        onSubscribe : function(callback) {
            this.subscribeFn = callback;

            return this;
        },

        // on debug
        onDebug : function(callback) {
            this.debugFn = callback;

            return this;
        }
    };
};