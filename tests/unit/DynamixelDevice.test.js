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

  describe('Current Control', () => {
    test('should set goal current', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      await device.setGoalCurrent(500);

      expect(mockConnection.sendAndWaitForResponse).toHaveBeenCalled();
    });

    test('should get goal current', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0xF4, 0x01]) // 500 in little-endian
      );

      const current = await device.getGoalCurrent();

      expect(current).toBe(500);
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

    test('should read realtime tick', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x34, 0x12]) // 4660 in little-endian (0x1234)
      );

      const tick = await device.getRealtimeTick();

      expect(tick).toBe(4660);
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

  describe('Indirect Addressing', () => {
    test('should setup indirect address mapping', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      const result = await device.setupIndirectAddress(0, 132); // Present position address
      
      expect(result).toBe(true);
      expect(device.indirectMappings.has(0)).toBe(true);
      expect(device.indirectMappings.get(0)).toBe(132);
    });

    test('should reject invalid indirect address index', async() => {
      await expect(device.setupIndirectAddress(-1, 132)).rejects.toThrow('Indirect address index -1 out of range');
      await expect(device.setupIndirectAddress(20, 132)).rejects.toThrow('Indirect address index 20 out of range');
    });

    test('should reject invalid target address', async() => {
      await expect(device.setupIndirectAddress(0, 50)).rejects.toThrow('Target address 50 out of valid range');
      await expect(device.setupIndirectAddress(0, 300)).rejects.toThrow('Target address 300 out of valid range');
    });

    test('should write data through indirect addressing', async() => {
      // First setup mapping
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);

      // Then write data
      const result = await device.writeIndirectData(0, 0x42);
      
      expect(result).toBe(true);
    });

    test('should read data through indirect addressing', async() => {
      // First setup mapping
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);

      // Then read data
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x42])
      );
      
      const value = await device.readIndirectData(0);
      
      expect(value).toBe(0x42);
    });

    test('should reject indirect operations without mapping', async() => {
      await expect(device.writeIndirectData(0, 0x42)).rejects.toThrow('Indirect address index 0 not mapped');
      await expect(device.readIndirectData(0)).rejects.toThrow('Indirect address index 0 not mapped');
    });

    test('should bulk read contiguous indirect addresses', async() => {
      // Setup mappings
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132); // Present position
      await device.setupIndirectAddress(1, 146); // Temperature
      await device.setupIndirectAddress(2, 122); // Moving

      // Mock bulk read response
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [0x01, 0x23, 0x00]) // 3 bytes of data
      );

      const results = await device.bulkReadIndirect([0, 1, 2]);
      
      expect(results[0]).toBe(0x01);
      expect(results[1]).toBe(0x23);
      expect(results[2]).toBe(0x00);
    });

    test('should bulk read non-contiguous indirect addresses', async() => {
      // Setup mappings
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);
      await device.setupIndirectAddress(5, 146);

      // Reset mock and setup individual read responses for non-contiguous reads
      mockConnection.sendAndWaitForResponse.mockReset();
      mockConnection.sendAndWaitForResponse
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x01]))  // Read for index 0
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x23])); // Read for index 5

      const results = await device.bulkReadIndirect([0, 5]);
      
      expect(results[0]).toBe(0x01);
      expect(results[5]).toBe(0x23);
    });

    test('should bulk read LED, Goal Current, and Velocity Trajectory (contiguous indirect)', async() => {
      // Setup mappings for LED (65), Goal Current (102), Velocity Trajectory (136)
      // Map to contiguous indirect indices for efficient single bulk read
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 65);  // LED
      await device.setupIndirectAddress(1, 102); // Goal Current (byte 0)
      await device.setupIndirectAddress(2, 103); // Goal Current (byte 1)
      await device.setupIndirectAddress(3, 136); // Velocity Trajectory (byte 0)
      await device.setupIndirectAddress(4, 137); // Velocity Trajectory (byte 1)
      await device.setupIndirectAddress(5, 138); // Velocity Trajectory (byte 2)
      await device.setupIndirectAddress(6, 139); // Velocity Trajectory (byte 3)

      // Reset mock and setup single contiguous bulk read response
      mockConnection.sendAndWaitForResponse.mockReset();
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [
          0x01,  // LED on
          0x64,  // Goal Current low byte (100)
          0x00,  // Goal Current high byte
          0x32,  // Velocity Trajectory byte 0 (50)
          0x00,  // Velocity Trajectory byte 1
          0x00,  // Velocity Trajectory byte 2
          0x00   // Velocity Trajectory byte 3
        ])
      );

      const results = await device.bulkReadIndirect([0, 1, 2, 3, 4, 5, 6]);
      
      // Verify LED status
      expect(results[0]).toBe(0x01); // LED on
      
      // Verify Goal Current (2-byte little-endian: 0x64 + 0x00 = 100)
      const goalCurrent = results[1] | (results[2] << 8);
      expect(goalCurrent).toBe(100);
      
      // Verify Velocity Trajectory (4-byte little-endian: 0x32 + 0x00 + 0x00 + 0x00 = 50)
      const velocityTrajectory = results[3] | (results[4] << 8) | (results[5] << 16) | (results[6] << 24);
      expect(velocityTrajectory).toBe(50);
    });

    test('should bulk write contiguous indirect addresses', async() => {
      // Setup mappings
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 100); // Goal PWM
      await device.setupIndirectAddress(1, 101);

      const result = await device.bulkWriteIndirect({ 0: 0x10, 1: 0x20 });
      
      expect(result).toBe(true);
    });

    test('should clear indirect mapping', async() => {
      // Setup mapping first
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);
      expect(device.indirectMappings.has(0)).toBe(true);

      // Clear mapping
      const result = await device.clearIndirectMapping(0);
      
      expect(result).toBe(true);
      expect(device.indirectMappings.has(0)).toBe(false);
    });

    test('should clear all indirect mappings', async() => {
      // Setup multiple mappings
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);
      await device.setupIndirectAddress(1, 146);
      expect(device.indirectMappings.size).toBe(2);

      // Clear all mappings - mock 20 responses for clearing all slots
      for (let i = 0; i < 20; i++) {
        mockConnection.sendAndWaitForResponse.mockResolvedValue(
          createStatusPacketBuffer(1, 0, [])
        );
      }

      const result = await device.clearAllIndirectMappings();
      
      expect(result).toBe(true);
      expect(device.indirectMappings.size).toBe(0);
    });

    test('should get indirect mappings copy', () => {
      device.indirectMappings.set(0, 132);
      device.indirectMappings.set(1, 146);

      const mappings = device.getIndirectMappings();
      
      expect(mappings.size).toBe(2);
      expect(mappings.get(0)).toBe(132);
      expect(mappings.get(1)).toBe(146);
      
      // Verify it's a copy, not the original
      expect(mappings).not.toBe(device.indirectMappings);
    });

    test('should setup common indirect mappings', async() => {
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );

      const result = await device.setupCommonIndirectMappings();
      
      expect(result).toBe(true);
      expect(device.indirectMappings.size).toBe(5);
      expect(device.indirectMappings.get(0)).toBe(132); // Present position
      expect(device.indirectMappings.get(4)).toBe(128); // Present velocity
      expect(device.indirectMappings.get(8)).toBe(124); // Present PWM
      expect(device.indirectMappings.get(10)).toBe(146); // Temperature
      expect(device.indirectMappings.get(11)).toBe(122); // Moving
    });

    test('should read common status through indirect addressing', async() => {
      // Setup mappings first
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupCommonIndirectMappings();

      // Reset mock and setup individual read responses for non-contiguous indices [0, 4, 8, 10, 11]
      mockConnection.sendAndWaitForResponse.mockReset();
      mockConnection.sendAndWaitForResponse
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x10]))  // index 0 - position
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x20]))  // index 4 - velocity
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x30]))  // index 8 - pwm
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x25]))  // index 10 - temperature
        .mockResolvedValueOnce(createStatusPacketBuffer(1, 0, [0x01])); // index 11 - moving

      const status = await device.readCommonStatus();
      
      expect(status.position).toBe(0x10);
      expect(status.velocity).toBe(0x20);
      expect(status.pwm).toBe(0x30);
      expect(status.temperature).toBe(0x25);
      expect(status.moving).toBe(0x01);
    });

    test('should validate bulk write mappings object', async() => {
      await expect(device.bulkWriteIndirect(null)).rejects.toThrow('Mappings must be an object');
      await expect(device.bulkWriteIndirect('invalid')).rejects.toThrow('Mappings must be an object');
    });

    test('should validate bulk write values', async() => {
      // Setup mapping
      mockConnection.sendAndWaitForResponse.mockResolvedValue(
        createStatusPacketBuffer(1, 0, [])
      );
      await device.setupIndirectAddress(0, 132);

      await expect(device.bulkWriteIndirect({ 0: -1 })).rejects.toThrow('Invalid value -1 for index 0');
      await expect(device.bulkWriteIndirect({ 0: 256 })).rejects.toThrow('Invalid value 256 for index 0');
      await expect(device.bulkWriteIndirect({ 0: 'invalid' })).rejects.toThrow('Invalid value invalid for index 0');
    });

    test('should validate bulk read indices array', async() => {
      await expect(device.bulkReadIndirect(null)).rejects.toThrow('Indices must be a non-empty array');
      await expect(device.bulkReadIndirect([])).rejects.toThrow('Indices must be a non-empty array');
      await expect(device.bulkReadIndirect('invalid')).rejects.toThrow('Indices must be a non-empty array');
    });
  });
});
