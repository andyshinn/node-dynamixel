import { EventEmitter } from 'events';
import { DEFAULT_TIMEOUT } from '../dynamixel/constants.js';
import { Protocol2 } from '../dynamixel/Protocol2.js';

// CommonJS-style SerialPort module loading
let SerialPort = null;
let SerialPortList = null;

function initSerialPort() {
  if (SerialPort === null) {
    try {
      const serialportModule = require('serialport');
      SerialPort = serialportModule.SerialPort;

      if (serialportModule.list) {
        SerialPortList = serialportModule.list;
      } else if (serialportModule.SerialPort.list) {
        SerialPortList = serialportModule.SerialPort.list;
      } else {
        try {
          const { list } = require('@serialport/bindings-cpp');
          SerialPortList = list;
        } catch (_listError) {
          console.warn('⚠️  Could not import SerialPort list function');
        }
      }
    } catch (_error) {
      SerialPort = false;
      SerialPortList = false;
    }
  }
  return { SerialPort, SerialPortList };
}

function getSerialPort() {
  const { SerialPort } = initSerialPort();
  return SerialPort;
}

function getSerialPortList() {
  const { SerialPortList } = initSerialPort();
  return SerialPortList;
}

/**
 * Node.js SerialPort Connection Handler (CommonJS version)
 * For use in Node.js environments and Electron main process
 */
export class SerialConnection extends EventEmitter {
  constructor(options = {}) {
    super();

    this.port = null;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.baudRate = options.baudRate || 57600;
    this.highWaterMark = options.highWaterMark !== undefined ? options.highWaterMark : 65536; // Default 64KB
    this.isConnected = false;
    this.receiveBuffer = Buffer.alloc(0);
    this.portPath = options.portPath || null;
  }

