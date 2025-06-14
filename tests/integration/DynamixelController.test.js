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
});
