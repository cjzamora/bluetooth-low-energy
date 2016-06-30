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

// central device
var central    = {};
// peripheral instance
var peripheral = null;

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
        log('Starting peripheral process.');

        // init ble peripheral
        peripheral = BLEPeripheral();

        // init advertise
        var advertise = setInterval(app.advertise.bind(app), 20000);

        // on debug
        peripheral.onDebug(function(message) {
            // log message
            log(message);
        });

        // on peripheral callback
        peripheral.onInitPeripheral(function(response) {
            // set central device
            if(response.address) {
                // central device name set?
                response.name = response.name ? response.name : response.address;

                // get response
                central = response;

                // update central list
                app.updateCentralList(central);
            }

            // if we are connected
            if(response.status === 'connected') {
                // stop advertising this device
                clearInterval(advertise);
            }


            // disconnection?
            if(response.status === 'disconnected') {
                central = {};

                // update list
                app.updateCentralList(central);

                // restart interval
                clearInterval(advertise);

                // start interval
                advertise = setInterval(app.advertise.bind(app), 20000);
            }
        });
    },

    // start advertising
    advertise: function() {
        var self = this;

        // start advertising
        peripheral.advertise(function(response) {
            // advertising started?
            if(response.status === 'advertisingStarted') {
                // update peripheral information
                self.updatePeripheralStatus(response);
            }
        }, function(response) {
            log('Error occur while advertising device: ' + response.message);
        });
    },  

    // update central list
    updateCentralList: function(central) {
        // do we have central?
        if(JSON.stringify(central) === '{}') {
            // update template
            centralContainer.innerHTML = '<div class="no-central">No available central device.</div>';

            return this;
        }

        // get the central template
        var baseTpl  = centralTpl.innerHTML;
        var tpl      = baseTpl;

        tpl = tpl
        .replace('{{name}}', central.name)
        .replace('{{id}}', central.address)
        .replace('{{id}}', central.address)
        .replace('{{status}}', central.status);

        // update central container
        centralContainer.innerHTML = tpl;

        return this;
    },

    // update peripheral status
    updatePeripheralStatus: function(data) {
        // do we have a status?
        if(JSON.stringify(data) === '{}') {
            // get the template
            var tpl = statusTpl.innerHTML;

            tpl = tpl
            .replace('{{mode}}', 'N/A')
            .replace('{{timeout}}', 'N/A')
            .replace('{{tx}}', 'N/A')
            .replace('{{connectable}}', 'False')
            .replace('{{status}}', 'N/A');

            peripheralInfo.innerHTML = tpl;

            return;
        }

        // get the template
        var tpl = statusTpl.innerHTML;

        tpl = tpl
        .replace('{{mode}}', data.mode)
        .replace('{{timeout}}', data.timeout)
        .replace('{{tx}}', data.txPowerLevel)
        .replace('{{connectable}}', data.isConnectable)
        .replace('{{status}}', data.status);

        peripheralInfo.innerHTML = tpl;
    }
};
