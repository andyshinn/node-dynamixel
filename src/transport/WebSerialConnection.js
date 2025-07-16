import { EventEmitter } from 'events';
import { DEFAULT_TIMEOUT } from '../dynamixel/constants.js';
import { Protocol2 } from '../dynamixel/Protocol2.js';

/**
 * Web Serial API Connection Handler
 * For use in Electron renderer processes and modern browsers
 */
export class WebSerialConnection extends EventEmitter {
  constructor(options = {}) {
    super();

    this.port = null;
    this.reader = null;
    this.writer = null;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.baudRate = options.baudRate || 57600;
    this.isConnected = false;
    this.receiveBuffer = new Uint8Array(0);
    this.readPromise = null;

    // Check if Web Serial API is available
    if (typeof navigator === 'undefined' || !navigator.serial) {
      throw new Error('Web Serial API not available. This requires Chrome/Chromium-based browsers or Electron with Web Serial support.');
    }
  }

  /**
   * Request and connect to a serial port using Web Serial API
   * @param {Object} filters - Optional filters for port selection
   * @returns {Promise<boolean>} - Success status
   */
  async connect(filters = null) {
    try {
      console.log('🔍 Requesting serial port access...');

      // Default filters for U2D2 device (FTDI-based)
      const defaultFilters = [
        { usbVendorId: 0x0403, usbProductId: 0x6014 }, // FTDI FT232H (U2D2)
        { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI FT232R
        { usbVendorId: 0x0403 } // Any FTDI device
      ];

      const requestFilters = filters || defaultFilters;

      // Request port with user interaction
      this.port = await navigator.serial.requestPort({
        filters: requestFilters
      });

      if (!this.port) {
        throw new Error('No serial port selected');
      }

      console.log('✅ Serial port selected');

      // Get port info for debugging
      const portInfo = this.port.getInfo();
      console.log('📊 Port Info:', portInfo);

      // Open the port
      console.log(`🔌 Opening serial port at ${this.baudRate} baud...`);
      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      console.log('✅ Serial port opened successfully');

      // Get reader and writer
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      // Start reading data
      this.startReceiving();

      this.isConnected = true;
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('❌ Web Serial connection failed:', error.message);

      if (error.name === 'NotFoundError') {
        throw new Error('No compatible serial device found or user cancelled selection');
      } else if (error.name === 'SecurityError') {
        throw new Error('Serial port access denied. Enable Web Serial API in browser settings');
      } else if (error.name === 'NetworkError') {
        throw new Error('Serial port is already open in another tab or application');
      }

      this.emit('error', error);
      return false;
    }
  }

  /**
   * Connect to a previously authorized port (if available)
   * @returns {Promise<boolean>} - Success status
   */
  async connectToPreviousPort() {
    try {
      console.log('🔍 Looking for previously authorized ports...');

      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) {
        throw new Error('No previously authorized ports found');
      }

      console.log(`📋 Found ${ports.length} previously authorized port(s)`);

      // Use the first available port
      this.port = ports[0];
      const portInfo = this.port.getInfo();
      console.log('📊 Using port:', portInfo);

      // Open the port
      await this.port.open({
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      // Get reader and writer
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      // Start reading data
      this.startReceiving();

      this.isConnected = true;
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to previous port:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Disconnect from the serial port
   */
  async disconnect() {
    try {
      this.isConnected = false;

      // Stop reading
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      // Release writer
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      // Close port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.emit('disconnected');
    } catch (error) {
      console.error('❌ Error during disconnect:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Start receiving data from the serial port
   */
  async startReceiving() {
    if (!this.reader) return;

    try {
      this.readPromise = this.readLoop();
      await this.readPromise;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error in receive loop:', error.message);
        this.emit('error', error);
      }
    }
  }

  /**
   * Main read loop for processing incoming data
   */
  async readLoop() {
    while (this.isConnected && this.reader) {
      try {
        const { value, done } = await this.reader.read();

        if (done) {
          console.log('📡 Serial port reading completed');
          break;
        }

        if (value) {
          // Concatenate new data with existing buffer
          const newBuffer = new Uint8Array(this.receiveBuffer.length + value.length);
          newBuffer.set(this.receiveBuffer);
          newBuffer.set(value, this.receiveBuffer.length);
          this.receiveBuffer = newBuffer;

          this.processReceiveBuffer();
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('📡 Serial reading cancelled');
          break;
        }
        throw error;
      }
    }
  }

  /**
   * Process received data buffer for complete packets
   */
  processReceiveBuffer() {
    while (this.receiveBuffer.length > 0) {
      // Convert to Buffer for Protocol2 compatibility
      const bufferForCheck = Buffer.from(this.receiveBuffer);
      const packetLength = Protocol2.getCompletePacketLength(bufferForCheck);

      if (packetLength === 0) {
        // No complete packet yet, wait for more data
        break;
      }

      // Extract complete packet
      const packetData = Buffer.from(this.receiveBuffer.slice(0, packetLength));
      this.receiveBuffer = this.receiveBuffer.slice(packetLength);

      // Parse and emit packet
      try {
        const packet = Protocol2.parseStatusPacket(packetData);
        if (packet) {
          this.emit('packet', packet);
        }
      } catch (error) {
        console.error('❌ Packet parsing error:', error.message);
        this.emit('error', error);
      }
    }
  }

  /**
   * Send data to the serial port
   * @param {Buffer|Uint8Array} data - Data to send
   * @returns {Promise<boolean>} - Success status
   */
  async send(data) {
    if (!this.isConnected || !this.writer) {
      throw new Error('Serial port not connected');
    }

    try {
      // Convert Buffer to Uint8Array if needed
      const dataToSend = data instanceof Buffer ? new Uint8Array(data) : data;
      await this.writer.write(dataToSend);
      return true;
    } catch (error) {
      throw new Error(`Failed to send data: ${error.message}`);
    }
  }

  /**
   * Send instruction packet and wait for response
   * @param {Buffer} packet - Instruction packet to send
   * @param {number} expectedId - Expected response ID (null for any)
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Parsed status packet
   */
  async sendAndWaitForResponse(packet, expectedId = null, timeout = null) {
    const actualTimeout = timeout || this.timeout;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removeAllListeners('packet');
        reject(new Error(`Timeout waiting for response from ID ${expectedId}`));
      }, actualTimeout);

      const onPacket = (statusPacket) => {
        if (expectedId === null || statusPacket.id === expectedId) {
          clearTimeout(timeoutHandle);
          this.removeListener('packet', onPacket);
          resolve(statusPacket);
        }
      };

      this.on('packet', onPacket);

      this.send(packet).catch((error) => {
        clearTimeout(timeoutHandle);
        this.removeListener('packet', onPacket);
        reject(error);
      });
    });
  }

  /**
   * Ping a specific DYNAMIXEL device
   * @param {number} id - DYNAMIXEL ID
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Device information
   */
  async ping(id, timeout = null) {
    const packet = Protocol2.createPingPacket(id);
    const response = await this.sendAndWaitForResponse(packet, id, timeout);
    const deviceInfo = Protocol2.parsePingResponse(response);

    if (!deviceInfo) {
      throw new Error(`Invalid ping response from ID ${id}`);
    }

    return deviceInfo;
  }

  /**
   * @typedef {Object} DeviceInfo
   * @property {number} id - Device ID
   * @property {number} modelNumber - Device model number
   * @property {string} modelName - Device model name
   * @property {number} firmwareVersion - Firmware version
   */

  /**
   * @typedef {Object} WebSerialPortInfo
   * @property {number} [usbVendorId] - USB vendor ID
   * @property {number} [usbProductId] - USB product ID
   */

  /**
   * Discover all DYNAMIXEL devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<DeviceInfo[]>} - Array of discovered devices
   */
  async discoverDevices(options = {}) {
    const {
      startId = 1,
      endId = 252,
      timeout = 100,
      onProgress = null
    } = options;

    const devices = [];
    const total = endId - startId + 1;
    let current = 0;

    for (let id = startId; id <= endId; id++) {
      try {
        const deviceInfo = await this.ping(id, timeout);
        devices.push(deviceInfo);
        this.emit('deviceFound', deviceInfo);
      } catch (_error) {
        // Device not found at this ID, continue scanning
      }

      current++;
      if (onProgress) {
        onProgress(current, total, id);
      }
    }

    return devices;
  }

  /**
   * Set baud rate for serial communication
   * @param {number} baudRate - New baud rate
   */
  setBaudRate(baudRate) {
    this.baudRate = baudRate;
    console.log(`📡 Web Serial baud rate set to: ${baudRate}`);

    // Note: Changing baud rate on an open port requires reconnection
    if (this.isConnected) {
      console.log('ℹ️  Baud rate change requires reconnection to take effect');
    }
  }

  /**
   * Get current baud rate
   * @returns {number} - Current baud rate
   */
  getBaudRate() {
    return this.baudRate;
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get available serial ports (previously authorized)
   * @returns {Promise<WebSerialPortInfo[]>} - Array of port info objects
   */
  static async getAvailablePorts() {
    if (typeof navigator === 'undefined' || !navigator.serial) {
      throw new Error('Web Serial API not available');
    }

    try {
      const ports = await navigator.serial.getPorts();
      return ports.map(port => port.getInfo());
    } catch (error) {
      console.error('❌ Failed to get available ports:', error.message);
      return [];
    }
  }

  /**
   * Check if Web Serial API is supported
   * @returns {boolean} - Support status
   */
  static isSupported() {
    return typeof navigator !== 'undefined' &&
           'serial' in navigator &&
           typeof navigator.serial.requestPort === 'function';
  }

  /**
   * Get Web Serial API feature detection info
   * @returns {Object} - Feature support information
   */
  static getFeatureSupport() {
    const hasNavigator = typeof navigator !== 'undefined';
    const hasSerial = hasNavigator && 'serial' in navigator;
    const hasRequestPort = hasSerial && typeof navigator.serial.requestPort === 'function';
    const hasGetPorts = hasSerial && typeof navigator.serial.getPorts === 'function';

    return {
      hasNavigator,
      hasSerial,
      hasRequestPort,
      hasGetPorts,
      isSupported: hasRequestPort && hasGetPorts,
      userAgent: hasNavigator ? navigator.userAgent : 'Not available'
    };
  }
}
