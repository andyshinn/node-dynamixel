const { EventEmitter } = require('events');
const { U2D2Connection, SerialConnection, WebSerialConnection } = require('./transport/index.cjs.js');
const { DynamixelDevice, Protocol2 } = require('./dynamixel/index.cjs.js');

/**
 * Main DYNAMIXEL Controller
 * Manages connection and communication with DYNAMIXEL devices
 * Supports both USB and Serial connection methods
 */
class DynamixelController extends EventEmitter {
  constructor(options = {}) {
    super();

    // Choose connection type: 'usb', 'serial', 'webserial', or 'auto'
    this.connectionType = options.connectionType || 'auto';
    this.connection = null;
    this.devices = new Map(); // Map of ID -> DynamixelDevice
    this.isConnected = false;

    this.createConnection(options);
  }

  /**
   * Create the appropriate connection based on type
   * @param {Object} options - Connection options
   */
  createConnection(options) {
    if (this.connectionType === 'serial') {
      this.connection = new SerialConnection(options);
    } else if (this.connectionType === 'usb') {
      this.connection = new U2D2Connection(options);
    } else if (this.connectionType === 'webserial') {
      this.connection = new WebSerialConnection(options);
    } else {
      // Auto-detect based on environment
      this.connection = this.detectBestConnection(options);
    }

    this.setupConnectionEvents();
  }

  /**
   * Detect the best connection type for the current environment
   * @param {Object} options - Connection options
   * @returns {Object} - Connection instance
   */
  detectBestConnection(options) {
    // Check if we're in a browser environment with Web Serial API
    if (WebSerialConnection.isSupported()) {
      console.log('🌐 Web Serial API detected - using WebSerialConnection');
      return new WebSerialConnection(options);
    }

    // Check if we're in Node.js with serialport available
    if (SerialConnection.isAvailable()) {
      console.log('🖥️  Node.js SerialPort detected - using SerialConnection');
      return new SerialConnection(options);
    }

    // Fallback to USB if available
    try {
      console.log('🔌 Attempting USB connection as fallback');
      return new U2D2Connection(options);
    } catch (_error) {
      console.log('❌ USB connection not available');
      // Return serial as ultimate fallback
      return new SerialConnection(options);
    }
  }

