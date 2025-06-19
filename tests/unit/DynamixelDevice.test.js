import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DynamixelDevice } from '../../src/dynamixel/DynamixelDevice.js';
import { Protocol2 } from '../../src/dynamixel/Protocol2.js';

/**
 * Helper function to create a status packet buffer
 * @param {number} id - Device ID
 * @param {number} error - Error code (0 = no error)
 * @param {Array} parameters - Response parameters
 * @returns {Buffer} - Raw status packet buffer
 */
function createStatusPacketBuffer(id, error = 0, parameters = []) {
  const HEADER = [0xFF, 0xFF, 0xFD, 0x00];
  const INSTRUCTION_STATUS = 0x55;

  const paramArray = Array.isArray(parameters) ? parameters : Array.from(parameters);
  const length = 4 + paramArray.length; // Instruction + Error + Parameters + CRC(2)

  // Build packet without CRC
  const packet = [
    ...HEADER,           // Header: 0xFF 0xFF 0xFD 0x00
    id,                  // Packet ID
    length & 0xFF,       // Length low byte
    (length >> 8) & 0xFF, // Length high byte
    INSTRUCTION_STATUS,  // Status instruction
    error,               // Error byte
    ...paramArray        // Parameters
  ];

  // Calculate CRC for the packet
  const crc = Protocol2.calculateCRC(packet);

  // Add CRC to packet
  packet.push(crc & 0xFF);        // CRC low byte
  packet.push((crc >> 8) & 0xFF); // CRC high byte

  return Buffer.from(packet);
}

