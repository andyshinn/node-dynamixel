import { EventEmitter } from 'events';
import { U2D2_DEVICE, DEFAULT_TIMEOUT } from '../dynamixel/constants.js';
import { Protocol2 } from '../dynamixel/Protocol2.js';

// Try to import USB, but handle gracefully if not available
let usb;
try {
  const usbModule = await import('usb');
  usb = usbModule.usb;
} catch (_error) {
  // USB module not available
  usb = null;
}

/**
 * U2D2 USB to TTL connection handler
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
    if (options.debug) {
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
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Start receiving data from U2D2
   */
  startReceiving() {
    if (!this.inEndpoint) return;

    this.inEndpoint.on('data', (data) => {
      this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
      this.processReceiveBuffer();
    });

    this.inEndpoint.on('error', (error) => {
      this.emit('error', error);
    });

    // Start polling for data
    this.inEndpoint.startPoll(1, 64); // 1 transfer, 64 bytes max
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
        this.emit('error', error);
      }
    }
  }

  /**
   * Send data to U2D2
   * @param {Buffer} data - Data to send
   * @returns {Promise<boolean>} - Success status
   */
  async send(data) {
    if (!this.isConnected || !this.outEndpoint) {
      throw new Error('U2D2 not connected');
    }

    return new Promise((resolve, reject) => {
      this.outEndpoint.transfer(data, (error) => {
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
   * Set baud rate for USB communication
   * Note: For USB connections, baud rate is typically fixed at the hardware level
   * This method is provided for API compatibility but may not change actual speed
   * @param {number} baudRate - New baud rate
   */
  setBaudRate(baudRate) {
    console.log(`ℹ️  USB baud rate setting: ${baudRate}`);
    console.log('ℹ️  Note: USB connections typically use fixed hardware speeds');
    // Store for compatibility but USB doesn't actually use traditional baud rates
    this.baudRate = baudRate;
  }

  /**
   * Get current baud rate setting
   * @returns {number} - Current baud rate setting
   */
  getBaudRate() {
    return this.baudRate || 57600; // Default DYNAMIXEL baud rate
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * List all available USB devices (for debugging)
   * @returns {Array} - Array of USB device information
   */
  static listUSBDevices() {
    if (!usb) {
      console.log('ℹ️  USB module not available');
      return [];
    }
    const devices = usb.getDeviceList();
    return devices.map(device => ({
      vendorId: device.deviceDescriptor.idVendor,
      productId: device.deviceDescriptor.idProduct,
      manufacturer: device.deviceDescriptor.iManufacturer,
      product: device.deviceDescriptor.iProduct,
      serialNumber: device.deviceDescriptor.iSerialNumber
    }));
  }

  /**
   * Check system permissions and provide troubleshooting guidance
   * @returns {Object} - System information and recommendations
   */
  static getSystemInfo() {
    const os = process.platform;
    const isRoot = process.getuid && process.getuid() === 0;

    const info = {
      platform: os,
      isRoot: isRoot,
      nodeVersion: process.version,
      recommendations: []
    };

    // Platform-specific recommendations
    if (os === 'darwin') { // macOS
      info.recommendations.push('On macOS, USB access often requires elevated privileges');
      if (!isRoot) {
        info.recommendations.push('Try running with: sudo node examples/device-discovery.js');
        info.recommendations.push('Or check System Preferences > Security & Privacy > Privacy for USB restrictions');
      }
      info.recommendations.push('Ensure no other applications (like DYNAMIXEL Wizard) are using the U2D2');
    } else if (os === 'linux') {
      info.recommendations.push('On Linux, you may need to add udev rules for the U2D2 device');
      info.recommendations.push('Try adding your user to the dialout group: sudo usermod -a -G dialout $USER');
      if (!isRoot) {
        info.recommendations.push('Or try running with: sudo node examples/device-discovery.js');
      }
    } else if (os === 'win32') {
      info.recommendations.push('On Windows, ensure the FTDI drivers are properly installed');
      info.recommendations.push('Download drivers from: https://ftdichip.com/drivers/');
    }

    return info;
  }

  /**
   * Perform comprehensive USB diagnostics
   * @returns {Object} - Diagnostic results
   */
  static performUSBDiagnostics() {
    console.log('🔧 Running USB diagnostics...\n');

    const systemInfo = U2D2Connection.getSystemInfo();
    console.log('💻 System Information:');
    console.log(`   Platform: ${systemInfo.platform}`);
    console.log(`   Node.js: ${systemInfo.nodeVersion}`);
    console.log(`   Running as root: ${systemInfo.isRoot}`);

    console.log('\n💡 Recommendations:');
    systemInfo.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    // Check for U2D2 device
    console.log('\n🔍 USB Device Detection:');
    const devices = U2D2Connection.listUSBDevices();
    const u2d2Device = devices.find(device =>
      device.vendorId === U2D2_DEVICE.VENDOR_ID &&
      device.productId === U2D2_DEVICE.PRODUCT_ID
    );

    if (u2d2Device) {
      console.log(`   ✅ U2D2 device found (VID: 0x${u2d2Device.vendorId.toString(16).padStart(4, '0')}, PID: 0x${u2d2Device.productId.toString(16).padStart(4, '0')})`);
    } else {
      console.log('   ❌ U2D2 device not found');
      console.log('   • Check USB connection');
      console.log('   • Try different USB port');
      console.log('   • Verify device power');
    }

    // List all USB devices for reference
    console.log(`\n📋 All USB devices (${devices.length} found):`);
    devices.forEach((device, index) => {
      console.log(`   ${index + 1}. VID: 0x${device.vendorId.toString(16).padStart(4, '0')}, PID: 0x${device.productId.toString(16).padStart(4, '0')}`);
    });

    return {
      systemInfo,
      u2d2Found: !!u2d2Device,
      totalDevices: devices.length,
      devices
    };
  }
}
