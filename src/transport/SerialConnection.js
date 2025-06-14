import { EventEmitter } from 'events';
import { DEFAULT_TIMEOUT } from '../dynamixel/constants.js';
import { Protocol2 } from '../dynamixel/Protocol2.js';

// Try to import SerialPort, but handle gracefully if not available
let SerialPort, SerialPortList;
try {
  const serialportModule = await import('serialport');
  SerialPort = serialportModule.SerialPort;

  // Try to get list function (different export in different versions)
  if (serialportModule.list) {
    SerialPortList = serialportModule.list;
  } else if (serialportModule.SerialPort.list) {
    SerialPortList = serialportModule.SerialPort.list;
  } else {
    // Fallback - try dynamic import
    try {
      const { list } = await import('@serialport/bindings-cpp');
      SerialPortList = list;
    } catch (_listError) {
      console.warn('⚠️  Could not import SerialPort list function');
    }
  }
} catch (_error) {
  // SerialPort module not available
  SerialPort = null;
  SerialPortList = null;
}

/**
 * Node.js SerialPort Connection Handler
 * For use in Node.js environments and Electron main process
 */
export class SerialConnection extends EventEmitter {
  constructor(options = {}) {
    super();

    this.port = null;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.baudRate = options.baudRate || 57600;
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
      if (!SerialPort) {
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
      this.port = new SerialPort({
        path: targetPort,
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: false,
        autoOpen: false
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
    if (!SerialPortList) {
      console.log('ℹ️  Port listing not available, manual port specification required');
      return null;
    }

    try {
      console.log('🔍 Scanning for U2D2 device...');
      const ports = await SerialPortList();

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
    } catch (error) {
      console.error('❌ Error during disconnect:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Process received data buffer for complete packets
   */
  processReceiveBuffer() {
    while (this.receiveBuffer.length > 0) {
      const packetLength = Protocol2.getCompletePacketLength(this.receiveBuffer);

      if (packetLength === 0) {
        // No complete packet yet, wait for more data
        break;
      }

      // Extract complete packet
      const packetData = this.receiveBuffer.slice(0, packetLength);
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
   * Send data to serial port
   * @param {Buffer} data - Data to send
   * @returns {Promise<boolean>} - Success status
   */
  async send(data) {
    if (!this.isConnected || !this.port) {
      throw new Error('Serial port not connected');
    }

    return new Promise((resolve, reject) => {
      this.port.write(data, (error) => {
        if (error) {
          reject(new Error(`Failed to send data: ${error.message}`));
        } else {
          resolve(true);
        }
      });
    });
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
   * Discover all DYNAMIXEL devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<Array>} - Array of discovered devices
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
    console.log(`📡 Serial baud rate set to: ${baudRate}`);

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
   * List available serial ports
   * @returns {Promise<Array>} - Array of port information
   */
  static async listSerialPorts() {
    if (!SerialPortList) {
      console.log('ℹ️  SerialPort list function not available');
      return [];
    }

    try {
      const ports = await SerialPortList();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
        serialNumber: port.serialNumber,
        locationId: port.locationId,
        pnpId: port.pnpId
      }));
    } catch (error) {
      console.error('❌ Failed to list serial ports:', error.message);
      return [];
    }
  }

  /**
   * Check if SerialPort module is available
   * @returns {boolean} - Availability status
   */
  static isAvailable() {
    return SerialPort !== null;
  }

  /**
   * Get SerialPort module information
   * @returns {Object} - Module information
   */
  static getModuleInfo() {
    return {
      available: SerialPort !== null,
      listAvailable: SerialPortList !== null,
      hasSerialPort: typeof SerialPort === 'function',
      hasListFunction: typeof SerialPortList === 'function'
    };
  }
}
