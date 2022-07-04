/*
============================================================
ORPHE.js is derived from BlueJelly.js
============================================================
BlueJelly.js
============================================================
Web Bluetooth API Wrapper Library

Copyright 2017-2020 JellyWare Inc.
https://jellyware.jp/

GitHub
https://github.com/electricbaka/bluejelly
This software is released under the MIT License.

Web Bluetooth API
https://webbluetoothcg.github.io/web-bluetooth/
*/

//--------------------------------------------------
//Orphe constructor
//--------------------------------------------------
var Orphe = function () {
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;
  this.hashUUID = {};
  this.hashUUID_lastConnected;

  //callBack
  this.onScan = function (deviceName) { console.log("onScan"); };
  this.onConnectGATT = function (uuid) { console.log("onConnectGATT"); };
  this.onRead = function (data, uuid) { console.log("onRead"); };
  this.onWrite = function (uuid) { console.log("onWrite"); };
  this.onStartNotify = function (uuid) { console.log("onStartNotify"); };
  this.onStopNotify = function (uuid) { console.log("onStopNotify"); };
  this.onDisconnect = function () { console.log("onDisconnect"); };
  this.onClear = function () { console.log("onClear"); };
  this.onReset = function () { console.log("onReset"); };
  this.onError = function (error) { console.log("onError"); };
}


//--------------------------------------------------
//setUUID
//--------------------------------------------------
Orphe.prototype.setUUID = function (name, serviceUUID, characteristicUUID) {
  console.log('Execute : setUUID');
  console.log(this.hashUUID);
  this.hashUUID[name] = { 'serviceUUID': serviceUUID, 'characteristicUUID': characteristicUUID };
}


//--------------------------------------------------
//scan
//--------------------------------------------------
Orphe.prototype.scan = function (uuid) {
  return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice(uuid))
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//requestDevice
//--------------------------------------------------
Orphe.prototype.requestDevice = function (uuid) {
  console.log('Execute : requestDevice');

  let options = {
    /*
    ORPHE core module name: CR-2, CR-3
    */
    filters: [
      //{ services: ['db1b7aca-cda5-4453-a49b-33a53d3f0833'] },
      //{ services: [0x1802, 0x1803] },
      //{ services: ['c48e6067-5295-48d3-8d5c-0395f61792b1'] },
      //{ name: 'CR-2' },
      { namePrefix: 'CR-' }
    ],
    //acceptAllDevices: true,
    optionalServices: [this.hashUUID[uuid].serviceUUID]
  }

  return navigator.bluetooth.requestDevice(options)
    .then(device => {
      this.bluetoothDevice = device;
      this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnect);
      this.onScan(this.bluetoothDevice.name);
    });


  // ---- Orphe original code -----
  // return navigator.bluetooth.requestDevice({
  //   acceptAllDevices: true,
  //   optionalServices: [this.hashUUID[uuid].serviceUUID]
  // })
  //   .then(device => {
  //     this.bluetoothDevice = device;
  //     this.bluetoothDevice.addEventListener('gattserverdisconnected', this.onDisconnect);
  //     this.onScan(this.bluetoothDevice.name);
  //   });
}


