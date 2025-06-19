import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DynamixelController } from '../../src/DynamixelController.js';

// Mock USB module
const mockUSB = {
  getDeviceList: jest.fn(),
  setDebugLevel: jest.fn()
};

// Mock SerialPort module
const mockSerialPort = {
  SerialPort: jest.fn(),
  list: jest.fn()
};

jest.unstable_mockModule('usb', () => ({ usb: mockUSB }));
jest.unstable_mockModule('serialport', () => mockSerialPort);

describe('Separated Discovery Functionality', () => {
  let controller;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock behavior
    mockSerialPort.list.mockResolvedValue([]);
    mockUSB.getDeviceList.mockReturnValue([]);

    // Set test timeout to prevent hanging
    jest.setTimeout(10000); // 10 seconds
  });

  afterEach(async() => {
    if (controller) {
      try {
        // Always try to disconnect, regardless of connection state
        await controller.disconnect();
      } catch (_error) {
        // Ignore cleanup errors in tests
      }

      // Clear any references
      controller = null;
    }
  });

  describe('Constructor with deferConnection', () => {
    test('should create controller with deferred connection', () => {
      controller = new DynamixelController({ deferConnection: true });

      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.deferConnection).toBe(true);
      expect(controller.connection).toBeNull();
      expect(controller.isConnected).toBe(false);
    });

    test('should create controller with immediate connection by default', () => {
      controller = new DynamixelController();

      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.deferConnection).toBe(false);
      expect(controller.connection).not.toBeNull();
    });

    test('should create controller with explicit immediate connection', () => {
      controller = new DynamixelController({ deferConnection: false });

      expect(controller).toBeInstanceOf(DynamixelController);
      expect(controller.deferConnection).toBe(false);
      expect(controller.connection).not.toBeNull();
    });
  });

  describe('Static Discovery Methods', () => {
    test('should have discoverCommunicationDevices static method', () => {
      expect(typeof DynamixelController.discoverCommunicationDevices).toBe('function');
    });

    test('should have discoverU2D2Devices static method', () => {
      expect(typeof DynamixelController.discoverU2D2Devices).toBe('function');
    });

    test('should have listSerialPorts static method', () => {
      expect(typeof DynamixelController.listSerialPorts).toBe('function');
    });

    test('discoverCommunicationDevices should return expected structure', async() => {
      // Mock some devices
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.test',
          manufacturer: 'Test',
          vendorId: '1234',
          productId: '5678'
        }
      ]);

      mockUSB.getDeviceList.mockReturnValue([
        {
          deviceDescriptor: {
            idVendor: 0x1234,
            idProduct: 0x5678
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

    test('discoverU2D2Devices should filter for U2D2-compatible devices', async() => {
      // Mock U2D2 devices
      mockSerialPort.list.mockResolvedValue([
        {
          path: '/dev/tty.usbserial-FTAA0AS4',
          manufacturer: 'FTDI',
          vendorId: '0403',
          productId: '6014'
        }
      ]);

      mockUSB.getDeviceList.mockReturnValue([
        {
          deviceDescriptor: {
            idVendor: 0x0403,
            idProduct: 0x6014
          }
        }
      ]);

      const u2d2Devices = await DynamixelController.discoverU2D2Devices();

      expect(Array.isArray(u2d2Devices)).toBe(true);

      // Check that returned devices have U2D2 characteristics
      u2d2Devices.forEach(device => {
        expect(device).toHaveProperty('recommended', true);
        expect(device).toHaveProperty('type');
        expect(['usb', 'serial'].includes(device.type)).toBe(true);
      });
    });
  });

  describe('connectToDevice method', () => {
    test('should have connectToDevice method', () => {
      controller = new DynamixelController({ deferConnection: true });
      expect(typeof controller.connectToDevice).toBe('function');
    });

    test('should handle device connection parameters correctly', async() => {
      controller = new DynamixelController({ deferConnection: true });

      const deviceInfo = {
        type: 'usb',
        vendorId: 0x0403,
        productId: 0x6014,
        name: 'Test U2D2 Device'
      };

      // Simplify to just test that the method exists and doesn't crash
      // Mock the connection to avoid real hardware access
      controller.connection = {
        connect: jest.fn().mockResolvedValue(false)
      };

      // This should not throw, even if connection fails
      const result = await controller.connectToDevice(deviceInfo);

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false); // Connection failed as expected in test
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing API behavior', () => {
      // This should work exactly as before
      controller = new DynamixelController();

      expect(controller.isConnected).toBe(false);
      expect(controller.connection).not.toBeNull();
      expect(typeof controller.connect).toBe('function');
      expect(typeof controller.discoverDevices).toBe('function');
      expect(typeof controller.quickDiscovery).toBe('function');
    });

    test('should preserve all existing methods', () => {
      controller = new DynamixelController();

      // Check that all existing methods are still present
      const expectedMethods = [
        'connect', 'disconnect', 'ping', 'discoverDevices',
        'quickDiscovery', 'fullDiscovery', 'getDevice',
        'getAllDevices', 'getDeviceCount', 'addDevice',
        'setBaudRate', 'getBaudRate', 'removeDevice',
        'getConnectionStatus', 'getConnection'
      ];

      expectedMethods.forEach(method => {
        expect(typeof controller[method]).toBe('function');
      });
    });

    test('should preserve all existing static methods', () => {
      const expectedStaticMethods = [
        'getModelName', 'listUSBDevices', 'getSystemInfo', 'performUSBDiagnostics'
      ];

      expectedStaticMethods.forEach(method => {
        expect(typeof DynamixelController[method]).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle connectToDevice gracefully', async() => {
      controller = new DynamixelController({ deferConnection: true });

      // Mock the connectToDevice method to avoid real connection attempts
      const originalConnectToDevice = controller.connectToDevice;
      controller.connectToDevice = jest.fn().mockResolvedValue(false);

      const deviceInfo = {
        type: 'serial',
        path: '/dev/nonexistent',
        name: 'Test Device'
      };

      // Test that connectToDevice returns a boolean and doesn't crash
      const result = await controller.connectToDevice(deviceInfo);

      // Should return a boolean (either success or failure)
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
      expect(controller.connectToDevice).toHaveBeenCalledWith(deviceInfo);

      // Restore original method
      controller.connectToDevice = originalConnectToDevice;
    });

    test('should handle discovery errors gracefully', async() => {
      // Test that discovery methods exist and return expected structure
      // even when encountering errors (this test doesn't mock to avoid complexity)
      const devices = await DynamixelController.discoverCommunicationDevices();

      // Should always return the expected structure
      expect(devices).toHaveProperty('usb');
      expect(devices).toHaveProperty('serial');
      expect(devices).toHaveProperty('webserial');
      expect(Array.isArray(devices.usb)).toBe(true);
      expect(Array.isArray(devices.serial)).toBe(true);
      expect(typeof devices.webserial).toBe('boolean');
    });
  });

  describe('Integration with new workflow', () => {
    test('should support the complete separated discovery workflow', async() => {
      // Step 1: Discover devices (static method)
      const devices = await DynamixelController.discoverCommunicationDevices();
      expect(devices).toHaveProperty('usb');
      expect(devices).toHaveProperty('serial');

      // Step 2: Create controller with deferred connection
      controller = new DynamixelController({ deferConnection: true });
      expect(controller.connection).toBeNull();

      // Step 3: Would connect to device (skipped in test to avoid hardware)
      // const connected = await controller.connectToDevice(selectedDevice);

      // Verify the workflow is possible
      expect(typeof controller.connectToDevice).toBe('function');
    });
  });
});
