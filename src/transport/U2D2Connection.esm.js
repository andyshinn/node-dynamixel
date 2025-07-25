import { EventEmitter } from 'events';
import { U2D2_DEVICE, DEFAULT_TIMEOUT } from '../dynamixel/constants.js';
import { Protocol2 } from '../dynamixel/Protocol2.js';

// Dynamic import for USB module
let usb;
try {
  const usbModule = await import('usb');
  usb = usbModule.usb;
} catch (_error) {
  // USB module not available
  usb = null;
}

/**
 * U2D2 USB to TTL connection handler (ES Module version)
 * Manages USB communication with DYNAMIXEL devices through U2D2
 */
export class U2D2Connection extends EventEmitter {
  constructor(options = {}) {
    super();

    this.device = null;
    this.interface = null;
    this.endpoint = null;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.isConnected = false;
    this.receiveBuffer = Buffer.alloc(0);

    // Enable debug mode
    if (options.debug && usb) {
      usb.setDebugLevel(4);
    }
  }

  /**
   * Find and connect to U2D2 device
   * @returns {Promise<boolean>} - Success status
   */
  async connect() {
    try {
      if (!usb) {
        throw new Error('USB module not available. Install with: npm install usb');
      }

      console.log('🔍 Starting U2D2 connection process...');

      // Find U2D2 device
      const devices = usb.getDeviceList();
      console.log(`📋 Scanning ${devices.length} USB devices for U2D2...`);

      this.device = devices.find(device =>
        device.deviceDescriptor.idVendor === U2D2_DEVICE.VENDOR_ID &&
        device.deviceDescriptor.idProduct === U2D2_DEVICE.PRODUCT_ID
      );

      if (!this.device) {
        throw new Error('U2D2 device not found. Please check connection.');
      }

      console.log(`✅ Found U2D2 device (VID: 0x${this.device.deviceDescriptor.idVendor.toString(16).padStart(4, '0')}, PID: 0x${this.device.deviceDescriptor.idProduct.toString(16).padStart(4, '0')})`);

      // Try to get device info for debugging
      try {
        const deviceInfo = {
          busNumber: this.device.busNumber,
          deviceAddress: this.device.deviceAddress,
          portNumbers: this.device.portNumbers,
          deviceDescriptor: {
            bcdDevice: this.device.deviceDescriptor.bcdDevice,
            bDeviceClass: this.device.deviceDescriptor.bDeviceClass,
            bDeviceSubClass: this.device.deviceDescriptor.bDeviceSubClass,
            bDeviceProtocol: this.device.deviceDescriptor.bDeviceProtocol,
            bMaxPacketSize0: this.device.deviceDescriptor.bMaxPacketSize0,
            bNumConfigurations: this.device.deviceDescriptor.bNumConfigurations
          }
        };
        console.log('📊 Device Info:', JSON.stringify(deviceInfo, null, 2));
      } catch (infoError) {
        console.log('⚠️  Could not get detailed device info:', infoError.message);
      }

      // Open device
      console.log('🔐 Opening USB device...');
      try {
        this.device.open();
        console.log('✅ USB device opened successfully');
      } catch (openError) {
        console.error('❌ Failed to open USB device:', openError.message);

        // Provide specific error messages for common issues
        if (openError.message.includes('LIBUSB_ERROR_ACCESS')) {
          throw new Error(`USB Access Error: Permission denied. This usually means:
  - On macOS: You may need to run with sudo, or add your user to the 'wheel' group
  - The device might be in use by another application
  - System security settings may be blocking access
  - Try running: sudo node examples/device-discovery.js
  - Or check if any other software is using the U2D2 device`);
        } else if (openError.message.includes('LIBUSB_ERROR_BUSY')) {
          throw new Error('USB Busy Error: The U2D2 device is already in use by another application. Please close any other software using the device.');
        } else if (openError.message.includes('LIBUSB_ERROR_NO_DEVICE')) {
          throw new Error('USB No Device Error: The U2D2 device was disconnected during connection attempt.');
        } else {
          throw new Error(`USB Error: ${openError.message}`);
        }
      }

      // Get interface
      console.log(`🔌 Getting USB interface ${U2D2_DEVICE.INTERFACE}...`);
      try {
        this.interface = this.device.interface(U2D2_DEVICE.INTERFACE);
        console.log('✅ USB interface obtained');
      } catch (interfaceError) {
        throw new Error(`Failed to get USB interface: ${interfaceError.message}`);
      }

      // Check if kernel driver is active and handle it
      console.log('🔍 Checking kernel driver status...');
      try {
        const isKernelDriverActive = this.interface.isKernelDriverActive();
        console.log(`📋 Kernel driver active: ${isKernelDriverActive}`);

        if (isKernelDriverActive) {
          console.log('🔧 Detaching kernel driver...');
          this.interface.detachKernelDriver();
          console.log('✅ Kernel driver detached');
        }

        console.log('🔒 Claiming USB interface...');
        this.interface.claim();
        console.log('✅ USB interface claimed');

      } catch (claimError) {
        console.error('❌ Failed to claim interface:', claimError.message);

        if (claimError.message.includes('LIBUSB_ERROR_BUSY')) {
          throw new Error('Interface Busy Error: The USB interface is already claimed by another process. Please close any other software using the U2D2.');
        } else if (claimError.message.includes('LIBUSB_ERROR_ACCESS')) {
          throw new Error('Interface Access Error: Permission denied when claiming interface. Try running with sudo.');
        } else {
          throw new Error(`Failed to claim USB interface: ${claimError.message}`);
        }
      }

      // Find bulk endpoints
      console.log('🔍 Looking for USB endpoints...');
      const endpoints = this.interface.endpoints;
      console.log(`📋 Found ${endpoints.length} endpoints`);

      endpoints.forEach((ep, index) => {
        console.log(`  Endpoint ${index}: direction=${ep.direction}, type=${ep.transferType}, address=0x${ep.address.toString(16)}`);
      });

      // Find bulk endpoints - handle both string 'bulk' and numeric 2 (USB_ENDPOINT_XFER_BULK)
      this.inEndpoint = endpoints.find(ep =>
        ep.direction === 'in' && (ep.transferType === 'bulk' || ep.transferType === 2)
      );
      this.outEndpoint = endpoints.find(ep =>
        ep.direction === 'out' && (ep.transferType === 'bulk' || ep.transferType === 2)
      );

      if (!this.inEndpoint || !this.outEndpoint) {
        console.log('❌ Endpoint detection details:');
        endpoints.forEach((ep, index) => {
          console.log(`   Endpoint ${index}: direction=${ep.direction}, transferType=${ep.transferType} (${typeof ep.transferType}), address=0x${ep.address.toString(16)}`);
        });
        throw new Error('Could not find bulk endpoints on U2D2 device');
      }

      console.log(`✅ Found bulk endpoints - IN: 0x${this.inEndpoint.address.toString(16)}, OUT: 0x${this.outEndpoint.address.toString(16)}`);

      // Start listening for incoming data
      console.log('📡 Starting data reception...');
      this.startReceiving();
      console.log('✅ Data reception started');

      this.isConnected = true;
      this.emit('connected');
      console.log('🎉 U2D2 connection established successfully!');

      return true;
    } catch (error) {
      console.error('💥 U2D2 connection failed:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Disconnect from U2D2 device
   */
  async disconnect() {
    try {
      if (this.inEndpoint) {
        this.inEndpoint.stopPoll();
      }

      if (this.interface) {
        this.interface.release(() => {
          if (this.device) {
            this.device.close();
          }
        });
      }

      this.isConnected = false;
      this.emit('disconnected');
      console.log('✅ U2D2 disconnected successfully');
    } catch (error) {
      console.error('❌ Error during U2D2 disconnect:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Start receiving data from the device
   */
  startReceiving() {
    if (!this.inEndpoint) return;

    this.inEndpoint.on('data', (data) => {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
      this.processReceiveBuffer();
    });

    this.inEndpoint.on('error', (error) => {
      console.error('❌ USB receive error:', error.message);
      this.emit('error', error);
    });

    this.inEndpoint.startPoll(1, 64);
  }

  /**
   * Process received data buffer
   */
  processReceiveBuffer() {
    // Prevent buffer from growing too large (max 1KB)
    if (this.receiveBuffer.length > 1024) {
      console.warn('⚠️  Receive buffer too large, clearing');
      this.receiveBuffer = Buffer.alloc(0);
      return;
    }

    let processedPackets = 0;
    const maxPacketsPerCall = 10; // Prevent infinite loops

    while (this.receiveBuffer.length >= 10 && processedPackets < maxPacketsPerCall) {
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
      processedPackets++;
    }
  }

  /**
   * Send data to the device
   * @param {Buffer|Array} data - Data to send
   */
  async send(data) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.outEndpoint) {
        reject(new Error('U2D2 not connected'));
        return;
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      this.outEndpoint.transfer(buffer, (error) => {
        if (error) {
          reject(new Error(`USB send error: ${error.message}`));
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
   * @typedef {Object} DeviceInfo
   * @property {number} id - Device ID
   * @property {number} modelNumber - Device model number
   * @property {string} modelName - Device model name
   * @property {number} firmwareVersion - Firmware version
   */

  /**
   * Discover devices on the bus
   * @param {Object} options - Discovery options
   * @returns {Promise<DeviceInfo[]>} - Array of discovered devices
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
   * Set baud rate (placeholder - U2D2 handles this automatically)
   * @param {number} baudRate - Baud rate
   */
  setBaudRate(baudRate) {
    console.log(`ℹ️  U2D2 baud rate set to ${baudRate} (handled automatically by U2D2)`);
  }

  /**
   * Get current baud rate
   * @returns {number} - Current baud rate
   */
  getBaudRate() {
    return 57600; // U2D2 default
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * @typedef {Object} USBDeviceInfo
   * @property {number} vendorId - USB vendor ID
   * @property {number} productId - USB product ID
   * @property {number} busNumber - USB bus number
   * @property {number} deviceAddress - Device address on bus
   * @property {boolean} isU2D2 - Whether this is a U2D2 device
   */

  /**
   * @typedef {Object} SystemInfo
   * @property {string} platform - Operating system platform
   * @property {string} arch - System architecture
   * @property {string} nodeVersion - Node.js version
   * @property {boolean} usbAvailable - Whether USB module is available
   * @property {string} usbVersion - USB module version info
   */

  /**
   * @typedef {Object} USBDiagnostics
   * @property {boolean} usbModuleAvailable - Whether USB module is available
   * @property {USBDeviceInfo[]} u2d2Devices - Found U2D2 devices
   * @property {USBDeviceInfo[]} allDevices - All USB devices
   * @property {string[]} errors - Array of error messages
   * @property {number} totalDevices - Total number of USB devices
   * @property {SystemInfo} systemInfo - System information
   */

  /**
   * List available USB devices
   * @returns {USBDeviceInfo[]} - Array of USB devices
   */
  static listUSBDevices() {
    if (!usb) {
      console.warn('⚠️  USB module not available');
      return [];
    }

    const devices = usb.getDeviceList();
    return devices.map(device => ({
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct,
      busNumber: device.busNumber,
      deviceAddress: device.deviceAddress,
      isU2D2: device.deviceDescriptor.idVendor === U2D2_DEVICE.VENDOR_ID &&
              device.deviceDescriptor.idProduct === U2D2_DEVICE.PRODUCT_ID
    }));
  }

  /**
   * Get system information
   * @returns {SystemInfo} - System information
   */
  static getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      usbAvailable: usb !== null,
      usbVersion: usb ? 'Available' : 'Not available'
    };
  }

  /**
   * Perform USB diagnostics
   * @returns {USBDiagnostics} - Diagnostic results
   */
  static performUSBDiagnostics() {
    const results = {
      usbModuleAvailable: usb !== null,
      u2d2Devices: [],
      allDevices: [],
      errors: [],
      totalDevices: 0,
      systemInfo: this.getSystemInfo()
    };

    if (!usb) {
      results.errors.push('USB module not available. Install with: npm install usb');
      return results;
    }

    try {
      const devices = usb.getDeviceList();
      results.allDevices = devices.map(device => ({
        vendorId: device.deviceDescriptor.idVendor,
        productId: device.deviceDescriptor.idProduct,
        busNumber: device.busNumber,
        deviceAddress: device.deviceAddress
      }));

      results.totalDevices = results.allDevices.length;

      results.u2d2Devices = results.allDevices.filter(device =>
        device.vendorId === U2D2_DEVICE.VENDOR_ID &&
        device.productId === U2D2_DEVICE.PRODUCT_ID
      );

    } catch (error) {
      results.errors.push(`Failed to get device list: ${error.message}`);
    }

    return results;
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
