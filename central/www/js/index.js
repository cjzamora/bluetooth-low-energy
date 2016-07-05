/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// debug helper
var log = function(message) {
    if(typeof message === 'object') {
        message = JSON.stringify(message);
    }

    logger.innerHTML += '[BLE]: ' + message + '\n';

    logger.scrollTop = logger.scrollHeight;

    console.log(message);
};

// peripheral devices
var peripherals = {};
// central instance
var central     = null;

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
       log('Starting central process.');

        // init ble central
        central = BLECentral();

        // debug
        central.setDebug(false);

        // on debug
        central.onDebug(function(message) {
            log(message);
        });

        // on subscribe notify
        central.onSubscribe(function(response) {
            // notification from server?
            if(response.status === 'subscribedResult') {
                // get encoded data
                var bytes  = bluetoothle.encodedStringToBytes(response.value);
                // get the string
                var string = bluetoothle.bytesToString(bytes);

                log('Notify: ' + string);
            }
        });

        // start scanning for peripherals
        setTimeout(app.scan.bind(app), 2000);
    },

    // start scanning for devices
    scan : function() {
        var self = this;

        // start scanning
        central.scan(function(response) {
            // peripheral result?
            if(response.status === 'scanResult') {
                // maximum rssi?
                if(Math.abs(response.rssi) >= Math.abs(central.RSSI_MAX)) {
                    log('Device too far away...');
                }

                // update peripherals
                peripherals = self.handleScan(response);
            }
        }, function(response) {

        });

        setTimeout(function() {
            // stop the scan
            central.stopScan(function(response) {
                // update peripheral list
                self.updatePeripheralList(peripherals);

                // connect to peripheral
                self.connectToPeripherals(peripherals);

                setTimeout(function() {
                    app.scan(central);
                }, 10000);
            });
        }, 2000);
    },

    // handle scan results
    handleScan: function(peripheral) {
        peripheral.rssi = null;

        // peripheral exists?
        if(!(peripheral.name in peripherals)) {
            // set peripheral key
            peripherals[peripheral.name] = {};

            // set peripheral info
            peripherals[peripheral.name].info   = peripheral;
            // set peripheral status
            peripherals[peripheral.name].status = 'disconnected';
            // set peripheral timestamp
            peripherals[peripheral.name].added  = Date.now();
            // set peripheral expire
            peripherals[peripheral.name].expire = Date.now() + (60000 * 5);

            return peripherals;
        }

        // peripheral exists?
        if(peripheral.name in peripherals) {
            // get the original
            var original = JSON.stringify(peripherals[peripheral.name].info);
            // get the recent
            var recent   = JSON.stringify(peripheral);

            // has the same info?
            if(recent === original) {
                // nothing to do
                return peripherals;
            } else {
                log('Device information updated.');

                // is it expired?
                if(peripherals[peripheral.name].expire <= Date.now()) {
                    // remove the peripheral
                    delete peripherals[peripheral.name];

                    return peripherals;
                }

                // set peripheral info
                peripherals[peripheral.name].info   = peripheral;
            }

            return peripherals;
        }
    },

    // connect to peripherals
    connectToPeripherals: function(list) {
        var self = this;

        // do we have peripherals?
        if(JSON.stringify(peripherals) === '{}') {
            log('No peripherals found.');

            return this;
        }

        // device length
        var max   = this.objLength(list);
        var index = 0;

        // iterate on each peripherals
        for(var i in list) {
            // connect to peripheral
            (function(i, list, peripherals) {
                central.connect(
                list[i].info.address, 

                // on success connection / disconnect
                function(response) {
                    // set device status
                    peripherals[i].status = response.status;
                    // set device information
                    peripherals[i].device = response.info;

                    // are we good?
                    if(index === max) {
                        // update device list
                        self.updatePeripheralList(peripherals);
                    }
                }, 

                // on error processing connection
                function(response) {
                    peripherals[i].status = 'error';

                    // are we good?
                    if(index === max) {
                        // update peripheral list
                        self.updatePeripheralList(peripherals);
                    }
                });

                index = index + 1;
            })(i, list, peripherals);
        }
    },

    // update peripheral list
    updatePeripheralList: function(peripherals) {
        // do we have peripherals?
        if(JSON.stringify(peripherals) === '{}') {
            // update template
            peripheralContainer.innerHTML = '<div class="no-peripheral">No available peripherals.</div>';

            return this;
        }

        // get the peripheral template
        var baseTpl  = peripheralTpl.innerHTML;
        // combined template
        var combined = '';
        
        // iterate on each peripherals
        for(var i in peripherals) {
            var tpl = baseTpl;

            tpl = tpl
            .replace('{{name}}', peripherals[i].info.address)
            .replace('{{id}}', peripherals[i].info.address)
            .replace('{{id}}', peripherals[i].info.address)
            .replace('{{status}}', peripherals[i].status);

            combined += tpl;
        }

        // update peripheral container
        peripheralContainer.innerHTML = combined;

        return this;
    },

    // write data to peripheral
    write : function(e) {
        // prompt for message
        var message = prompt('Enter your message: ');

        // get the address
        var address         = e.getAttribute('data-id');
        // get the information
        var information     = {};

        // look for that id
        for(var i in peripherals) {
            // matched the id?
            if(peripherals[i].info.address === address) {
                // get the information
                information = peripherals[i];

                break;
            }
        }

        // get the services
        var services = information.device.services;
        // look for our service
        var service  = {};

        for(var i in services) {
            var uuid = services[i].uuid;

            if(uuid === '1000') {
                service = services[i];
            }
        }

        message = [
            '12345678901234567890',
            '12345678911234567891'
        ].join('');

        // set request params
        var param = {
            'address'           : information.info.address,
            'service'           : service.uuid,
            'characteristic'    : service.characteristics[0].uuid,
            'type'              : 'noResponse',
            'value'             : message
        };

        // write to device
        // central.write(param, function(response) {
        //     log(response);
        // }, function(response) {
        //     log(response);
        // });

        central.writeByChunk(param, function(response) {

        }, function(response) {
            
        });
    },

    // object length helper
    objLength: function(object) {
        var len = 0;

        for(var i in object) {
            len = len + 1;
        }

        return len;
    }
};
