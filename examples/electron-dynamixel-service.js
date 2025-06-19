/**
 * Electron DynamixelService Example
 *
 * This is an example service class that could be used in your Electron main process
 * to manage DYNAMIXEL device discovery and connections with separation of concerns.
 *
 * Usage in your Electron app:
 *
 * // In main process
 * import { DynamixelService } from './services/DynamixelService.js';
 *
 * const dynamixelService = new DynamixelService();
 *
 * // IPC handlers
 * ipcMain.handle('dynamixel:discoverDevices', () => dynamixelService.discoverDevices());
 * ipcMain.handle('dynamixel:connectToDevice', (event, deviceInfo) => dynamixelService.connectToDevice(deviceInfo));
 * ipcMain.handle('dynamixel:discoverMotors', () => dynamixelService.discoverMotors());
 * ipcMain.handle('dynamixel:disconnect', () => dynamixelService.disconnect());
 */

import { EventEmitter } from 'events';
import { DynamixelController } from '../index.js';

export class DynamixelService extends EventEmitter {
  constructor() {
    super();

    this.controller = null;
    this.isConnected = false;
    this.availableDevices = [];
    this.discoveredMotors = [];
    this.connectionType = null;
  }

  /**
   * Discover available communication devices
   * This method doesn't create any connections - just scans for available devices
   * @returns {Promise<Object>} Device discovery results
   */
  async discoverDevices() {
    try {
      console.log('🔍 DynamixelService: Discovering communication devices...');

      // Discover all communication devices
      const allDevices = await DynamixelController.discoverCommunicationDevices();

      // Get U2D2-specific devices (recommended)
      const u2d2Devices = await DynamixelController.discoverU2D2Devices();

      this.availableDevices = [...u2d2Devices, ...allDevices.serial, ...allDevices.usb];

      const result = {
        success: true,
        devices: {
          recommended: u2d2Devices,
          all: allDevices,
          count: this.availableDevices.length
        },
        message: `Found ${this.availableDevices.length} communication devices`
      };

      this.emit('devicesDiscovered', result);
      return result;

    } catch (error) {
      console.error('❌ DynamixelService: Device discovery failed:', error.message);

      const result = {
        success: false,
        error: error.message,
        devices: { recommended: [], all: { usb: [], serial: [] }, count: 0 }
      };

      this.emit('deviceDiscoveryError', error);
      return result;
    }
  }

  /**
   * Connect to a specific device
   * @param {Object} deviceInfo - Device information from discovery
   * @returns {Promise<Object>} Connection result
   */
  async connectToDevice(deviceInfo) {
    try {
      console.log(`🔗 DynamixelService: Connecting to device: ${deviceInfo.name}`);

      // Disconnect from any existing connection
      if (this.controller && this.isConnected) {
        await this.disconnect();
      }

      // Create new controller with deferred connection
      this.controller = new DynamixelController({
        deferConnection: true,
        timeout: 1000,
        debug: false
      });

      // Set up event forwarding
      this.setupControllerEvents();

      // Connect to the selected device
      const connected = await this.controller.connectToDevice(deviceInfo);

      if (connected) {
        this.isConnected = true;
        this.connectionType = deviceInfo.type;

        const result = {
          success: true,
          device: deviceInfo,
          connectionType: this.connectionType,
          message: `Successfully connected to ${deviceInfo.name}`
        };

        this.emit('connected', result);
        return result;
      } else {
        throw new Error('Connection failed');
      }

    } catch (error) {
      console.error('❌ DynamixelService: Connection failed:', error.message);

      const result = {
        success: false,
        error: error.message,
        device: deviceInfo
      };

      this.emit('connectionError', error);
      return result;
    }
  }

  /**
   * Discover motors on the connected device
   * @param {Object} options - Discovery options (range, timeout, etc.)
   * @returns {Promise<Object>} Motor discovery result
   */
  async discoverMotors(options = {}) {
    try {
      if (!this.controller || !this.isConnected) {
        throw new Error('No device connected. Connect to a device first.');
      }

      console.log('🤖 DynamixelService: Discovering motors...');

      const { range = 'quick' } = options;

      let discoveredMotors = [];

      if (range === 'quick') {
        discoveredMotors = await this.controller.quickDiscovery((progress) => {
          this.emit('motorDiscoveryProgress', progress);
        });
      } else {
        discoveredMotors = await this.controller.fullDiscovery((progress) => {
          this.emit('motorDiscoveryProgress', progress);
        });
      }

      // Get device instances
      const devices = this.controller.getAllDevices();
      this.discoveredMotors = devices.map(device => {
        const info = device.getDeviceInfo();
        const modelName = DynamixelController.getModelName(info.modelNumber);

        return {
          id: info.id,
          modelNumber: info.modelNumber,
          modelName: modelName,
          firmwareVersion: info.firmwareVersion,
          device: device // Keep reference to device instance
        };
      });

      const result = {
        success: true,
        motors: this.discoveredMotors,
        count: this.discoveredMotors.length,
        range: range,
        message: `Found ${this.discoveredMotors.length} motors using ${range} discovery`
      };

      this.emit('motorsDiscovered', result);
      return result;

    } catch (error) {
      console.error('❌ DynamixelService: Motor discovery failed:', error.message);

      const result = {
        success: false,
        error: error.message,
        motors: [],
        count: 0
      };

      this.emit('motorDiscoveryError', error);
      return result;
    }
  }

