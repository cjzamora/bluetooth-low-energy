# Bluetooth Low Enegery Phonegap Application

Bluetooth Low Energy Sample Phonegap Application for Peripheral and Central Devices.

Run this commands on peripheral and central folder.

Add android platform:
```
phonegap add platform android
```

Install BLE Plugin:
```
phonegap plugin add cordova-plugin-bluetoothle
```

> **NOTE** The app needs to run in an actual device for us to be able to utilize the device bluetooth and location service.

The following commands will show you how to deploy it in real devices.

First, let's get the device id's ***(Make sure that the device is connected and USB Debugging is enabled, also make sure that Android SDK API 22-24 and Android Debug Bridge (ADB) is installed.***

Run Android Debug Bridge command:
```
adb devices
```

Show's list of devices, the left hand side shows the device id.
```
List of devices attached
22c4f234    device
TA38503GLJ  device
```

Now let's run the deployment command using phonegap:
```
phonegap run android --verbose --debug --target=[device_id]
```

Wait for the command to finish it will automatically install and run the APK to the device.