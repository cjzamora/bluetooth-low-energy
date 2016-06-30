var BLECentral = function() {
    return {
        // scan timeout
        SCAN_TIMEOUT : 10000,

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
        log : true,

        // debug fn
        debugFn : function() {},

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
                    }, function(response) {
                        callback.call(self, response);
                    });
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
                this.debug(response);

                // received a status?
                if(response.status) {
                    return successCallback.call(this, response);
                }

                // received an error?
                if(response.error) {
                    return errorCallback.call(this, response);
                }
            });
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

        // on debug
        onDebug : function(callback) {
            this.debugFn = callback;

            return this;
        }
    };
};