  /**
   * Get motor by ID
   * @param {number} motorId - Motor ID
   * @returns {Object|null} Motor information and device instance
   */
  getMotor(motorId) {
    return this.discoveredMotors.find(motor => motor.id === motorId) || null;
  }

  /**
   * Get all discovered motors
   * @returns {Array} Array of motor information
   */
  getMotors() {
    return [...this.discoveredMotors];
  }

  /**
   * Get connection status
   * @returns {Object} Connection status information
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      connectionType: this.connectionType,
      motorCount: this.discoveredMotors.length,
      deviceCount: this.availableDevices.length
    };
  }

  /**
   * Disconnect from the current device
   * @returns {Promise<Object>} Disconnection result
   */
  async disconnect() {
    try {
      if (this.controller && this.isConnected) {
        console.log('🔌 DynamixelService: Disconnecting...');
        await this.controller.disconnect();
      }

      this.isConnected = false;
      this.connectionType = null;
      this.discoveredMotors = [];
      this.controller = null;

      const result = {
        success: true,
        message: 'Disconnected successfully'
      };

      this.emit('disconnected', result);
      return result;

    } catch (error) {
      console.error('❌ DynamixelService: Disconnection error:', error.message);

      const result = {
        success: false,
        error: error.message
      };

      this.emit('disconnectionError', error);
      return result;
    }
  }

  /**
   * Set up event forwarding from controller
   * @private
   */
  setupControllerEvents() {
    if (!this.controller) return;

    this.controller.on('connected', () => {
      this.isConnected = true;
    });

    this.controller.on('disconnected', () => {
      this.isConnected = false;
      this.emit('deviceDisconnected');
    });

    this.controller.on('error', (error) => {
      this.emit('controllerError', error);
    });

    this.controller.on('deviceFound', (deviceInfo) => {
      this.emit('motorFound', deviceInfo);
    });
  }

  /**
   * Clean up resources
   */
  async destroy() {
    await this.disconnect();
    this.removeAllListeners();
  }
}

// Example usage in Electron main process:
/*

import { app, BrowserWindow, ipcMain } from 'electron';
import { DynamixelService } from './services/DynamixelService.js';

let dynamixelService;

app.whenReady().then(() => {
  // Initialize service
  dynamixelService = new DynamixelService();

  // Set up event forwarding to renderer
  dynamixelService.on('devicesDiscovered', (result) => {
    // Send to all windows or specific window
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('dynamixel:devicesDiscovered', result);
    });
  });

  dynamixelService.on('connected', (result) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('dynamixel:connected', result);
    });
  });

  dynamixelService.on('motorsDiscovered', (result) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('dynamixel:motorsDiscovered', result);
    });
  });

  // Set up IPC handlers
  ipcMain.handle('dynamixel:discoverDevices', async () => {
    return await dynamixelService.discoverDevices();
  });

  ipcMain.handle('dynamixel:connectToDevice', async (event, deviceInfo) => {
    return await dynamixelService.connectToDevice(deviceInfo);
  });

  ipcMain.handle('dynamixel:discoverMotors', async (event, options) => {
    return await dynamixelService.discoverMotors(options);
  });

  ipcMain.handle('dynamixel:getConnectionStatus', () => {
    return dynamixelService.getConnectionStatus();
  });

  ipcMain.handle('dynamixel:getMotors', () => {
    return dynamixelService.getMotors();
  });

  ipcMain.handle('dynamixel:disconnect', async () => {
    return await dynamixelService.disconnect();
  });

  createWindow();
});

app.on('before-quit', async () => {
  if (dynamixelService) {
    await dynamixelService.destroy();
  }
});

*/

// Example usage in renderer process:
/*

// In your renderer process (React, Vue, etc.)

class DynamixelClient {
  async discoverDevices() {
    return await window.electronAPI.invoke('dynamixel:discoverDevices');
  }

  async connectToDevice(deviceInfo) {
    return await window.electronAPI.invoke('dynamixel:connectToDevice', deviceInfo);
  }

  async discoverMotors(options = {}) {
    return await window.electronAPI.invoke('dynamixel:discoverMotors', options);
  }

  async getMotors() {
    return await window.electronAPI.invoke('dynamixel:getMotors');
  }

  async disconnect() {
    return await window.electronAPI.invoke('dynamixel:disconnect');
  }

  // Event listeners
  onDevicesDiscovered(callback) {
    window.electronAPI.on('dynamixel:devicesDiscovered', callback);
  }

  onConnected(callback) {
    window.electronAPI.on('dynamixel:connected', callback);
  }

  onMotorsDiscovered(callback) {
    window.electronAPI.on('dynamixel:motorsDiscovered', callback);
  }
}

// Usage in React component:
const [devices, setDevices] = useState([]);
const [selectedDevice, setSelectedDevice] = useState(null);
const [motors, setMotors] = useState([]);
const [isConnected, setIsConnected] = useState(false);

const dynamixelClient = new DynamixelClient();

// Discover devices on component mount
useEffect(() => {
  const discoverDevices = async () => {
    const result = await dynamixelClient.discoverDevices();
    if (result.success) {
      setDevices(result.devices.recommended);
    }
  };

  discoverDevices();
}, []);

// Connect to selected device
const handleConnectToDevice = async (device) => {
  const result = await dynamixelClient.connectToDevice(device);
  if (result.success) {
    setSelectedDevice(device);
    setIsConnected(true);

    // Now discover motors
    const motorResult = await dynamixelClient.discoverMotors({ range: 'quick' });
    if (motorResult.success) {
      setMotors(motorResult.motors);
    }
  }
};

*/