  /**
   * Find and connect to U2D2 device via serial port
   * @param {string} portPath - Optional specific port path
   * @returns {Promise<boolean>} - Success status
   */
  async connect(portPath = null) {
    try {
      if (!getSerialPort()) {
        throw new Error('SerialPort module not available. Install with: npm install serialport');
      }

      console.log('🔍 Starting serial connection process...');

      // Use provided port path or try to find U2D2
      const targetPort = portPath || this.portPath || await this.findU2D2Port();

      if (!targetPort) {
        throw new Error('No U2D2 device found. Please specify port path or ensure device is connected.');
      }

      console.log(`📡 Connecting to serial port: ${targetPort}`);

      // Create SerialPort instance
      this.port = new (getSerialPort())({
        path: targetPort,
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: false,
        autoOpen: false,
        highWaterMark: this.highWaterMark
      });

      // Open the port
      await new Promise((resolve, reject) => {
        this.port.open((error) => {
          if (error) {
            reject(new Error(`Failed to open serial port: ${error.message}`));
          } else {
            resolve();
          }
        });
      });

      console.log('✅ Serial port opened successfully');

      // Set up data reception
      this.port.on('data', (data) => {
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
        this.processReceiveBuffer();
      });

      this.port.on('error', (error) => {
        console.error('❌ Serial port error:', error.message);
        this.emit('error', error);
      });

      this.port.on('close', () => {
        console.log('📡 Serial port closed');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.isConnected = true;
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('❌ Serial connection failed:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Find U2D2 device port automatically
   * @returns {Promise<string|null>} - Port path or null if not found
   */
  async findU2D2Port() {
    if (!getSerialPortList()) {
      console.log('ℹ️  Port listing not available, manual port specification required');
      return null;
    }

    try {
      console.log('🔍 Scanning for U2D2 device...');
      const ports = await getSerialPortList()();

      console.log(`📋 Found ${ports.length} serial ports:`);
      ports.forEach((port, index) => {
        console.log(`  ${index + 1}. ${port.path} - ${port.manufacturer || 'Unknown'} (VID: ${port.vendorId || 'N/A'}, PID: ${port.productId || 'N/A'})`);
      });

      // Look for FTDI devices (U2D2 uses FTDI chip)
      const ftdiPorts = ports.filter(port => {
        const vid = port.vendorId?.toLowerCase();
        const manufacturer = port.manufacturer?.toLowerCase();

        return vid === '0403' || // FTDI Vendor ID
               manufacturer?.includes('ftdi') ||
               manufacturer?.includes('future technology') ||
               port.serialNumber?.includes('u2d2');
      });

      if (ftdiPorts.length === 0) {
        console.log('❌ No FTDI/U2D2 devices found');
        return null;
      }

      if (ftdiPorts.length === 1) {
        const selectedPort = ftdiPorts[0];
        console.log(`✅ Found U2D2 device: ${selectedPort.path} (${selectedPort.manufacturer})`);
        return selectedPort.path;
      }

      // Multiple FTDI devices found - try to pick the best one
      console.log(`📋 Found ${ftdiPorts.length} FTDI devices:`);
      ftdiPorts.forEach((port, index) => {
        console.log(`  ${index + 1}. ${port.path} - ${port.manufacturer} (PID: ${port.productId})`);
      });

      // Prefer FT232H (U2D2's chip) with PID 6014
      const u2d2Port = ftdiPorts.find(port => port.productId?.toLowerCase() === '6014');
      if (u2d2Port) {
        console.log(`✅ Found U2D2 device: ${u2d2Port.path}`);
        return u2d2Port.path;
      }

      // Fallback to first FTDI device
      const fallbackPort = ftdiPorts[0];
      console.log(`⚠️  Using first FTDI device: ${fallbackPort.path}`);
      return fallbackPort.path;

    } catch (error) {
      console.error('❌ Error scanning ports:', error.message);
      return null;
    }
  }

  /**
   * Disconnect from serial port
   */
  async disconnect() {
    try {
      if (this.port && this.port.isOpen) {
        await new Promise((resolve) => {
          this.port.close(() => {
            resolve();
          });
        });
      }

      this.isConnected = false;
      this.emit('disconnected');
      console.log('✅ Serial port disconnected');
    } catch (error) {
      console.error('❌ Error during serial disconnect:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Process received data buffer
   */
  processReceiveBuffer() {
    while (this.receiveBuffer.length >= 10) {
      const packetLength = Protocol2.getCompletePacketLength(this.receiveBuffer);

      if (packetLength === 0) {
        // Invalid or incomplete packet, remove one byte and try again
        this.receiveBuffer = this.receiveBuffer.slice(1);
        continue;
      }

      if (this.receiveBuffer.length < packetLength) {
        // Not enough data for complete packet yet
        break;
      }

      const packet = this.receiveBuffer.slice(0, packetLength);
      this.receiveBuffer = this.receiveBuffer.slice(packetLength);

      this.emit('packet', packet);
    }
  }

  /**
   * Send data to the device
   * @param {Buffer|Array} data - Data to send
   */
  async send(data) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.port) {
        reject(new Error('Serial port not connected'));
        return;
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      this.port.write(buffer, (error) => {
        if (error) {
          reject(new Error(`Serial send error: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Send packet and wait for response
   * @param {Buffer} packet - Packet to send
   * @param {number} expectedId - Expected device ID in response
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Buffer>} - Response packet
   */
  async sendAndWaitForResponse(packet, expectedId = null, timeout = null) {
    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.timeout;

      const onPacket = (statusPacket) => {
        if (expectedId === null || statusPacket[4] === expectedId) {
          clearTimeout(timeoutId);
          this.removeListener('packet', onPacket);
          resolve(statusPacket);
        }
      };

      this.on('packet', onPacket);

      const timeoutId = setTimeout(() => {
        this.removeListener('packet', onPacket);
        reject(new Error(`Timeout waiting for response from device ${expectedId || 'any'}`));
      }, timeoutMs);

      this.send(packet).catch(reject);
    });
  }

  /**
   * Ping a device
   * @param {number} id - Device ID
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Ping response
   */
  async ping(id, timeout = null) {
    const packet = Protocol2.createPingPacket(id);
    const response = await this.sendAndWaitForResponse(packet, id, timeout);

    // First parse the raw buffer into a status packet
    const statusPacket = Protocol2.parseStatusPacket(response);
    if (!statusPacket) {
      throw new Error(`Invalid response from device ${id}`);
    }

    // Then extract ping response information
    return Protocol2.parsePingResponse(statusPacket);
  }

  /**
   * Discover devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<Array>} - Array of discovered devices
   */
  async discoverDevices(options = {}) {
    const { range = 'quick', timeout = 100, onProgress } = options;
    const devices = [];

    const startId = range === 'quick' ? 1 : 1;
    const endId = range === 'quick' ? 20 : 252;

    for (let id = startId; id <= endId; id++) {
      try {
        const response = await this.ping(id, timeout);
        devices.push({ id, ...response });

        if (onProgress) {
          onProgress({ id, found: true, total: endId - startId + 1, current: id - startId + 1 });
        }
      } catch (_error) {
        if (onProgress) {
          onProgress({ id, found: false, total: endId - startId + 1, current: id - startId + 1 });
        }
      }
    }

    return devices;
  }

  /**
   * Set baud rate
   * @param {number} baudRate - Baud rate
   */
  setBaudRate(baudRate) {
    this.baudRate = baudRate;
    if (this.port && this.port.isOpen) {
      this.port.update({ baudRate }, (error) => {
        if (error) {
          console.error('❌ Failed to update baud rate:', error.message);
        } else {
          console.log(`✅ Baud rate updated to ${baudRate}`);
        }
      });
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
   * @returns {Object} - Connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      type: 'serial',
      port: this.port ? this.port.path : null,
      baudRate: this.baudRate,
      highWaterMark: this.highWaterMark
    };
  }

  /**
   * List available serial ports
   * @returns {Promise<Array>} - Array of available ports
   */
  static async listSerialPorts() {
    if (!getSerialPortList()) {
      return [];
    }

    try {
      const ports = await getSerialPortList()();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
        serialNumber: port.serialNumber,
        isU2D2: port.vendorId?.toLowerCase() === '0403' && port.productId?.toLowerCase() === '6014'
      }));
    } catch (error) {
      console.error('❌ Error listing serial ports:', error.message);
      return [];
    }
  }

  /**
   * Check if SerialPort is available
   * @returns {boolean} - True if available
   */
  static isAvailable() {
    return getSerialPort() !== false;
  }

  /**
   * Get SerialPort module information
   * @returns {Object} - Module information
   */
  static getModuleInfo() {
    return {
      available: getSerialPort() !== false,
      listAvailable: getSerialPortList() !== false,
      version: getSerialPort() ? 'Available' : 'Not available'
    };
  }

  /**
   * Send packet and wait for group response from multiple devices
   * Used for GroupSyncRead operations
   * @param {Buffer} packet - Group sync read packet
   * @param {Array<number>} expectedIds - Array of expected device IDs
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Buffer>} - Combined response buffer
   */
  async sendAndWaitForGroupResponse(packet, expectedIds, timeout = null) {
    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.timeout;
      const receivedIds = new Set();
      let combinedBuffer = Buffer.alloc(0);

      const onPacket = (statusPacket) => {
        // Check if this packet is from one of our expected devices
        const packetId = statusPacket[4];
        if (expectedIds.includes(packetId)) {
          receivedIds.add(packetId);
          combinedBuffer = Buffer.concat([combinedBuffer, statusPacket]);
          
          // If we've received responses from all expected devices, resolve
          if (receivedIds.size === expectedIds.length) {
            clearTimeout(timeoutId);
            this.removeListener('packet', onPacket);
            resolve(combinedBuffer);
          }
        }
      };

      this.on('packet', onPacket);

      const timeoutId = setTimeout(() => {
        this.removeListener('packet', onPacket);
        const missing = expectedIds.filter(id => !receivedIds.has(id));
        reject(new Error(`Timeout waiting for group response. Missing responses from devices: ${missing.join(', ')}`));
      }, timeoutMs);

      this.send(packet).catch(reject);
    });
  }

  /**
   * Send packet without waiting for response
   * Used for GroupSyncWrite operations (which don't return responses)
   * @param {Buffer} packet - Packet to send
   * @returns {Promise<void>}
   */
  async sendPacket(packet) {
    await this.send(packet);
  }
}
