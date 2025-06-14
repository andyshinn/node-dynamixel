import { EventEmitter } from 'events';
import { U2D2Connection, SerialConnection, WebSerialConnection } from './transport/index.js';
import { DynamixelDevice, Protocol2 } from './dynamixel/index.js';

/**
 * Main DYNAMIXEL Controller
 * Manages connection and communication with DYNAMIXEL devices
 * Supports both USB and Serial connection methods
 */
export class DynamixelController extends EventEmitter {
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
    } catch (error) {
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
   * @param {number} id - DYNAMIXEL ID
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Device information
   */
  async ping(id, timeout = null) {
    if (!this.isConnected) {
      throw new Error('Controller not connected. Call connect() first.');
    }

    return await this.connection.ping(id, timeout);
  }

  /**
   * Discover all DYNAMIXEL devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<Array>} - Array of discovered devices
   */
  async discoverDevices(options = {}) {
    if (!this.isConnected) {
      throw new Error('Controller not connected. Call connect() first.');
    }

    const devices = await this.connection.discoverDevices(options);

    // Create DynamixelDevice instances for discovered devices
    this.devices.clear();
    for (const deviceInfo of devices) {
      const device = new DynamixelDevice(deviceInfo.id, this.connection, deviceInfo);
      this.devices.set(deviceInfo.id, device);
    }

    this.emit('discoveryComplete', devices);
    return devices;
  }

  /**
   * Get a specific DYNAMIXEL device by ID
   * @param {number} id - DYNAMIXEL ID
   * @returns {DynamixelDevice|null} - Device instance or null if not found
   */
  getDevice(id) {
    return this.devices.get(id) || null;
  }

  /**
   * Get all discovered devices
   * @returns {Array<DynamixelDevice>} - Array of device instances
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get device count
   * @returns {number} - Number of discovered devices
   */
  getDeviceCount() {
    return this.devices.size;
  }

  /**
   * Add a device manually (if you know its ID and info)
   * @param {number} id - DYNAMIXEL ID
   * @param {Object} deviceInfo - Device information
   * @returns {DynamixelDevice} - Created device instance
   */
  addDevice(id, deviceInfo = {}) {
    const device = new DynamixelDevice(id, this.connection, deviceInfo);
    this.devices.set(id, device);
    return device;
  }

  /**
   * Set the baud rate for communication
   * @param {number} baudRate - Baud rate (e.g., 57600, 115200, 1000000)
   */
  setBaudRate(baudRate) {
    if (this.connection && this.connection.setBaudRate) {
      this.connection.setBaudRate(baudRate);
    } else {
      throw new Error('Connection does not support baud rate setting');
    }
  }

  /**
   * Get the current baud rate
   * @returns {number} - Current baud rate
   */
  getBaudRate() {
    if (this.connection && this.connection.getBaudRate) {
      return this.connection.getBaudRate();
    }
    return null;
  }

  /**
   * Remove a device from the controller
   * @param {number} id - DYNAMIXEL ID
   * @returns {boolean} - Success status
   */
  removeDevice(id) {
    return this.devices.delete(id);
  }

  /**
   * Check if controller is connected
   * @returns {boolean} - Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get connection instance (for advanced usage)
   * @returns {U2D2Connection} - Connection instance
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Broadcast ping to all devices
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Array>} - Array of responses
   */
  async broadcastPing(timeout = 1000) {
    if (!this.isConnected) {
      throw new Error('Controller not connected. Call connect() first.');
    }

    // Note: Broadcast ping typically doesn't get responses due to collision
    // This method is provided for completeness but discovery is preferred
    const packet = Protocol2.createPingPacket(0xFE); // Broadcast ID
    await this.connection.send(packet);

    // Wait for any responses (may get multiple or none due to collision)
    return new Promise((resolve) => {
      const responses = [];
      const _timeoutHandle = setTimeout(() => {
        this.connection.removeListener('packet', onPacket);
        resolve(responses);
      }, timeout);

      const onPacket = (packet) => {
        const deviceInfo = Protocol2.parsePingResponse(packet);
        if (deviceInfo) {
          responses.push(deviceInfo);
        }
      };

      this.connection.on('packet', onPacket);
    });
  }

  /**
   * Quick device discovery with progress reporting
   * @param {Function} onProgress - Progress callback (current, total, id)
   * @returns {Promise<Array>} - Array of discovered devices
   */
  async quickDiscovery(onProgress = null) {
    return await this.discoverDevices({
      startId: 1,
      endId: 20, // Quick scan of first 20 IDs
      timeout: 50,
      onProgress
    });
  }

  /**
   * Full device discovery (all possible IDs)
   * @param {Function} onProgress - Progress callback (current, total, id)
   * @returns {Promise<Array>} - Array of discovered devices
   */
  async fullDiscovery(onProgress = null) {
    return await this.discoverDevices({
      startId: 1,
      endId: 252,
      timeout: 100,
      onProgress
    });
  }

  /**
   * Get device model name from model number
   * @param {number} modelNumber - Model number from device
   * @returns {string} - Model name or 'Unknown'
   */
  static getModelName(modelNumber) {
    // Common DYNAMIXEL model numbers
    const models = {
      12: 'AX-12A',
      18: 'AX-18A',
      24: 'RX-24F',
      28: 'RX-28',
      29: 'MX-28',
      30: 'MX-28(2.0)',
      54: 'MX-64',
      55: 'MX-64(2.0)',
      64: 'MX-106',
      65: 'MX-106(2.0)',
      107: 'EX-106+',
      113: 'DX-113',
      116: 'DX-116',
      117: 'DX-117',
      300: 'AX-12W',
      320: 'XL-320',
      1020: 'XL430-W250',
      1060: 'XL330-M077',
      1190: 'XL330-M288',
      1200: 'XC430-W150',
      1210: 'XC430-W240',
      1230: 'XC430-T150BB',
      1240: 'XC430-T240BB',
      1270: 'XC330-T181',
      1280: 'XC330-T288',
      1290: 'XC330-M181',
      1300: 'XC330-M288',
      1130: 'XM430-W210',
      1140: 'XM430-W350',
      1150: 'XM540-W150',
      1170: 'XM540-W270',
      1050: 'XH430-W210',
      1070: 'XH430-W350',
      1090: 'XH430-V210',
      1100: 'XH430-V350',
      1110: 'XH540-W150',
      1120: 'XH540-W270',
      1010: 'XH540-V150',
      1160: 'XH540-V270'
    };

    return models[modelNumber] || `Unknown (${modelNumber})`;
  }

  /**
   * List available USB devices (for debugging)
   * @returns {Array} - Array of USB device information
   */
  static listUSBDevices() {
    return U2D2Connection.listUSBDevices();
  }

  /**
   * Get system information and troubleshooting recommendations
   * @returns {Object} - System information and recommendations
   */
  static getSystemInfo() {
    return U2D2Connection.getSystemInfo();
  }

  /**
   * Perform comprehensive USB diagnostics
   * @returns {Object} - Diagnostic results
   */
  static performUSBDiagnostics() {
    return U2D2Connection.performUSBDiagnostics();
  }
}
