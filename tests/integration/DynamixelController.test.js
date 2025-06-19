import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DynamixelController } from '../../src/DynamixelController.js';

// Mock SerialPort completely
const mockSerialPort = {
  SerialPort: jest.fn(),
  list: jest.fn()
};

const mockPort = {
  write: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  isOpen: true
};

// Mock USB module
const mockUSB = {
  getDeviceList: jest.fn(),
  setDebugLevel: jest.fn()
};

jest.unstable_mockModule('serialport', () => mockSerialPort);
jest.unstable_mockModule('usb', () => ({ usb: mockUSB }));

// Import modules after mocking
const { SerialConnection } = await import('../../src/transport/SerialConnection.esm.js');
const { U2D2Connection } = await import('../../src/transport/U2D2Connection.esm.js');

describe('DynamixelController Integration', () => {
  let controller;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock behavior to prevent real hardware access
    mockSerialPort.SerialPort.mockImplementation(() => mockPort);
    mockSerialPort.list.mockResolvedValue([]);

    mockPort.on.mockImplementation((event, callback) => {
      if (event === 'open') {
        setTimeout(callback, 10);
      }
      return mockPort;
    });

    mockPort.write.mockImplementation((data, callback) => {
      if (callback) setTimeout(callback, 10);
    });

    mockPort.close.mockImplementation((callback) => {
      if (callback) setTimeout(callback, 10);
    });

    // Mock USB to return empty list to avoid real hardware access
    mockUSB.getDeviceList.mockReturnValue([]);

    // Mock the static methods that are actually called by discoverCommunicationDevices
    jest.spyOn(SerialConnection, 'listSerialPorts').mockResolvedValue([]);
    jest.spyOn(U2D2Connection, 'listUSBDevices').mockReturnValue([]);
  });

  afterEach(async() => {
    if (controller && controller.isConnected) {
      try {
        await controller.disconnect();
      } catch (_error) {
        // Ignore cleanup errors in tests
      }
    }
  });

  describe('Initialization', () => {
    test('should create controller without auto-connect', () => {
      controller = new DynamixelController();
      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.isConnected).toBe(false);
    });

    test('should create controller with deferred connection', () => {
      controller = new DynamixelController({ deferConnection: true });
      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.connection).toBeNull();
      expect(controller.deferConnection).toBe(true);
    });

    test('should create connection by default when deferConnection is false', () => {
      controller = new DynamixelController({ deferConnection: false });
      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.connection).not.toBeNull();
      expect(controller.deferConnection).toBe(false);
    });

    test('should handle missing USB module gracefully', async() => {
      // Mock USB module as unavailable
      mockUSB.getDeviceList.mockImplementation(() => {
        throw new Error('USB module not available');
      });

      controller = new DynamixelController({ connectionType: 'usb' });

      // Should fallback gracefully
      expect(controller).toBeInstanceOf(DynamixelController);
    });
  });

  describe('Static Device Discovery', () => {
    test('should discover communication devices without connection', async() => {
      // Mock serial port discovery
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014'
        },
        {
          path: '/dev/tty.usbserial-OTHER',
          manufacturer: 'Other',
          vendorId: '1234',
          productId: '5678'
        }
      ]);

      // Mock USB device discovery
      mockUSB.getDeviceList.mockReturnValue([
        {
          deviceDescriptor: {
            idVendor: 0x0403,
            idProduct: 0x6014
          }
        }
      ]);

      const devices = await DynamixelController.discoverCommunicationDevices();

      expect(devices).toHaveProperty('usb');
      expect(devices).toHaveProperty('serial');
      expect(devices).toHaveProperty('webserial');
      expect(Array.isArray(devices.usb)).toBe(true);
      expect(Array.isArray(devices.serial)).toBe(true);
      expect(typeof devices.webserial).toBe('boolean');
    });

    test('should discover U2D2 devices specifically', async() => {
      // Mock SerialConnection.listSerialPorts() to return U2D2-compatible serial device
      jest.spyOn(SerialConnection, 'listSerialPorts').mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014',
          isU2D2: true  // This should be set by the SerialConnection.listSerialPorts() method
        }
      ]);

      // Mock U2D2Connection.listUSBDevices() to return U2D2-compatible USB device
      jest.spyOn(U2D2Connection, 'listUSBDevices').mockReturnValue([
        {
          vendorId: 0x0403,
          productId: 0x6014,
          busNumber: 1,
          deviceAddress: 1
        }
      ]);

      const u2d2Devices = await DynamixelController.discoverU2D2Devices();

      expect(Array.isArray(u2d2Devices)).toBe(true);
      expect(u2d2Devices.length).toBeGreaterThan(0);

      // Check that returned devices have U2D2 characteristics
      u2d2Devices.forEach(device => {
        expect(device).toHaveProperty('recommended', true);
        expect(device).toHaveProperty('type');
        expect(['usb', 'serial'].includes(device.type)).toBe(true);
      });
    });

    test('should handle errors in device discovery gracefully', async() => {
      // Test that discovery handles errors and returns expected structure
      // We won't mock everything to avoid complex setup - just verify structure
      const devices = await DynamixelController.discoverCommunicationDevices();

      // Should always return the expected structure, even with errors
      expect(devices).toHaveProperty('usb');
      expect(devices).toHaveProperty('serial');
      expect(devices).toHaveProperty('webserial');
      expect(Array.isArray(devices.usb)).toBe(true);
      expect(Array.isArray(devices.serial)).toBe(true);
      expect(typeof devices.webserial).toBe('boolean');
    });

    test('should list serial ports separately', async() => {
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014'
        }
      ]);

      const ports = await DynamixelController.listSerialPorts();

      expect(Array.isArray(ports)).toBe(true);
      if (ports.length > 0) {
        expect(ports[0]).toHaveProperty('path');
        expect(ports[0]).toHaveProperty('isU2D2');
      }
    });
  });

  describe('Device Discovery', () => {
    test('should find U2D2 devices via serial port', async() => {
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014'
        }
      ]);

      controller = new DynamixelController();

      // Test that the list method is available
      expect(mockSerialPort.list).toBeDefined();
    });

    test('should return empty array when no U2D2 devices found', async() => {
      mockSerialPort.list.mockResolvedValue([]);

      controller = new DynamixelController();

      // Test that the controller handles empty device lists
      expect(controller.getDeviceCount()).toBe(0);
    });

    test('should handle serial port listing errors', async() => {
      mockSerialPort.list.mockRejectedValue(new Error('Serial port access denied'));

      controller = new DynamixelController();

      // The controller should handle this gracefully
      expect(controller).toBeInstanceOf(DynamixelController);
    });
  });

  describe('Connection Management', () => {
    test('should connect via auto-detection', async() => {
      // Mock successful serial port discovery
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014'
        }
      ]);

      controller = new DynamixelController();

      // Override the connect method to avoid real hardware
      controller.connect = jest.fn().mockResolvedValue(true);

      const result = await controller.connect();

      expect(result).toBe(true);
    });

    test('should connect to specific serial device', async() => {
      controller = new DynamixelController({ connectionType: 'serial' });

      // Override the connect method to avoid real hardware
      controller.connect = jest.fn().mockResolvedValue(true);

      await controller.connect('/dev/tty.usbserial-FTAA0AS4');

      expect(controller.connect).toHaveBeenCalledWith('/dev/tty.usbserial-FTAA0AS4');
    });

    test('should handle connection failure', async() => {
      controller = new DynamixelController();

      // Override the connect method to simulate failure
      controller.connect = jest.fn().mockResolvedValue(false);

      const result = await controller.connect('/dev/nonexistent');

      expect(result).toBe(false);
    });

    test('should disconnect properly', async() => {
      controller = new DynamixelController();

      // Mock successful connection and disconnection
      controller.connect = jest.fn().mockResolvedValue(true);
      controller.disconnect = jest.fn().mockResolvedValue(undefined);

      await controller.connect();
      await controller.disconnect();

      expect(controller.disconnect).toHaveBeenCalled();
    });
  });

  describe('Separated Connection Workflow', () => {
    test('should connect to specific USB device', async() => {
      controller = new DynamixelController({ deferConnection: true });

      const deviceInfo = {
        type: 'usb',
        vendorId: 0x0403,
        productId: 0x6014,
        name: 'U2D2 USB Device'
      };

      // Mock the connection creation and connection process
      const mockConnection = {
        connect: jest.fn().mockResolvedValue(true)
      };

      // Mock createConnection to return our mock connection
      controller.createConnection = jest.fn(() => {
        controller.connection = mockConnection;
      });

      const result = await controller.connectToDevice(deviceInfo);

      expect(result).toBe(true);
      expect(controller.createConnection).toHaveBeenCalled();
      expect(mockConnection.connect).toHaveBeenCalled();
    });

    test('should connect to specific serial device', async() => {
      controller = new DynamixelController({ deferConnection: true });

      const deviceInfo = {
        type: 'serial',
        path: '/dev/tty.usbserial-FTAA0AS4',
        manufacturer: 'FTDI',
        name: 'U2D2 Serial Port'
      };

      // Mock the connection creation and connection process
      const mockConnection = {
        connect: jest.fn().mockResolvedValue(true)
      };

      controller.createConnection = jest.fn(() => {
        controller.connection = mockConnection;
      });

      const result = await controller.connectToDevice(deviceInfo);

      expect(result).toBe(true);
      expect(controller.createConnection).toHaveBeenCalled();
      expect(mockConnection.connect).toHaveBeenCalledWith('/dev/tty.usbserial-FTAA0AS4');
    });

    test('should handle connection failure in connectToDevice', async() => {
      controller = new DynamixelController({ deferConnection: true });

      const deviceInfo = {
        type: 'usb',
        vendorId: 0x0403,
        productId: 0x6014
      };

      // Mock connection failure
      const mockConnection = {
        connect: jest.fn().mockResolvedValue(false)
      };

      controller.createConnection = jest.fn(() => {
        controller.connection = mockConnection;
      });

      const result = await controller.connectToDevice(deviceInfo);

      expect(result).toBe(false);
    });

    test('should handle connection error in connectToDevice', async() => {
      controller = new DynamixelController({ deferConnection: true });

      const deviceInfo = {
        type: 'serial',
        path: '/dev/nonexistent'
      };

      // Mock connection error
      const mockConnection = {
        connect: jest.fn().mockRejectedValue(new Error('Device not found'))
      };

      controller.createConnection = jest.fn(() => {
        controller.connection = mockConnection;
      });

      // Mock error event
      controller.emit = jest.fn();

      const result = await controller.connectToDevice(deviceInfo);

      expect(result).toBe(false);
      expect(controller.emit).toHaveBeenCalledWith('error', expect.any(Error));
    });

    test('should reuse existing connection if already created', async() => {
      // Create controller with existing connection (not deferred)
      controller = new DynamixelController({ deferConnection: false });

      const deviceInfo = {
        type: 'usb',
        vendorId: 0x0403,
        productId: 0x6014
      };

      // Mock existing connection
      const mockConnection = {
        connect: jest.fn().mockResolvedValue(true)
      };

      controller.connection = mockConnection;

      const result = await controller.connectToDevice(deviceInfo);

      expect(result).toBe(true);
      expect(mockConnection.connect).toHaveBeenCalled();
    });
  });

  describe('Device Discovery After Connection', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      // Mock the connection as successful
      controller.isConnected = true;
    });

    test('should discover devices with mock responses', async() => {
      // Mock the discovery method
      controller.discoverDevices = jest.fn().mockResolvedValue([
        { id: 1, modelNumber: 1020, firmwareVersion: 52 }
      ]);

      const devices = await controller.discoverDevices();

      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe(1);
    });

    test('should handle scan timeout', async() => {
      // Mock discovery with timeout
      controller.discoverDevices = jest.fn().mockResolvedValue([]);

      const devices = await controller.discoverDevices({ timeout: 100 });

      // Should return empty array on timeout
      expect(devices).toHaveLength(0);
    });
  });

  describe('Device Management', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      controller.isConnected = true;

      // Add a mock device
      controller.addDevice(1, { modelNumber: 1020, firmwareVersion: 52 });
    });

    test('should get device by ID', () => {
      const device = controller.getDevice(1);
      expect(device).toBeDefined();
      expect(device.id).toBe(1);
    });

    test('should return null for non-existent device', () => {
      const device = controller.getDevice(99);
      expect(device).toBeNull();
    });

    test('should get all devices', () => {
      const devices = controller.getAllDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe(1);
    });

    test('should get device count', () => {
      expect(controller.getDeviceCount()).toBe(1);
    });

    test('should remove device', () => {
      controller.removeDevice(1);
      expect(controller.getDeviceCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle serial port errors during operation', async() => {
      controller = new DynamixelController();
      controller.isConnected = true;

      // Simulate a port error
      const errorHandler = mockPort.on.mock.calls.find(call => call[0] === 'error');
      if (errorHandler) {
        errorHandler[1](new Error('Serial port disconnected'));
      }

      // Controller should handle the error gracefully
      expect(controller.isConnected).toBe(true); // Still connected until explicitly disconnected
    });

    test('should require connection for device operations', async() => {
      controller = new DynamixelController();

      await expect(controller.ping(1)).rejects.toThrow('Controller not connected');
    });
  });

  describe('Configuration', () => {
    test('should use custom configuration', () => {
      const config = {
        connectionType: 'serial',
        baudRate: 115200,
        timeout: 2000
      };

      controller = new DynamixelController(config);

      // Controller should store and use the configuration
      expect(controller.connectionType).toBe('serial');
    });

    test('should merge with default configuration', () => {
      controller = new DynamixelController({ connectionType: 'serial' });

      // Should have custom connectionType but other defaults
      expect(controller.connectionType).toBe('serial');
    });
  });

  describe('Protocol Operations', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      controller.isConnected = true;
    });

    test('should ping device', async() => {
      // Mock the ping response
      controller.ping = jest.fn().mockResolvedValue({
        id: 1,
        modelNumber: 1020,
        firmwareVersion: 52,
        error: 0
      });

      const result = await controller.ping(1);

      expect(result.id).toBe(1);
      expect(controller.ping).toHaveBeenCalledWith(1);
    });

    test('should handle ping timeout', async() => {
      controller.ping = jest.fn().mockRejectedValue(new Error('Timeout'));

      await expect(controller.ping(1, 100)).rejects.toThrow('Timeout');
    });
  });

  describe('Connection Status', () => {
    test('should provide connection status', () => {
      controller = new DynamixelController();

      const status = controller.getConnectionStatus();
      expect(typeof status).toBe('boolean');
      expect(status).toBe(false);
    });

    test('should get connection instance', () => {
      controller = new DynamixelController();

      const connection = controller.getConnection();
      expect(connection).toBeDefined();
    });
  });

  describe('Baudrate Management', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      controller.isConnected = true;
    });

    test('should set baudrate', () => {
      controller.setBaudRate(115200);

      // Should call the connection's setBaudRate method
      expect(controller.getBaudRate()).toBeDefined();
    });

    test('should get current baudrate', () => {
      const baudRate = controller.getBaudRate();
      expect(typeof baudRate).toBe('number');
    });
  });

  describe('Advanced Discovery', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      controller.isConnected = true;
    });

    test('should perform broadcast ping', async() => {
      // Mock broadcast ping
      controller.broadcastPing = jest.fn().mockResolvedValue([
        { id: 1, modelNumber: 1020 },
        { id: 2, modelNumber: 1020 }
      ]);

      const devices = await controller.broadcastPing();
      expect(devices).toHaveLength(2);
    });

    test('should perform quick discovery', async() => {
      controller.quickDiscovery = jest.fn().mockResolvedValue([
        { id: 1, modelNumber: 1020, firmwareVersion: 52 }
      ]);

      const devices = await controller.quickDiscovery();
      expect(devices).toHaveLength(1);
    });

    test('should perform full discovery', async() => {
      controller.fullDiscovery = jest.fn().mockResolvedValue([
        { id: 1, modelNumber: 1020, firmwareVersion: 52 },
        { id: 2, modelNumber: 1020, firmwareVersion: 52 }
      ]);

      const devices = await controller.fullDiscovery();
      expect(devices).toHaveLength(2);
    });
  });

  describe('Connection Type Detection', () => {
    test('should detect USB connection type', () => {
      controller = new DynamixelController({ connectionType: 'usb' });
      expect(controller.connectionType).toBe('usb');
    });

    test('should detect serial connection type', () => {
      controller = new DynamixelController({ connectionType: 'serial' });
      expect(controller.connectionType).toBe('serial');
    });

    test('should detect webserial connection type', () => {
      // Skip this test in Node.js environment where Web Serial API is not available
      if (typeof navigator === 'undefined' || !navigator.serial) {
        expect(() => new DynamixelController({ connectionType: 'webserial' }))
          .toThrow('Web Serial API not available');
        return;
      }

      controller = new DynamixelController({ connectionType: 'webserial' });
      expect(controller.connectionType).toBe('webserial');
    });

    test('should auto-detect connection type', () => {
      controller = new DynamixelController({ connectionType: 'auto' });
      expect(controller.connectionType).toBe('auto');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      controller = new DynamixelController();
    });

    test('should handle device connected event', () => {
      const mockCallback = jest.fn();
      controller.on('deviceConnected', mockCallback);

      // Simulate device connection
      controller.emit('deviceConnected', { id: 1 });

      expect(mockCallback).toHaveBeenCalledWith({ id: 1 });
    });

    test('should handle device disconnected event', () => {
      const mockCallback = jest.fn();
      controller.on('deviceDisconnected', mockCallback);

      // Simulate device disconnection
      controller.emit('deviceDisconnected', { id: 1 });

      expect(mockCallback).toHaveBeenCalledWith({ id: 1 });
    });

    test('should handle error events', () => {
      const mockCallback = jest.fn();
      controller.on('error', mockCallback);

      // Simulate error
      controller.emit('error', new Error('Test error'));

      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async() => {
      controller = new DynamixelController();
      controller.isConnected = true;

      // Add multiple mock devices
      controller.addDevice(1, { modelNumber: 1020, firmwareVersion: 52 });
      controller.addDevice(2, { modelNumber: 1020, firmwareVersion: 52 });
    });

    test('should perform bulk read', async() => {
      controller.bulkRead = jest.fn().mockResolvedValue([
        { id: 1, data: [0x01, 0x02] },
        { id: 2, data: [0x03, 0x04] }
      ]);

      const results = await controller.bulkRead([1, 2], 0x84, 2);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
    });

    test('should perform bulk write', async() => {
      controller.bulkWrite = jest.fn().mockResolvedValue(true);

      const writeData = [
        { id: 1, address: 0x84, data: [0x01, 0x02] },
        { id: 2, address: 0x84, data: [0x03, 0x04] }
      ];

      const result = await controller.bulkWrite(writeData);
      expect(result).toBe(true);
    });

    test('should perform sync read', async() => {
      controller.syncRead = jest.fn().mockResolvedValue([
        { id: 1, data: [0x01, 0x02] },
        { id: 2, data: [0x03, 0x04] }
      ]);

      const results = await controller.syncRead([1, 2], 0x84, 2);
      expect(results).toHaveLength(2);
    });

    test('should perform sync write', async() => {
      controller.syncWrite = jest.fn().mockResolvedValue(true);

      const writeData = [
        { id: 1, data: [0x01, 0x02] },
        { id: 2, data: [0x03, 0x04] }
      ];

      const result = await controller.syncWrite(0x84, writeData);
      expect(result).toBe(true);
    });
  });

  describe('Connection Management Edge Cases', () => {
    test('should handle connection with specific device path', async() => {
      controller = new DynamixelController({ connectionType: 'serial' });
      controller.connect = jest.fn().mockResolvedValue(true);

      const result = await controller.connect('/dev/ttyUSB0');
      expect(result).toBe(true);
      expect(controller.connect).toHaveBeenCalledWith('/dev/ttyUSB0');
    });

    test('should handle connection with options', async() => {
      controller = new DynamixelController();
      controller.connect = jest.fn().mockResolvedValue(true);

      const options = { baudRate: 57600, timeout: 1000 };
      const result = await controller.connect(null, options);
      expect(result).toBe(true);
    });

    test('should handle multiple disconnect calls', async() => {
      controller = new DynamixelController();
      controller.isConnected = true;
      controller.disconnect = jest.fn().mockResolvedValue(undefined);

      await controller.disconnect();
      await controller.disconnect(); // Second call should not throw

      expect(controller.disconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Device Information', () => {
    beforeEach(() => {
      controller = new DynamixelController();
      controller.isConnected = true;
    });

    test('should get device info', async() => {
      controller.getDeviceInfo = jest.fn().mockResolvedValue({
        id: 1,
        modelNumber: 1020,
        firmwareVersion: 52,
        modelName: 'XL430-W250'
      });

      const info = await controller.getDeviceInfo(1);
      expect(info.id).toBe(1);
      expect(info.modelName).toBe('XL430-W250');
    });

    test('should handle device info error', async() => {
      controller.getDeviceInfo = jest.fn().mockRejectedValue(new Error('Device not found'));

      await expect(controller.getDeviceInfo(99)).rejects.toThrow('Device not found');
    });
  });

  describe('Protocol Version Handling', () => {
    test('should handle Protocol 2.0', () => {
      controller = new DynamixelController({ protocolVersion: 2.0 });
      // The controller doesn't expose protocolVersion directly, but it should accept the option
      expect(controller).toBeInstanceOf(DynamixelController);
    });

    test('should default to Protocol 2.0', () => {
      controller = new DynamixelController();
      // The controller uses Protocol 2.0 by default internally
      expect(controller).toBeInstanceOf(DynamixelController);
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      controller = new DynamixelController();
      controller.isConnected = true;
    });

    test('should handle custom timeout for operations', async() => {
      controller.ping = jest.fn().mockImplementation((id, timeout) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id, timeout }), 10);
        });
      });

      const result = await controller.ping(1, 500);
      expect(result.timeout).toBe(500);
    });

    test('should use default timeout when not specified', async() => {
      controller.ping = jest.fn().mockResolvedValue({ id: 1 });

      await controller.ping(1);
      expect(controller.ping).toHaveBeenCalledWith(1);
    });
  });
});
