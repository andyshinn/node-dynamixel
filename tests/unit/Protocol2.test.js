import { describe, test, expect } from '@jest/globals';
import { Protocol2 } from '../../src/dynamixel/Protocol2.js';

describe('Protocol2', () => {
  describe('CRC Calculation', () => {
    test('should calculate CRC correctly for known test cases', () => {
      // Test case from official ROBOTIS documentation
      // PING packet: FF FF FD 00 01 03 00 01 19 4E
      const pingData = [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x03, 0x00, 0x01];
      const expectedCRC = 0x4E19;

      const calculatedCRC = Protocol2.calculateCRC(pingData);
      expect(calculatedCRC).toBe(expectedCRC);
    });

    test('should calculate CRC for READ instruction packet', () => {
      // From ROBOTIS documentation example
      // Read 2 bytes from address 0x0000
      const readData = [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x07, 0x00, 0x02, 0x00, 0x00, 0x02, 0x00];
      const calculatedCRC = Protocol2.calculateCRC(readData);

      // Should return a 16-bit value
      expect(calculatedCRC).toBeGreaterThanOrEqual(0);
      expect(calculatedCRC).toBeLessThanOrEqual(0xFFFF);
    });

    test('should handle empty data', () => {
      const crc = Protocol2.calculateCRC([]);
      expect(crc).toBe(0);
    });

    test('should handle single byte', () => {
      const crc = Protocol2.calculateCRC([0x01]);
      expect(crc).toBe(0x8005); // From CRC table
    });

    test('should be consistent across multiple calls', () => {
      const data = [0x01, 0x02, 0x03, 0x04];
      const crc1 = Protocol2.calculateCRC(data);
      const crc2 = Protocol2.calculateCRC(data);
      expect(crc1).toBe(crc2);
    });
  });

  describe('Packet Creation', () => {
    test('should create PING packet correctly', () => {
      const packet = Protocol2.createPingPacket(1);

      // Check packet structure
      expect(packet).toBeInstanceOf(Buffer);
      expect(packet.length).toBe(10); // Header(4) + ID(1) + Length(2) + Instruction(1) + CRC(2)

      // Check header
      expect(packet[0]).toBe(0xFF);
      expect(packet[1]).toBe(0xFF);
      expect(packet[2]).toBe(0xFD);
      expect(packet[3]).toBe(0x00);

      // Check ID
      expect(packet[4]).toBe(1);

      // Check length (3 = instruction + CRC)
      expect(packet[5]).toBe(3); // Length low byte
      expect(packet[6]).toBe(0); // Length high byte

      // Check instruction (PING = 0x01)
      expect(packet[7]).toBe(0x01);

      // Check CRC is present (last 2 bytes)
      expect(packet[8]).toBeDefined();
      expect(packet[9]).toBeDefined();
    });

    test('should create instruction packet with parameters', () => {
      const params = [0x00, 0x01, 0x02];
      const packet = Protocol2.createInstructionPacket(5, 0x03, params);

      expect(packet).toBeInstanceOf(Buffer);
      expect(packet.length).toBe(13); // Header(4) + ID(1) + Length(2) + Instruction(1) + Params(3) + CRC(2)

      // Check ID
      expect(packet[4]).toBe(5);

      // Check length (6 = instruction + params + CRC)
      expect(packet[5]).toBe(6);
      expect(packet[6]).toBe(0);

      // Check instruction
      expect(packet[7]).toBe(0x03);

      // Check parameters
      expect(packet[8]).toBe(0x00);
      expect(packet[9]).toBe(0x01);
      expect(packet[10]).toBe(0x02);
    });

    test('should handle broadcast ID', () => {
      const packet = Protocol2.createPingPacket(0xFE);
      expect(packet[4]).toBe(0xFE);
    });

    test('should handle empty parameters', () => {
      const packet = Protocol2.createInstructionPacket(1, 0x01, []);
      expect(packet.length).toBe(10); // Same as PING packet
    });
  });

  describe('Packet Parsing', () => {
    test('should parse valid status packet', () => {
      // Create a mock status packet
      const mockPacket = Buffer.from([
        0xFF, 0xFF, 0xFD, 0x00, // Header
        0x01,                   // ID
        0x07, 0x00,            // Length (7)
        0x55,                   // Instruction (STATUS)
        0x00,                   // Error
        0xB0, 0x04, 0x34,      // Parameters (model number + firmware)
        0x00, 0x00             // CRC placeholder
      ]);

      // Calculate and set correct CRC
      const crcData = Array.from(mockPacket.slice(0, -2));
      const crc = Protocol2.calculateCRC(crcData);
      mockPacket[mockPacket.length - 2] = crc & 0xFF;
      mockPacket[mockPacket.length - 1] = (crc >> 8) & 0xFF;

      const parsed = Protocol2.parseStatusPacket(mockPacket);

      expect(parsed).toBeDefined();
      expect(parsed.id).toBe(1);
      expect(parsed.instruction).toBe(0x55);
      expect(parsed.error).toBe(0);
      expect(parsed.parameters).toEqual([0xB0, 0x04, 0x34]);
      expect(parsed.length).toBe(7);
    });

    test('should reject packet with invalid header', () => {
      const invalidPacket = Buffer.from([
        0xFE, 0xFF, 0xFD, 0x00, // Invalid header
        0x01, 0x07, 0x00, 0x55, 0x00,
        0x00, 0x00
      ]);

      const parsed = Protocol2.parseStatusPacket(invalidPacket);
      expect(parsed).toBeNull();
    });

    test('should reject packet with incorrect CRC', () => {
      const invalidCrcPacket = Buffer.from([
        0xFF, 0xFF, 0xFD, 0x00,
        0x01, 0x07, 0x00, 0x55, 0x00,
        0xB0, 0x04, 0x34,
        0xFF, 0xFF // Wrong CRC
      ]);

      expect(() => {
        Protocol2.parseStatusPacket(invalidCrcPacket);
      }).toThrow('CRC mismatch');
    });

    test('should reject incomplete packets', () => {
      const shortPacket = Buffer.from([0xFF, 0xFF, 0xFD]);
      const parsed = Protocol2.parseStatusPacket(shortPacket);
      expect(parsed).toBeNull();
    });
  });

  describe('PING Response Parsing', () => {
    test('should parse PING response correctly', () => {
      const mockStatusPacket = {
        id: 1,
        instruction: 0x55, // STATUS
        error: 0,
        parameters: [0xB0, 0x04, 0x34], // Model 1200, FW 52
        length: 7
      };

      const deviceInfo = Protocol2.parsePingResponse(mockStatusPacket);

      expect(deviceInfo).toBeDefined();
      expect(deviceInfo.id).toBe(1);
      expect(deviceInfo.modelNumber).toBe(1200); // 0x04B0
      expect(deviceInfo.firmwareVersion).toBe(52); // 0x34
      expect(deviceInfo.error).toBe(0);
    });

    test('should reject non-status packets', () => {
      const nonStatusPacket = {
        id: 1,
        instruction: 0x01, // PING, not STATUS
        error: 0,
        parameters: [],
        length: 3
      };

      const deviceInfo = Protocol2.parsePingResponse(nonStatusPacket);
      expect(deviceInfo).toBeNull();
    });

    test('should reject packets with insufficient parameters', () => {
      const shortParamsPacket = {
        id: 1,
        instruction: 0x55,
        error: 0,
        parameters: [0xB0], // Only 1 byte instead of 3
        length: 4
      };

      const deviceInfo = Protocol2.parsePingResponse(shortParamsPacket);
      expect(deviceInfo).toBeNull();
    });
  });

  describe('Packet Length Detection', () => {
    test('should detect complete packet length', () => {
      const completePacket = Buffer.from([
        0xFF, 0xFF, 0xFD, 0x00,
        0x01, 0x03, 0x00, 0x01,
        0x19, 0x4E
      ]);

      const length = Protocol2.getCompletePacketLength(completePacket);
      expect(length).toBe(10);
    });

    test('should return 0 for incomplete packets', () => {
      const incompletePacket = Buffer.from([0xFF, 0xFF, 0xFD, 0x00, 0x01]);
      const length = Protocol2.getCompletePacketLength(incompletePacket);
      expect(length).toBe(0);
    });

    test('should return 0 for invalid header', () => {
      const invalidHeader = Buffer.from([0xFE, 0xFF, 0xFD, 0x00, 0x01, 0x03, 0x00]);
      const length = Protocol2.getCompletePacketLength(invalidHeader);
      expect(length).toBe(0);
    });
  });

  describe('Error Descriptions', () => {
    test('should return "No Error" for error code 0', () => {
      const description = Protocol2.getErrorDescription(0);
      expect(description).toBe('No Error');
    });

    test('should describe single error flags', () => {
      expect(Protocol2.getErrorDescription(0x01)).toContain('Result Fail');
      expect(Protocol2.getErrorDescription(0x02)).toContain('Instruction Error');
      expect(Protocol2.getErrorDescription(0x03)).toContain('CRC Error');
    });

    test('should describe multiple error flags', () => {
      const description = Protocol2.getErrorDescription(0x03); // Result Fail + Instruction Error
      expect(description).toContain('Result Fail');
      expect(description).toContain('Instruction Error');
    });
  });
});