//--------------------------------------------------
//connectGATT
//--------------------------------------------------
Orphe.prototype.connectGATT = function (uuid) {
  if (!this.bluetoothDevice) {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }
  if (this.bluetoothDevice.gatt.connected && this.dataCharacteristic) {
    if (this.hashUUID_lastConnected == uuid)
      return Promise.resolve();
  }
  this.hashUUID_lastConnected = uuid;

  console.log('Execute : connect');
  return this.bluetoothDevice.gatt.connect()
    .then(server => {
      console.log('Execute : getPrimaryService');
      return server.getPrimaryService(this.hashUUID[uuid].serviceUUID);
    })
    .then(service => {
      console.log('Execute : getCharacteristic');
      return service.getCharacteristic(this.hashUUID[uuid].characteristicUUID);
    })
    .then(characteristic => {
      this.dataCharacteristic = characteristic;
      this.dataCharacteristic.addEventListener('characteristicvaluechanged', this.dataChanged(this, uuid));
      this.onConnectGATT(uuid);
    })
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//dataChanged
//--------------------------------------------------
Orphe.prototype.dataChanged = function (self, uuid) {
  return function (event) {
    self.onRead(event.target.value, uuid);
  }
}



//--------------------------------------------------
//read
//--------------------------------------------------
Orphe.prototype.read = function (uuid) {
  return (this.scan(uuid))
    .then(() => {
      return this.connectGATT(uuid);
    })
    .then(() => {
      console.log('Execute : readValue');
      return this.dataCharacteristic.readValue();
    })
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//write
//--------------------------------------------------
Orphe.prototype.write = function (uuid, array_value) {
  return (this.scan(uuid))
    .then(() => {
      return this.connectGATT(uuid);
    })
    .then(() => {
      console.log('Execute : writeValue');
      data = Uint8Array.from(array_value);
      return this.dataCharacteristic.writeValue(data);
    })
    .then(() => {
      this.onWrite(uuid);
    })
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//startNotify
//--------------------------------------------------
Orphe.prototype.startNotify = function (uuid) {
  return (this.scan(uuid))
    .then(() => {
      return this.connectGATT(uuid);
    })
    .then(() => {
      console.log('Execute : startNotifications');
      this.dataCharacteristic.startNotifications()
    })
    .then(() => {
      this.onStartNotify(uuid);
    })
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}


//--------------------------------------------------
//stopNotify
//--------------------------------------------------
Orphe.prototype.stopNotify = function (uuid) {
  return (this.scan(uuid))
    .then(() => {
      return this.connectGATT(uuid);
    })
    .then(() => {
      console.log('Execute : stopNotifications');
      this.dataCharacteristic.stopNotifications()
    })
    .then(() => {
      this.onStopNotify(uuid);
    })
    .catch(error => {
      console.log('Error : ' + error);
      this.onError(error);
    });
}
Orphe.prototype.isConnected = function () {
  if (!this.bluetoothDevice) {
    return false;
  }
  return this.bluetoothDevice.gatt.connected;
}

//--------------------------------------------------
//disconnect
//--------------------------------------------------
Orphe.prototype.disconnect = function () {
  if (!this.bluetoothDevice) {
    var error = "No Bluetooth Device";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }

  if (this.bluetoothDevice.gatt.connected) {
    console.log('Execute : disconnect');
    this.bluetoothDevice.gatt.disconnect();
  } else {
    var error = "Bluetooth Device is already disconnected";
    console.log('Error : ' + error);
    this.onError(error);
    return;
  }
}


//--------------------------------------------------
//clear
//--------------------------------------------------
Orphe.prototype.clear = function () {
  console.log('Excute : Clear Device and Characteristic');
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;
  this.onClear();
}


//--------------------------------------------------
//reset(disconnect & clear)
//--------------------------------------------------
Orphe.prototype.reset = function () {
  console.log('Excute : reset');
  this.disconnect(); //disconnect() is not Promise Object
  this.clear();
  this.onReset();
}


//--------------------
// Orphe
//--------------------
Object.defineProperty(Orphe, 'ORPHE_INFORMATION', { value: "01a9d6b5-ff6e-444a-b266-0be75e85c064", writable: true });
Object.defineProperty(Orphe, 'ORPHE_DEVICE_INFORMATION', { value: "24354f22-1c46-430e-a4ab-a1eeabbcdfc0", writable: true });

Object.defineProperty(Orphe, 'ORPHE_OTHER_SERVICE', { value: "db1b7aca-cda5-4453-a49b-33a53d3f0833", writable: false });
Object.defineProperty(Orphe, 'ORPHE_SENSOR_VALUES', { value: "f3f9c7ce-46ee-4205-89ac-abe64e626c0f", writable: false });
Object.defineProperty(Orphe, 'ORPHE_REALTIME_ANALYSIS', { value: "adb7eb5a-ac8a-4f95-907b-45db4a71b45a", writable: false });
Object.defineProperty(Orphe, 'ORPHE_STEP_ANALYSIS', { value: "4eb776dc-cf99-4af7-b2d3-ad0f791a79dd", writable: false });