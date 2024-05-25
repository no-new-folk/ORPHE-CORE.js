var orphe_js_version_date = `
Last modified: 2024/05/25 09:42:01
`;
/**
ORPHE.js is javascript library for ORPHE CORE Module, inspired by BlueJelly.js
@module Orphe
@author Tetsuaki BABA
@version 1.0.1

@see https://github.com/Orphe-OSS/ORPHE-CORE.js
*/

// float16.min.js を読み込む
var float16Script = document.createElement('script');
float16Script.src = 'https://cdn.jsdelivr.net/gh/Orphe-OSS/ORPHE-CORE.js@main/js/float16.min.js';
float16Script.type = 'text/javascript';
float16Script.crossOrigin = 'anonymous';
document.head.appendChild(float16Script);

// quaternion.js を読み込む
var quaternionScript = document.createElement('script');
quaternionScript.src = 'https://cdn.jsdelivr.net/gh/Orphe-OSS/ORPHE-CORE.js@main/js/quaternion.js';
quaternionScript.type = 'text/javascript';
quaternionScript.crossOrigin = 'anonymous';
document.head.appendChild(quaternionScript);

/**
 * @class
 * Orphe Constructor
 * @param {number} _num specifies id of your ORPHE CORE Module
 */
function Orphe(_num) {
  this.bluetoothDevice = null;
  this.dataCharacteristic = null;// 通知を行うcharacteristicを保持する
  this.dataChangedEventHandlerMap = {};
  this.hashUUID = {};
  this.hashUUID_lastConnected;
  this.id = _num;


  // device information用の配列
  this.array_device_information = new DataView(new ArrayBuffer(20));

  /**
   * Associative array of device information. begin()を呼び出すとデバイスから値を取得して初期化される． 
   * @param {uint8} battery
   *  this.device_information = {
        battery: data.getUint8(0),
        lr: data.getUint8(1),
        rec_mode: data.getUint8(2),
        rec_auto_run: data.getUint8(3),
        led_brightness: data.getUint8(4),
        range: {
          acc: data.getUint8(8),
          gyro: data.getUint8(9)
        }
      }
   */

  // 以下メンバ変数の初期化
  this.device_information = '';
  this.gait = {
    type: 0,
    direction: 0,
    calorie: 0,
    distance: 0,
    steps: 0,
    standing_phase_duration: 0,
    swing_phase_duration: 0
  }
  this.stride = {
    foot_angle: 0,
    x: 0,
    y: 0,
    z: 0,
    steps: 0,
  }
  this.pronation = {
    landing_impact: 0,
    x: 0,
    y: 0,
    z: 0,
    steps: 0,
  }
  this.steps_number = 0;
  this.quat = {
    w: 0.0, x: 0.0, y: 0.0, z: 0.0
  }
  this.delta = {
    x: 0.0, y: 0.0, z: 0.0
  }
  this.euler = {
    pitch: 0.0,
    roll: 0.0,
    yaw: 0.0
  }
  this.gyro = {
    x: 0.0, y: 0.0, z: 0.0
  }
  this.acc = {
    x: 0.0, y: 0.0, z: 0.0
  }
  this.converted_gyro = {
    x: 0.0, y: 0.0, z: 0.0
  }
  this.converted_acc = {
    x: 0.0, y: 0.0, z: 0.0
  }
  // メンバ変数の初期化ここまで
  //////////////////////////

}

/**
 * @class Orphe static object この他にもいくつかUUIDがありますが，ここには記載していません．
 * @type {Object} 
 * @property {string} ORPHE_INFORMATION "01a9d6b5-ff6e-444a-b266-0be75e85c064" SERVICE_UUID
 * @property {string} ORPHE_DEVICE_INFORMATION "24354f22-1c46-430e-a4ab-a1eeabbcdfc0" CHARACTERISTIC_UUID
 * 
 * @property {string} ORPHE_OTHER_SERVICE "db1b7aca-cda5-4453-a49b-33a53d3f0833" SERVICE_UUID
 * @property {string} ORPHE_SENSOR_VALUES "f3f9c7ce-46ee-4205-89ac-abe64e626c0f" CHARACTERISTIC_UUID
 * @property {string} ORPHE_STEP_ANALYSIS "4eb776dc-cf99-4af7-b2d3-ad0f791a79dd"
 */
Object.defineProperty(Orphe, 'ORPHE_INFORMATION', { value: "01a9d6b5-ff6e-444a-b266-0be75e85c064", writable: true });
Object.defineProperty(Orphe, 'ORPHE_DEVICE_INFORMATION', { value: "24354f22-1c46-430e-a4ab-a1eeabbcdfc0", writable: true });
Object.defineProperty(Orphe, 'ORPHE_OTHER_SERVICE', { value: "db1b7aca-cda5-4453-a49b-33a53d3f0833", writable: false });
Object.defineProperty(Orphe, 'ORPHE_SENSOR_VALUES', { value: "f3f9c7ce-46ee-4205-89ac-abe64e626c0f", writable: false });
Object.defineProperty(Orphe, 'ORPHE_STEP_ANALYSIS', { value: "4eb776dc-cf99-4af7-b2d3-ad0f791a79dd", writable: false });