  /**
   * Set up connection event forwarding
   */
  setupConnectionEvents() {
    // Forward connection events
    this.connection.on('connected', () => {
      this.isConnected = true;
      this.emit('connected');
    });

    this.connection.on('disconnected', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.connection.on('error', (error) => {
      this.emit('error', error);
    });

    this.connection.on('deviceFound', (deviceInfo) => {
      this.emit('deviceFound', deviceInfo);
    });
  }

  /**
   * Connect to a specific device
   * @param {Object} deviceInfo - Device information from discovery
   * @param {Object} options - Connection options
   * @returns {Promise<boolean>} - Connection success
   */
  async connectToDevice(deviceInfo, options = {}) {
    try {
      // If connection wasn't created yet (deferred), create it now
      if (!this.connection) {
        // Set connection type based on device info or options
        if (deviceInfo.type === 'usb') {
          this.connectionType = 'usb';
        } else if (deviceInfo.type === 'serial') {
          this.connectionType = 'serial';
        } else if (deviceInfo.type === 'webserial') {
          this.connectionType = 'webserial';
        }

        this.createConnection({ ...options, ...deviceInfo });
      }

      // Connect to the specific device
      const success = await this.connection.connect(deviceInfo.path || deviceInfo.portPath);
      return success;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Connect to U2D2 device with auto-fallback
   * @param {string} portPath - Optional specific port path for serial connection
   * @returns {Promise<boolean>} - Connection success
   */
  async connect(portPath = null) {
    try {
      if (this.connectionType === 'auto') {
        console.log('🔄 Auto-detecting best connection method...');

        // Get the current connection type that was auto-detected
        const detectedType = this.getDetectedConnectionType();
        console.log(`🔍 Detected connection type: ${detectedType}`);

        if (detectedType === 'webserial') {
          console.log('🌐 Using Web Serial API...');
          const success = await this.connection.connect(portPath);
          if (success) {
            this.connectionType = 'webserial';
            return true;
          }
          throw new Error('Web Serial connection failed');

        } else if (detectedType === 'serial') {
          console.log('1️⃣ Trying Node.js serial connection...');
          const serialSuccess = await this.connection.connect(portPath);

          if (serialSuccess) {
            console.log('✅ Serial connection successful!');
            this.connectionType = 'serial';
            return true;
          }

          // Fallback to USB connection (if available)
          console.log('2️⃣ Serial failed, trying USB connection...');
          try {
            this.connection = new U2D2Connection({
              timeout: this.connection.timeout,
              debug: this.connection.debug
            });
            this.setupConnectionEvents();

            const usbSuccess = await this.connection.connect();
            if (usbSuccess) {
              console.log('✅ USB connection successful!');
              this.connectionType = 'usb';
              return true;
            }
          } catch (usbError) {
            if (usbError.code === 'MODULE_NOT_FOUND' || usbError.message.includes('usb')) {
              console.log('ℹ️  USB package not available (install with: npm install usb)');
            } else {
              console.log('❌ USB connection failed:', usbError.message);
            }
          }

          throw new Error('Serial connection failed and USB not available');

        } else {
          // USB or fallback
          const success = await this.connection.connect(portPath);
          if (success) {
            this.connectionType = 'usb';
            return true;
          }
          throw new Error('USB connection failed');
        }
      } else {
        // Use specified connection type
        const success = await this.connection.connect(portPath);
        if (success) {
          this.emit('connected');
        }
        return success;
      }
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get the detected connection type from the current connection
   * @returns {string} - Connection type
   */
  getDetectedConnectionType() {
    if (this.connection instanceof WebSerialConnection) {
      return 'webserial';
    } else if (this.connection instanceof SerialConnection) {
      return 'serial';
    } else if (this.connection instanceof U2D2Connection) {
      return 'usb';
    }
    return 'unknown';
  }

  /**
   * Disconnect from U2D2 device
   */
  async disconnect() {
    await this.connection.disconnect();
    this.devices.clear();
  }

  /**
   * Ping a specific DYNAMIXEL device
   * @param {number} id - Device ID (1-253)
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Ping response with device info
   */
  async ping(id, timeout = null) {
    if (!this.connection) {
      throw new Error('No connection available');
    }

    return await this.connection.ping(id, timeout);
  }

  /**
   * Discover DYNAMIXEL devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<Array>} - Array of discovered devices
   */
  async discoverDevices(options = {}) {
    const devices = await this.connection.discoverDevices(options);

    // Add discovered devices to our device map
    devices.forEach(device => {
      this.addDevice(device.id, device);
    });

    return devices;
  }

  /**
   * Get a device by ID
   * @param {number} id - Device ID
   * @returns {DynamixelDevice|null} - Device instance or null
   */
  getDevice(id) {
    return this.devices.get(id) || null;
  }

  /**
   * Get all managed devices
   * @returns {Array} - Array of device instances
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get number of managed devices
   * @returns {number} - Device count
   */
  getDeviceCount() {
    return this.devices.size;
  }

  /**
   * Add a device to management
   * @param {number} id - Device ID
   * @param {Object} deviceInfo - Device information
   * @returns {DynamixelDevice} - Device instance
   */
  addDevice(id, deviceInfo = {}) {
    const device = new DynamixelDevice(id, this.connection, deviceInfo);
    this.devices.set(id, device);
    return device;
  }

  /**
   * Set baud rate for connection
   * @param {number} baudRate - New baud rate
   */
  setBaudRate(baudRate) {
    if (this.connection && this.connection.setBaudRate) {
      this.connection.setBaudRate(baudRate);
    }
  }

  /**
   * Get current baud rate
   * @returns {number} - Current baud rate
   */
  getBaudRate() {
    if (this.connection && this.connection.getBaudRate) {
      return this.connection.getBaudRate();
    }
    return null;
  }

  /**
   * Remove a device from management
   * @param {number} id - Device ID
   * @returns {boolean} - Success
   */
  removeDevice(id) {
    return this.devices.delete(id);
  }

  /**
   * Get connection status information
   * @returns {Object} - Status information
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      deviceCount: this.devices.size,
      connection: this.connection ? this.connection.getConnectionStatus() : null
    };
  }

  /**
   * Get the underlying connection instance
   * @returns {Object} - Connection instance
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Broadcast ping to find all devices quickly
   * @param {number} timeout - Timeout for responses
   * @returns {Promise<Array>} - Array of responding devices
   */
  async broadcastPing(timeout = 1000) {
    return new Promise((resolve) => {
      const foundDevices = [];

      // Listen for responses
      const onPacket = (packet) => {
        try {
          if (packet[0] === 0xFF && packet[1] === 0xFF && packet[2] === 0xFD) {
            const response = Protocol2.parsePingResponse(packet);
            if (response && !foundDevices.find(d => d.id === response.id)) {
              foundDevices.push(response);
            }
          }
        } catch (_error) {
          // Ignore invalid packets
        }
      };

      this.connection.on('packet', onPacket);

      // Send broadcast ping (ID 254)
      const broadcastPacket = Protocol2.createPingPacket(254);
      this.connection.send(broadcastPacket);

      // Stop listening after timeout
      setTimeout(() => {
        this.connection.removeListener('packet', onPacket);
        resolve(foundDevices);
      }, timeout);
    });
  }

  /**
   * Quick device discovery (IDs 1-20)
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} - Discovered devices
   */
  async quickDiscovery(onProgress = null) {
    return await this.discoverDevices({
      range: 'quick',
      timeout: 100,
      onProgress
    });
  }

  /**
   * Full device discovery (IDs 1-252)
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} - Discovered devices
   */
  async fullDiscovery(onProgress = null) {
    return await this.discoverDevices({
      range: 'full',
      timeout: 100,
      onProgress
    });
  }

  /**
   * @typedef {Object} CommunicationDevices
   * @property {Array<Object>} serial - Array of serial devices
   * @property {Array<Object>} usb - Array of USB devices
   * @property {boolean} webserial - Whether Web Serial API is available
   */

  /**
   * Discover available communication devices (Serial and USB)
   * @returns {Promise<CommunicationDevices>} - Object containing serial and USB devices
   */
  static async discoverCommunicationDevices() {
    const result = {
      serial: [],
      usb: [],
      webserial: WebSerialConnection.isSupported()
    };

    try {
      // Discover Serial devices first (priority)
      result.serial = await SerialConnection.listSerialPorts();
      result.serial = result.serial.map(port => ({
        ...port,
        type: 'serial',
        name: `${port.path} - ${port.manufacturer || 'Unknown'}`,
        path: port.path
      }));
    } catch (error) {
      console.warn('❌ Failed to discover serial devices:', error.message);
    }

    try {
      // Discover USB devices
      result.usb = U2D2Connection.listUSBDevices().map(device => ({
        ...device,
        type: 'usb',
        name: `USB Device (VID: 0x${device.vendorId.toString(16).padStart(4, '0')}, PID: 0x${device.productId.toString(16).padStart(4, '0')})`,
        isU2D2: device.vendorId === 0x0403 && device.productId === 0x6014
      }));
    } catch (error) {
      console.warn('❌ Failed to discover USB devices:', error.message);
    }

    return result;
  }

  /**
   * Discover U2D2 devices specifically
   * @returns {Promise<Array>} - Array of U2D2-compatible devices
   */
  static async discoverU2D2Devices() {
    const devices = await this.discoverCommunicationDevices();
    const u2d2Devices = [];

    // Add potential U2D2 serial devices first (priority)
    devices.serial.filter(port => port.isU2D2).forEach(port => {
      u2d2Devices.push({
        ...port,
        name: `U2D2 Serial Port (${port.path})`,
        recommended: true
      });
    });

    // Add U2D2 USB devices
    devices.usb.filter(device => device.isU2D2).forEach(device => {
      u2d2Devices.push({
        ...device,
        name: `U2D2 USB Device`,
        recommended: true
      });
    });

    return u2d2Devices;
  }

  /**
   * List available serial ports
   * @returns {Promise<Array>} - Array of serial port information
   */
  static async listSerialPorts() {
    return SerialConnection.listSerialPorts();
  }

  /**
   * Get model name from model number
   * @param {number} modelNumber - Model number
   * @returns {string} - Model name
   */
  static getModelName(modelNumber) {
    const models = {
      1020: 'XL320',
      1060: 'XL430-W250',
      1070: 'XL430-W250 (2.0)',
      1080: 'XM430-W210',
      1090: 'XM430-W350',
      1120: 'XM540-W150',
      1130: 'XM540-W270',
      1190: 'XH430-W210',
      1200: 'XH430-W350',
      1210: 'XH430-V210',
      1220: 'XH430-V350',
      1230: 'XH540-W150',
      1240: 'XH540-W270',
      1250: 'XH540-V150',
      1260: 'XH540-V270',
      35071: 'PRO L42-10-S300-R',
      35072: 'PRO L54-30-S500-R',
      35073: 'PRO L54-30-S400-R',
      35074: 'PRO L54-50-S500-R',
      35075: 'PRO L54-50-S290-R',
      37928: 'PRO+ H42-20-S300-R',
      37929: 'PRO+ H54-100-S500-R',
      37930: 'PRO+ H54-200-S500-R',
      37931: 'PRO+ M42-10-S260-R',
      37932: 'PRO+ M54-40-S250-R',
      37933: 'PRO+ M54-60-S250-R',
      42350: 'PH42-020-S300-R',
      42351: 'PH54-100-S500-R',
      42352: 'PH54-200-S500-R'
    };

    return models[modelNumber] || `Unknown Model (${modelNumber})`;
  }

  /**
   * List USB devices (static method)
   * @returns {Array} - USB device list
   */
  static listUSBDevices() {
    return U2D2Connection.listUSBDevices();
  }

  /**
   * Get system information (static method)
   * @returns {Object} - System information
   */
  static getSystemInfo() {
    return U2D2Connection.getSystemInfo();
  }

  /**
   * Perform USB diagnostics (static method)
   * @returns {Object} - Diagnostic results
   */
  static performUSBDiagnostics() {
    return U2D2Connection.performUSBDiagnostics();
  }
}

module.exports = { DynamixelController };