describe('DynamixelDevice', () => {
  let device;
  let mockConnection;

  beforeEach(() => {
    // Create a comprehensive mock connection
    mockConnection = {
      ping: jest.fn(),
      sendAndWaitForResponse: jest.fn(),
      readRegister: jest.fn(),
      writeRegister: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true)
    };

    // Create device with mock device info
    device = new DynamixelDevice(1, mockConnection, {
      modelNumber: 1020,
      firmwareVersion: 52,
      modelName: 'XL430-W250'
    });
  });

  describe('Constructor', () => {
    test('should create device with provided info', () => {
      expect(device.id).toBe(1);
      expect(device.modelNumber).toBe(1020);
      expect(device.firmwareVersion).toBe(52);
      expect(device.modelName).toBe('XL430-W250');
    });

    test('should handle missing device info', () => {
      const deviceWithoutInfo = new DynamixelDevice(2, mockConnection);
      expect(deviceWithoutInfo.id).toBe(2);
      expect(deviceWithoutInfo.modelNumber).toBeNull();
      expect(deviceWithoutInfo.firmwareVersion).toBeNull();
    });
  });

  describe('Ping', () => {
    test('should ping device and return response', async() => {
      const expectedResponse = {
        id: 1,
        modelNumber: 1020,
        firmwareVersion: 52,
        error: 0
      };
      mockConnection.ping.mockResolvedValue(expectedResponse);

      const response = await device.ping();

      expect(mockConnection.ping).toHaveBeenCalledWith(1, null);
      expect(response).toEqual(expectedResponse);
    });

    test('should pass timeout to connection', async() => {
      const expectedResponse = { id: 1, modelNumber: 1020, firmwareVersion: 52, error: 0 };
      mockConnection.ping.mockResolvedValue(expectedResponse);

      await device.ping(500);
      expect(mockConnection.ping).toHaveBeenCalledWith(1, 500);
    });
  });

  describe('Read/Write Operations', () => {
    test('should read data from control table', async() => {
      const expectedData = Buffer.from([0x01, 0x02]);
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x01, 0x02])
      );

      const data = await device.read(0x84, 2);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
      expect(data).toEqual(expectedData);
    });

    test('should write data to control table', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      const result = await device.write(0x84, [0x01, 0x02]);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should read byte value', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x42])
      );

      const value = await device.readByte(0x40);

      expect(value).toBe(0x42);
    });

    test('should write byte value', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      const result = await device.writeByte(0x40, 0x42);

      expect(result).toBe(true);
    });

    test('should read word value (little-endian)', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x00, 0x08]) // 2048 in little-endian
      );

      const value = await device.readWord(0x84);

      expect(value).toBe(2048);
    });

    test('should write word value (little-endian)', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      const result = await device.writeWord(0x84, 2048);

      expect(result).toBe(true);
    });
  });

  describe('Torque Control', () => {
    test('should enable torque', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setTorqueEnable(true);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should disable torque', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setTorqueEnable(false);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should get torque status', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [1])
      );

      const status = await device.getTorqueEnable();

      expect(status).toBe(true);
    });
  });

  describe('Position Control', () => {
    test('should set goal position', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setGoalPosition(2048);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should get goal position', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x00, 0x08, 0x00, 0x00]) // 2048 in little-endian
      );

      const position = await device.getGoalPosition();

      expect(position).toBe(2048);
    });

    test('should get present position', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x00, 0x04, 0x00, 0x00]) // 1024 in little-endian
      );

      const position = await device.getPresentPosition();

      expect(position).toBe(1024);
    });
  });

  describe('Velocity Control', () => {
    test('should set goal velocity', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setGoalVelocity(100);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should get present velocity', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x32, 0x00, 0x00, 0x00]) // 50 in little-endian
      );

      const velocity = await device.getPresentVelocity();

      expect(velocity).toBe(50);
    });
  });

  describe('Status Reading', () => {
    test('should read temperature', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [35])
      );

      const temp = await device.getPresentTemperature();

      expect(temp).toBe(35);
    });

    test('should read voltage', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x78, 0x00]) // 120 in little-endian (12.0V)
      );

      const voltage = await device.getPresentVoltage();

      expect(voltage).toBe(120);
    });
  });

  describe('LED Control', () => {
    test('should turn LED on', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setLED(true);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should turn LED off', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setLED(false);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should get LED status', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [1])
      );

      const status = await device.getLED();

      expect(status).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle device errors in read operations', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0x01, []) // Instruction error
      );

      await expect(device.read(0x40, 1)).rejects.toThrow('Device 1 error');
    });

    test('should handle device errors in write operations', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0x02, []) // CRC error
      );

      await expect(device.write(0x40, [1])).rejects.toThrow('Device 1 error');
    });

    test('should emit error events', async() => {
      const errorSpy = jest.fn();
      device.on('error', errorSpy);

      mockConnection.sendAndWaitForResponse.mockRejectedValue(new Error('Connection failed'));

      await expect(device.read(0x40, 1)).rejects.toThrow('Connection failed');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Model Information', () => {
    test('should return model name for known models', () => {
      expect(device.getModelName(1020)).toBe('XL430-W250');
    });

    test('should return unknown for unknown models', () => {
      expect(device.getModelName(9999)).toBe('Unknown (9999)');
    });

    test('should handle missing model number', () => {
      const deviceWithoutModel = new DynamixelDevice(1, mockConnection);
      expect(deviceWithoutModel.getModelName()).toBe('Unknown (undefined)');
    });
  });

  describe('Utility Methods', () => {
    test('should convert position to degrees', () => {
      const degrees = device.positionToDegrees(2048);
      expect(degrees).toBeCloseTo(180, 1);
    });

    test('should convert degrees to position', () => {
      const position = device.degreesToPosition(180);
      expect(position).toBeCloseTo(2048, 0);
    });

    test('should convert velocity to RPM', () => {
      const rpm = device.velocityToRPM(117);
      expect(rpm).toBeCloseTo(26.793, 1); // 117 * 0.229 = 26.793
    });

    test('should convert RPM to velocity', () => {
      const velocity = device.rpmToVelocity(1);
      expect(velocity).toBeCloseTo(4, 0); // Math.round(1 / 0.229) = 4
    });

    test('should convert voltage reading to volts', () => {
      const volts = device.voltageToVolts(120);
      expect(volts).toBeCloseTo(12.0, 1);
    });
  });

  describe('Device Info', () => {
    test('should return device information', () => {
      const info = device.getDeviceInfo();
      expect(info).toMatchObject({
        id: 1,
        modelNumber: 1020,
        firmwareVersion: 52,
        modelName: 'XL430-W250'
      });
    });

    test('should handle missing information', () => {
      const deviceWithoutInfo = new DynamixelDevice(2, mockConnection);
      const info = deviceWithoutInfo.getDeviceInfo();
      expect(info.id).toBe(2);
      expect(info.modelNumber).toBeNull();
    });
  });
});