/**
 * @class Orphe prototype object 
 * @type {Object} 
 * 
 * @property {function} setup setup UUID by predefined name, DEVICE_INFORMATION, SENSOR_VALUES, STEP_ANALYSIS
 * @property {function} begin begin BLE connection
  */
Orphe.prototype =
{
  setUUID: function (name, serviceUUID, characteristicUUID) {
    this.hashUUID[name] = { 'serviceUUID': serviceUUID, 'characteristicUUID': characteristicUUID };
  },
  /**
   * 最初に必要な初期化処理メソッドです。利用するキャラクタリスティック（DEVICE_INFORMATION, SENSOR_VALUES, STEP_ANALYSIS）の指定の他、オプションを指定することができます。オプションでは生データの取得を指定することができます。通常利用では引数を省略して setup() が呼び出されることが多いです。
   * @param {string[]} [string[]=["DEVICE_INFORMATION", "SENSOR_VALUES", "STEP_ANALYSIS"]] DEVICE_INFORMATION, SENSOR_VALUES, STEP_ANALYSIS
   * @param {object} [options = {is_raw_data_monitoring:false}] - is_raw_data_monitoring: trueの場合、生データを取得します。falseの場合、解析データを取得します。デフォルトはfalseです。
   */
  setup: function (
    names = ['DEVICE_INFORMATION', 'SENSOR_VALUES', 'STEP_ANALYSIS'],
    options = { is_raw_data_monitoring: false }
  ) {
    if (options.is_raw_data_monitoring == true) {
      this.is_raw_data_monitoring = true;
    }
    else {
      this.is_raw_data_monitoring = false;
    }
    for (const name of names) {
      if (name == 'DEVICE_INFORMATION') {
        this.setUUID(name, Orphe.ORPHE_INFORMATION, Orphe.ORPHE_DEVICE_INFORMATION);
      }
      else if (name == 'SENSOR_VALUES') {
        this.setUUID(name, Orphe.ORPHE_OTHER_SERVICE, Orphe.ORPHE_SENSOR_VALUES);
      }
      else if (name == 'STEP_ANALYSIS') {
        this.setUUID(name, Orphe.ORPHE_OTHER_SERVICE, Orphe.ORPHE_STEP_ANALYSIS);
      }
    }
  },

  /**
   *  begin BLE connection 
   * SENSOR_VALUESまたはSTEP_ANALYSISのセンサー値の取得を開始します。
   * @param {string} [notification_type="STEP_ANALYSIS"] STEP_ANALYSIS, SENSOR_VALUES, STEP_ANALYSIS_AND_SENSOR_VALUES
   * @param {object} [options={range:{acc:-1, gyro:-1}}] {range:{acc:[2,4,8,16],gyro:[250,500,1000,2000]}
   * @async
   * @return {Promise<string>} 
   */
  begin: async function (
    str_type = 'STEP_ANALYSIS',
    options = { range: { acc: -1, gyro: -1 } }
  ) {

    // ----------------------------------------------
    // @Depricated beginの引数である RAW, ANALYSISに関して混乱を招くので、setup()でのUUID設定に合わせ
    // RAW: SENSOR_VALUES, ANALYSIS: STEP_ANALYSIS に変更することとした。しばらくは両方の引数を受け付ける
    if (str_type == 'RAW') {
      str_type = 'SENSOR_VALUES';
      console.warn("RAW is deprecated. Please use SENSOR_VALUES instead.");
    }
    if (str_type == 'ANALYSIS') {
      str_type = 'STEP_ANALYSIS';
      console.warn("ANALYSIS is deprecated. Please use STEP_ANALYSIS instead.");
    }
    if (str_type == 'ANALYSIS_AND_RAW') {
      str_type = 'STEP_ANALYSIS_AND_SENSOR_VALUES';
      console.warn("ANALYSIS_AND_RAW is deprecated. Please use STEP_ANALYSIS_AND_SENSOR_VALUES instead.");
    }
    // Deprecated開始: 2024/05/25
    // ----------------------------------------------

    const {
      range = { acc: -1, gyro: -1 },
    } = options;
    this.notification_type = str_type;

    let obj = await this.getDeviceInformation();
    if (range.acc == 16) obj.range.acc = 3;
    if (range.acc == 8) obj.range.acc = 2;
    if (range.acc == 4) obj.range.acc = 1;
    if (range.acc == 2) obj.range.acc = 0;
    if (range.gyro == 2000) obj.range.gyro = 3;
    if (range.gyro == 1000) obj.range.gyro = 2;
    if (range.gyro == 500) obj.range.gyro = 1;
    if (range.gyro == 250) obj.range.gyro = 0;
    // 設定値の書き換え
    this.setDeviceInformation(obj);


    // ここで実際にnotifyを開始しています．
    return new Promise((resolve, reject) => {

      if (str_type == "STEP_ANALYSIS") {
        this.startNotify('STEP_ANALYSIS').then(() => {
          //console.log("analysis---")
          resolve("done begin(); STEP ANALYSIS");
        })
          .catch(err => {
            //alert(err)
            reject('User cancel.')
          }
          );
      }
      else if (str_type == "SENSOR_VALUES") {
        this.startNotify('SENSOR_VALUES').then(() => {
          //console.log("raw---")
          resolve("done begin(); SENSOR VALUES");
        });
      }
      else if (str_type == "STEP_ANALYSIS_AND_SENSOR_VALUES") {
        this.startNotify('STEP_ANALYSIS').then(() => {
          this.startNotify('SENSOR_VALUES').then(() => {
            //console.log("analysis and raw---")
            resolve("done begin(); STEP_ANALYSIS and SENSOR VALUES");
          });
        });
      }
    })
      .then(async (result) => {  // この関数をasyncで宣言
        // ここにresolveされたときに実行する共通のコードを書く
        return result;
      })
      .catch(error => {  // ダイアログのキャンセルはそのまま閉じる
        this.onError(error);
        return;
      });

  },
  /**
   * stop and disconnect GATT connection
   */
  stop: function () {
    this.reset();
  },

  /**
   * set LED mode
   * @param {int} on_off 0: turning off the LED, 1: turning on the LED
   * @param {int} pattern 0-4
   */
  setLED: function (on_off, pattern) {
    const data = new Uint8Array([0x02, on_off, pattern]);
    this.write('DEVICE_INFORMATION', data);
  },
  /**
   * sets the LED Brightness
   * @param {uint8} value 0-255, 0:turning off the LED
   */
  setLEDBrightness: function (value) {
    this.array_device_information.setUint8(2, value);
    this.write('DEVICE_INFORMATION', this.array_device_information);
  },
  /**
   * Reset motion sensor attitude, quaternion culculation.
   */
  resetMotionSensorAttitude: function () {
    const data = new Uint8Array([0x03]);
    this.write('DEVICE_INFORMATION', data);
  },
  /**
   * Reset Analysis logs in the core module.
   */
  resetAnalysisLogs: function () {
    const data = new Uint8Array([0x04]);
    this.write('DEVICE_INFORMATION', data);
  },
  scan: function (uuid, options = {}) {
    return (this.bluetoothDevice ? Promise.resolve() : this.requestDevice(uuid))
      .catch(error => {
        //console.log('Error : ' + error);
        this.onError(error);
      });
  },
  /**
   * Execute requestDevice()
   * @param {string} uuid 
   * 
   */
  requestDevice: function (uuid) {
    let options = {
      /*
      ORPHE core module name: CR-2, CR-3
      service UUIDを ORPHE_OTHER_SERVICE に指定することで，ORPHE core moduleのみを検出することができます．さらに，namePrefixを指定することで，CR-2, CR-3のみを検出することができます．
      */
      filters: [
        { services: ['db1b7aca-cda5-4453-a49b-33a53d3f0833', '01a9d6b5-ff6e-444a-b266-0be75e85c064'] },
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
  },
  connectGATT: function (uuid) {
    if (!this.bluetoothDevice) {
      var error = "No Bluetooth Device";
      //console.log('Error : ' + error);
      this.onError(error);
      return;
    }
    if (this.bluetoothDevice.gatt.connected && this.dataCharacteristic) {
      if (this.hashUUID_lastConnected == uuid)
        return Promise.resolve();
    }
    this.hashUUID_lastConnected = uuid;

    //console.log('Execute : connect');
    return this.bluetoothDevice.gatt.connect()
      .then(server => {
        //console.log('Execute : getPrimaryService');
        return server.getPrimaryService(this.hashUUID[uuid].serviceUUID);
      })
      .then(service => {
        //console.log('Execute : getCharacteristic');
        return service.getCharacteristic(this.hashUUID[uuid].characteristicUUID);
      })
      .then(characteristic => {
        this.dataCharacteristic = characteristic;
        // this.dataCharacteristic.addEventListener('characteristicvaluechanged', this.dataChanged(this, uuid));
        this.onConnectGATT(uuid);
        this.onConnect(uuid);
      })
      .catch(error => {
        //console.log('Error : ' + error);
        this.onError(error);
      });
  },
  //--------------------------------------------------
  //dataChanged
  //--------------------------------------------------
  dataChanged: function (self, uuid) {
    return function (event) {
      self.onRead(event.target.value, uuid);
    }
  },
  /**
   * Read BLE data
   * @param {string} uuid DEVICE_INFORMATION
   * 
   */
  read: function (uuid) {
    //return this.dataCharacteristic.readValue();
    // console.log(uuid);
    return (this.scan(uuid))
      .then(() => {
        return this.connectGATT(uuid);
      })
      .then(() => {
        //      console.log('Execute : readValue', this.dataCharacteristic.readValue());
        return this.dataCharacteristic.readValue();
      })
      .catch(error => {
        // console.log('Error : ' + error);
        //throw 'read error';
        this.onError(error);
      });
  },
  /**
   * write data to the BLE device
   * @param {string} uuid DEVICE_INFORMATION, SENSOR_VALUES, STEP_ANALYSIS
   * @param {dataView} array_value write bytes
   * 
   */
  write: function (uuid, array_value) {
    return (this.scan(uuid))
      .then(() => {
        return this.connectGATT(uuid);
      })
      .then(() => {
        //console.log('Execute : writeValue');
        const data = Uint8Array.from(array_value);
        return this.dataCharacteristic.writeValue(data);
      })
      .then(() => {
        this.onWrite(uuid);
      })
      .catch(error => {
        //console.log('Error : ' + error);
        this.onError(error);
      });
  },
  /**
   * Stop Notification
   * @param {string} uuid 
   * 
   */
  startNotify: function (uuid) {
    // 
    return this.scan(uuid)
      .then(() => this.connectGATT(uuid))
      .then(() => this.dataCharacteristic.startNotifications())
      .then(() => {
        this.dataChangedEventHandlerMap[uuid] = this.dataChanged(this, uuid);
        this.dataCharacteristic.addEventListener('characteristicvaluechanged', this.dataChangedEventHandlerMap[uuid]);
        this.onStartNotify(uuid);
      })
      .catch(error => {
        console.error('startNotify: Error : ' + error);
        this.onError(error);
      });
  },
  /**
   * Stop Notification
   * @param {string} uuid 
   * 
   */
  stopNotify: function (uuid) {
    return this.scan(uuid) // BLEデバイスのスキャンを開始します。
      .then(() => {
        return this.connectGATT(uuid); // GATTサーバーに接続します。
      })
      .then(() => {
        // stopNotificationsメソッドを呼び出してNotificationを停止します。
        // このメソッドはPromiseを返すため、その完了を待つ必要があります。

        return this.dataCharacteristic.stopNotifications();
      })
      .then(() => {
        // Notificationを停止した後のコールバック関数を呼び出します。
        // this.dataCharacteristic.removeEventListener('characteristicvaluechanged', this.dataChanged(this, uuid));
        // イベントハンドラを解除
        if (this.dataChangedEventHandlerMap[uuid]) {
          this.dataCharacteristic.removeEventListener(
            'characteristicvaluechanged',
            this.dataChangedEventHandlerMap[uuid]
          );
          // 登録されたハンドラをマップから削除
          delete this.dataChangedEventHandlerMap[uuid];
        }
        this.onStopNotify(uuid);
      })
      .catch(error => {
        // どこかのステップでエラーが発生した場合、そのエラーを処理する関数を呼び出します。
        this.onError(error);
      });

  },
  isConnected: function () {
    if (!this.bluetoothDevice) {
      return false;
    }
    return this.bluetoothDevice.gatt.connected;
  },

  //--------------------------------------------------
  //disconnect
  //--------------------------------------------------
  disconnect: function () {
    if (!this.bluetoothDevice) {
      var error = "No Bluetooth Device";
      //console.log('Error : ' + error);
      this.onError(error);
      return;
    }

    if (this.bluetoothDevice.gatt.connected) {
      //console.log('Execute : disconnect');
      this.bluetoothDevice.gatt.disconnect();
    } else {
      var error = "Bluetooth Device is already disconnected";
      //console.log('Error : ' + error);
      this.onError(error);
      return;
    }
  },
  setDeviceInformation: function (obj) {
    const senddata = new Uint8Array([0x01, obj.lr, obj.led_brightness, 0, obj.rec_auto_run, obj.time01, obj.time02, obj.range.acc, obj.range.gyro]);
    //const senddata = new Uint8Array([0x01, 0, 128, 0, 0, 0, 60, 0, 0]);
    //console.log(senddata);
    this.write('DEVICE_INFORMATION', senddata);
  },
  //--------------------------------------------------
  //clear
  //--------------------------------------------------
  clear: function () {
    //console.log('Excute : Clear Device and Characteristic');
    this.bluetoothDevice = null;
    this.dataCharacteristic = null;
    this.onClear();
  },
  /**
   * reset(disconnect & clear)
   */
  reset: function () {
    //console.log('Excute : reset');
    this.disconnect(); //disconnect() is not Promise Object
    this.clear();
    this.onReset();
  },

  timestamp: {
    start: 0,
    millis: function () {
      const blenow = performance.now();
      let diff = (blenow - this.start);
      this.start = blenow;
      return diff;
    },
    getHz: function () {
      let t = this.millis();
      if (t <= 15) return -1;
      else return 1000 / t;
    }
  },

  // Readコールバック
  /**
   * Incoming byte callback function. コアモジュールから送信されるデータを受信するコールバック関数です。それぞれのUUIDに対応するデータを正しく整形して対応するコールバック関数に渡します。ユーザはコールバック関数を手元のコードでオーバーライドして利用します。
   * @param {dataView} data incoming bytes
   * @param {string} uuid 
   */
  onRead: function (data, uuid) {
    // console.log(uuid, data.byteLength, data.getUint8(0));
    // 受け取ったデータそのままがほしければ gotData を利用する

    let ret = this.timestamp.getHz();
    if (ret > 0) this.gotBLEFrequency(ret);

    if (this.is_raw_data_monitoring == true) {
      this.gotData(data, uuid);
      return;
    }
    // デバイス情報Readの場合    
    if (uuid == 'DEVICE_INFORMATION') {
      /*
      read pay load
                  0: バッテリー残量
                  1: 左右
                  2: 記録モード
                  3: 自動ラン記録
                  4: LEDの明るさ
                  5: モーターの強さ
                  6: ログの単位時間(上位)
                  7: ログの単位時間(下位)
                  8: 加速度レンジ
                  9: ジャイロレンジ
                  --------------
                  write pay load
                  0: ヘッダー1
                  1: 左右
                  2: LEDの明るさ
                  3: モーターの強さ
                  4: 自動ラン記録On,Off
                  5: ログの単位時間(上位)
                  6: ログの単位時間(下位)
                  7: 加速度レンジ
                  8: ジャイロレンジ
                  9-19: 0
      */
      this.array_device_information.setUint8(0, 1);
      this.array_device_information.setUint8(1, data.getUint8(1));
      this.array_device_information.setUint8(2, data.getUint8(4));
      this.array_device_information.setUint8(3, data.getUint8(5));
      this.array_device_information.setUint8(4, data.getUint8(3));
      this.array_device_information.setUint8(5, data.getUint8(6));
      this.array_device_information.setUint8(6, data.getUint8(7));
      this.array_device_information.setUint8(7, data.getUint8(8));
      this.array_device_information.setUint8(8, data.getUint8(9));
      for (let i = 9; i <= 19; i++) {
        this.array_device_information.setUint8(i, 0);
      }
      this.device_information = {
        battery: data.getUint8(0),
        lr: data.getUint8(1),
        rec_mode: data.getUint8(2),
        rec_auto_run: data.getUint8(3),
        led_brightness: data.getUint8(4),
        time01: data.getUint8(6),
        time02: data.getUint8(7),
        range: {
          acc: data.getUint8(8),
          gyro: data.getUint8(9)
        }
      }
      // デバイスインフォメーションを取得したら確認の為LEDの発光パターンを1にしておく
      // const senddata = new Uint8Array([0x02, 1, 0]);
      // this.write('DEVICE_INFORMATION', senddata);
    }
    else if (uuid == 'STEP_ANALYSIS') {
      const buffer = new ArrayBuffer(20);
      const view = new DataView(buffer);

      const {
        Float16Array, isFloat16Array, isTypedArray,
        getFloat16, setFloat16,
        hfround,
      } = float16;
      const header = data.getUint8(1);
      const steps_now = data.getUint16(2);
      if ((0 <= header && header <= 2) && steps_now > this.steps_number) {
        this.gotStepsNumber({ value: steps_now });
        this.steps_number = steps_now;
      }
      // Gait Overview
      if (data.getUint8(1) == 0 && steps_now > this.gait.steps) {
        let type = data.getUint8(4);
        type = type & 0b00000011;
        let direction = data.getUint8(4);
        direction = direction & 0b00011100;
        direction = direction >>> 2;
        const calorie = getFloat16(data, 6);
        const dist = data.getFloat32(8);
        this.gait.type = type;
        this.gait.direction = direction;
        this.gait.calorie = calorie;
        this.gait.distance = dist;
        this.gait.steps = steps_now;
        this.gait.standing_phase_duration = data.getFloat32(12);
        this.gait.swing_phase_duration = data.getFloat32(16);
        this.gotGait(this.gait);
        this.gotType({ value: this.gait.type });
        this.gotDistance({ value: this.gait.distance });
        this.gotDirection({ value: this.gait.direction });
        this.gotCalorie({ value: this.gait.calorie });
        this.gotStandingPhaseDuration({ value: this.gait.standing_phase_duration });
        this.gotSwingPhaseDuration({ value: this.gait.swing_phase_duration });
      }
      // Stride
      else if (data.getUint8(1) == 1 && steps_now > this.stride.steps) {
        //console.log(steps_now, this.stride.steps);
        this.stride.foot_angle = data.getFloat32(4);
        this.stride.x = data.getFloat32(8);
        this.stride.y = data.getFloat32(12);
        this.stride.z = data.getFloat32(16);
        this.stride.steps = steps_now;
        this.gotFootAngle({ value: this.stride.foot_angle });
        this.gotStride({
          x: this.stride.x,
          y: this.stride.y,
          z: this.stride.z,
          steps_number: this.stride.steps
        });
      }
      // Pronation
      else if (data.getUint8(1) == 2 && steps_now > this.pronation.steps) {
        this.pronation.landing_impact = data.getFloat32(4);
        this.pronation.x = data.getFloat32(8);
        this.pronation.y = data.getFloat32(12);
        this.pronation.z = data.getFloat32(16);
        this.pronation.steps = steps_now;
        this.gotPronation({
          x: this.pronation.x,
          y: this.pronation.y,
          z: this.pronation.z
        });
        this.gotLandingImpact({ value: this.pronation.landing_impact })

      }
      // Stride Attitude -- Not implemented
      else if (data.getUint8(1) == 3) {

      }
      // Quat and delta
      else if (data.getUint8(1) == 4) {
        this.quat = {
          w: getFloat16(data, 6),
          x: getFloat16(data, 8),
          y: getFloat16(data, 10),
          z: getFloat16(data, 12)
        }
        this.delta = {
          x: getFloat16(data, 14),
          y: getFloat16(data, 16),
          z: getFloat16(data, 18)
        }

        let q = new Quaternion(this.quat.w, this.quat.x, this.quat.y, this.quat.z);
        this.euler = q.toEuler();

        this.gotQuat(this.quat);
        this.gotDelta(this.delta);
        this.gotEuler(this.euler);

        // if (this.notification_type == 'ANALYSIS' || this.notification_type == 'ANALYSIS_AND_RAW') {
        //   let ret = this.timestamp.getHz();
        //   if (ret > 0) this.gotBLEFrequency(ret);
        // }

      }
      // Sensor test
      else if (data.getUint8(1) == 5) {

      }
      // delta elapsed time test
      else if (data.getUint8(1) == 6) {

      }
    }
    else if (uuid == 'SENSOR_VALUES') {

      // 魔改造200Hzの場合はヘッダが50
      if (data.getUint8(0) == 50) {

        // エラー処理
        if (data.byteLength != 92) {
          console.warn("SENSOR VALUES: Data length is not 92");
          return
        }

        // 50Hzで毎でおくられてくるデータのタイムスタンプ。
        // 200Hz分取り出す場合は、全て同じタイムスタンプになるので、packet_numberを付与して識別する
        let serial_number = data.getUint16(1);

        // COREから送られてきたタイムスタンプをUNIXタイムスタンプに変換
        function toTimestamp(hours, minutes, seconds, milliseconds) {
          // 現在の日付を取得
          const now = new Date();

          // Dateオブジェクトに時間を設定
          now.setHours(hours);
          now.setMinutes(minutes);
          now.setSeconds(seconds);
          now.setMilliseconds(milliseconds);

          // タイムスタンプ（ミリ秒）を返す
          return now.getTime();
        }
        let timestamp = toTimestamp(
          data.getUint8(3),
          data.getUint8(4),
          data.getUint8(5),
          data.getUint16(6)
        )

        let gyroRange = this.device_information.range.gyro;
        let accRange = this.device_information.range.acc;

        // 値を変換
        if (gyroRange == 0) gyroRange = 250;
        if (gyroRange == 1) gyroRange = 500;
        if (gyroRange == 2) gyroRange = 1000;
        if (gyroRange == 3) gyroRange = 2000;
        if (accRange == 0) accRange = 2;
        if (accRange == 1) accRange = 4;
        if (accRange == 2) accRange = 8;
        if (accRange == 3) accRange = 16;

        let t_start = timestamp;
        // それぞれの値は29毎で、4つ分ある
        for (let i = 3; i >= 0; i--) {

          serial_number = data.getUint16(1);

          // 2番目移行のtimestampは最初のタイムスタンプとの差分になっているため
          // t_startに数値を足す処理を行って、各パケットのtimestampを算出する
          if (i > 0) {
            timestamp = t_start + data.getUint8(28 + 21 * (i - 1));
          }


          this.quat = {
            w: data.getInt16(8 + 21 * i) / 32768,
            x: data.getInt16(10 + 21 * i) / 32768,
            y: data.getInt16(12 + 21 * i) / 32768,
            z: data.getInt16(14 + 21 * i) / 32768,
            timestamp: timestamp,
            serial_number: serial_number,
            packet_number: i
          }
          this.gyro = {
            x: data.getInt16(16 + 21 * i) / 32768,
            y: data.getInt16(18 + 21 * i) / 32768,
            z: data.getInt16(20 + 21 * i) / 32768,
            timestamp: timestamp,
            serial_number: serial_number,
            packet_number: i
          }
          this.acc = {
            x: data.getInt16(22 + 21 * i) / 32768,
            y: data.getInt16(24 + 21 * i) / 32768,
            z: data.getInt16(26 + 21 * i) / 32768,
            timestamp: timestamp,
            serial_number: serial_number,
            packet_number: i
          }
          // ジャイロと加速度補正をかけたものを別途作成
          this.converted_gyro = {
            x: this.gyro.x * gyroRange,
            y: this.gyro.y * gyroRange,
            z: this.gyro.z * gyroRange,
            timestamp: timestamp,
            serial_number: serial_number,
            packet_number: i
          };
          this.converted_acc = {
            x: this.acc.x * accRange,
            y: this.acc.y * accRange,
            z: this.acc.z * accRange,
            timestamp: timestamp,
            serial_number: serial_number,
            packet_number: i
          };

          this.gotAcc(this.acc);
          this.gotQuat(this.quat);
          this.gotGyro(this.gyro);
          this.gotConvertedAcc(this.converted_acc);
          this.gotConvertedGyro(this.converted_gyro);
          let q = new Quaternion(this.quat.w, this.quat.x, this.quat.y, this.quat.z);
          this.euler = q.toEuler();
          this.gotEuler(this.euler);
        }


        // 実際のBLE受信頻度の計算処理
        // if (this.notification_type == 'RAW') {
        //   let ret = this.timestamp.getHz();
        //   if (ret > 0) this.gotBLEFrequency(ret);
        // }

      }
      // 通常のupdate sensor valuesであればヘッダは40
      else if (data.getUint8(0) == 40) {

        this.quat = {
          w: data.getInt16(1) / 32768,
          x: data.getInt16(3) / 32768,
          y: data.getInt16(5) / 32768,
          z: data.getInt16(7) / 32768
        }
        this.gyro = {
          x: data.getInt8(9) / 127,
          y: data.getInt8(10) / 127,
          z: data.getInt8(11) / 127
        }
        this.acc = {
          x: data.getInt8(14) / 127,
          y: data.getInt8(15) / 127,
          z: data.getInt8(16) / 127
        }
        // ジャイロと加速度補正をかけたものを別途作成
        this.converted_gyro = {
          x: this.gyro.x * gyroRange,
          y: this.gyro.y * gyroRange,
          z: this.gyro.z * gyroRange,
        };
        this.converted_acc = {
          x: this.acc.x * accRange,
          y: this.acc.y * accRange,
          z: this.acc.z * accRange,
        };
        this.gotAcc(this.acc);
        this.gotQuat(this.quat);
        this.gotGyro(this.gyro);
        this.gotConvertedAcc(this.converted_acc);
        this.gotConvertedGyro(this.converted_gyro);
        let q = new Quaternion(this.quat.w, this.quat.x, this.quat.y, this.quat.z);
        this.euler = q.toEuler();
        this.gotEuler(this.euler);
      }




    }

  },
  getDeviceInformation: async function () {
    return new Promise((resolve, reject) => {
      this.read('DEVICE_INFORMATION').then((data) => {
        this.array_device_information.setUint8(0, 1);
        this.array_device_information.setUint8(1, data.getUint8(1));
        this.array_device_information.setUint8(2, data.getUint8(4));
        this.array_device_information.setUint8(3, data.getUint8(5));
        this.array_device_information.setUint8(4, data.getUint8(3));
        this.array_device_information.setUint8(5, data.getUint8(6));
        this.array_device_information.setUint8(6, data.getUint8(7));
        this.array_device_information.setUint8(7, data.getUint8(8));
        this.array_device_information.setUint8(8, data.getUint8(9));
        for (let i = 9; i <= 19; i++) {
          this.array_device_information.setUint8(i, 0);
        }
        this.device_information = {
          battery: data.getUint8(0),
          lr: data.getUint8(1),
          rec_mode: data.getUint8(2),
          rec_auto_run: data.getUint8(3),
          led_brightness: data.getUint8(4),
          range: {
            acc: data.getUint8(8),
            gyro: data.getUint8(9)
          }
        }
        resolve(this.device_information);
      }).catch(error => {  // ダイアログのキャンセルはそのまま閉じる
        console.log('Error: ' + error);
        this.onError(error);
        reject(error);
      });
    });
  },


  //--------------------------------------------------
  //一般開発ユーザからアクセス可能な関数のプロトタイプ定義
  /**
   * ORPHE TERMINAL用に作成した関数。onReadで受け取ったデータをそのまま渡す。この関数を利用する場合は setup() の is_raw_data_monitoring = true にする必要がある。dataview形式なので、取り扱い方法については ORPHE TERMINALのソースを参照するとよい。
   * @param {dataview} data onReadで取得したすべてのデータ
   */
  gotData: function (data) {
    //console.log('prototype.gotQuat');
  },

  /**
   * コアモジュールのクオータニオン情報を取得する
   * @param {Object} quat {w,x,y,z} クオータニオンの取得
   */
  gotQuat: function (quat) {
    //console.log('prototype.gotQuat');
  },
  /**
   * ジャイロ（x,y,zの角速度）を取得する
   * @param {Object} gyro {x,y,z} ジャイロの取得
   */
  gotGyro: function (gyro) {
    //console.log('prototype.gotGyro');
  },
  /**
   * 加速度を取得する。加速度レンジに応じて変換された値がほしい場合は、gotConvertedAccを利用すること
   * 対応CharacteristicはSENSOR_VALUES
   * @param {Object} acc {x,y,z} 加速度の取得
   */
  gotAcc: function (acc) {
    //console.log('prototype.gotAcc');
  },
  /**
   * ジャイロレンジに応じて変換された値を取得する。
   * @param {Object} gyro {x,y,z} ジャイロレンジに応じて変換したジャイロの取得
   */
  gotConvertedGyro: function (gyro) {
    //console.log('prototype.gotGyro');
  },
  /**
   * コアモジュールで設定されている加速度レンジに応じて変換された値を取得する。
   * @param {Object} acc {x,y,z} 加速度レンジに応じて変換した加速度の取得
   */
  gotConvertedAcc: function (acc) {
    //console.log('prototype.gotAcc');
  },
  /**
   * 
   * @param {Object} delta {x,y,z} x,y,zの変位
   */
  gotDelta: function (delta) {
    //console.log('prototype.gotDelta');
  },
  /**
   * コアモジュールのオイラー角を取得する。オイラー角の取得は破綻する可能性があるため、姿勢を取る場合はクオータニオンを利用すること
   * @param {Object} euler {pitch, roll, yaw} オイラー角
   */
  gotEuler: function (euler) {
    //console.log('prototype.gotEuler');
  },
  /**
   * 歩容解析の取得
   * @param {Object} gait {type, direction, calorie, distance} 歩行解析の取得
   */
  gotGait: function (gait) {
    //console.log('prototype.gotGait');
  },
  /**
   * 現在の歩容タイプを取得する
   * @param {Object} type {value} 0:none, 1:walk, 2:run, 3:stand 
   */
  gotType: function (type) {
  },
  /**
   * ランニングの方向を取得する
   * @param {Object} direction {value} 0:none, 1:foward, 2:backward, 3:inside, 4:outside
   */
  gotDirection: function (direction) {
  },
  /**
   * 総消費カロリーを取得する
   * @param {Object} calorie {value}
   */
  gotCalorie: function (calorie) {
  },

  /**
   * 総移動距離を取得する
   * @param {Object} distance {value} 
   */
  gotDistance: function (distance) {
  },

  /**
   * 立脚期継続時間[s]を取得する
   * @param {*} standing_phase_duration 
   */
  gotStandingPhaseDuration: function (standing_phase_duration) {
  },

  /**
   * 遊脚期継続時間[s]を取得する
   * @param {*} swing_phase_duration 
   */
  gotSwingPhaseDuration: function (swing_phase_duration) {

  },
  /**
   * ストライド[m]の取得
   * @param {Object} stride {x,y,z}
   */
  gotStride: function (stride) {
  },
  /**
   * 着地角度[degree]の取得
   * @param {Object} foot_angle {value}
   */
  gotFootAngle: function (foot_angle) {
  },

  /**
   * プロネーション[degree]の取得
   * @param {Object} pronation {x,y,z}
   */
  gotPronation: function (pronation) {
  },
  /**
   * 着地衝撃力[kgf/weight]の取得
   * @param {Object} landing_impact {value}
   */
  gotLandingImpact: function (landing_impact) {
  },
  /**
   * 現在までの歩数を取得する
   * @param {Object} steps_number {value}
   */
  gotStepsNumber: function (steps_number) {
  },

  onScan: function (deviceName) { console.log("onScan"); },
  onConnectGATT: function (uuid) { console.log("onConnectGATT"); },
  onConnect: function (uuid) { console.log("onConnect"); },
  onWrite: function (uuid) { console.log("onWrite"); },
  onStartNotify: function (uuid) { console.log("onStartNotify", uuid); },
  onStopNotify: function (uuid) { console.log("onStopNotify", uuid); },
  onDisconnect: function () { console.log("onDisconnect"); },

  /**
   * notification frequencyの実測値を取得する
   * @param {float} frequency 
   */
  gotBLEFrequency: function (frequency) { },
  onClear: function () { console.log("onClear"); },
  onReset: function () { console.log("onReset"); },
  onError: function (error) { console.log("onError: ", error); },

  //一般開発ユーザからアクセス可能な関数の定義ここまで
  //--------------------------------------------------
}