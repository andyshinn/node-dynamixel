import { Protocol2 } from '../../src/dynamixel/Protocol2.js';
import { INSTRUCTIONS, BROADCAST_ID, CONTROL_TABLE } from '../../src/dynamixel/constants.js';

describe('GroupSync Operations', () => {
  describe('GroupSyncRead', () => {
    test('should create correct GroupSyncRead packet', () => {
      const deviceIds = [1, 2, 3];
      const startAddress = CONTROL_TABLE.PRESENT_POSITION;
      const dataLength = 4;
      
      const packet = Protocol2.createGroupSyncReadPacket(deviceIds, startAddress, dataLength, true);
      
      // Check header
      expect(packet[0]).toBe(0xFF);
      expect(packet[1]).toBe(0xFF);
      expect(packet[2]).toBe(0xFD);
      expect(packet[3]).toBe(0x00);
      
      // Check broadcast ID
      expect(packet[4]).toBe(BROADCAST_ID);
      
      // Check instruction
      expect(packet[7]).toBe(INSTRUCTIONS.FAST_SYNC_READ);
      
      // Check parameters (start address + data length + device IDs)
      expect(packet[8]).toBe(startAddress & 0xFF); // Start address low
      expect(packet[9]).toBe((startAddress >> 8) & 0xFF); // Start address high
      expect(packet[10]).toBe(dataLength & 0xFF); // Data length low
      expect(packet[11]).toBe((dataLength >> 8) & 0xFF); // Data length high
      expect(packet[12]).toBe(1); // Device ID 1
      expect(packet[13]).toBe(2); // Device ID 2
      expect(packet[14]).toBe(3); // Device ID 3
    });

    test('should create correct SYNC_READ packet when fastSyncRead is false', () => {
      const deviceIds = [1, 2];
      const startAddress = CONTROL_TABLE.PRESENT_VELOCITY;
      const dataLength = 4;
      
      const packet = Protocol2.createGroupSyncReadPacket(deviceIds, startAddress, dataLength, false);
      
      // Check instruction is SYNC_READ instead of FAST_SYNC_READ
      expect(packet[7]).toBe(INSTRUCTIONS.SYNC_READ);
    });

    test('should throw error for empty device IDs array', () => {
      expect(() => {
        Protocol2.createGroupSyncReadPacket([], CONTROL_TABLE.PRESENT_POSITION, 4);
      }).toThrow('deviceIds must be a non-empty array');
    });

    test('should parse GroupSyncRead response correctly', () => {
      const expectedIds = [1, 2];
      const expectedDataLength = 4;
      
      // Create mock response buffer with two status packets
      const device1Response = Protocol2.createInstructionPacket(1, INSTRUCTIONS.STATUS, [0, 10, 20, 30, 40]); // 0 error + 4 data bytes
      const device2Response = Protocol2.createInstructionPacket(2, INSTRUCTIONS.STATUS, [0, 50, 60, 70, 80]); // 0 error + 4 data bytes
      
      const combinedResponse = Buffer.concat([device1Response, device2Response]);
      
      const results = Protocol2.parseGroupSyncReadResponse(combinedResponse, expectedIds, expectedDataLength);
      
      expect(results[1]).toBeDefined();
      expect(results[1].success).toBe(true);
      expect(results[1].data).toEqual(Buffer.from([10, 20, 30, 40]));
      
      expect(results[2]).toBeDefined();
      expect(results[2].success).toBe(true);
      expect(results[2].data).toEqual(Buffer.from([50, 60, 70, 80]));
    });
  });

  describe('GroupSyncWrite', () => {
    test('should create correct GroupSyncWrite packet', () => {
      const writeData = [
        { id: 1, data: [100, 101, 102, 103] },
        { id: 2, data: [200, 201, 202, 203] }
      ];
      const startAddress = CONTROL_TABLE.GOAL_POSITION;
      const dataLength = 4;
      
      const packet = Protocol2.createGroupSyncWritePacket(writeData, startAddress, dataLength);
      
      // Check header
      expect(packet[0]).toBe(0xFF);
      expect(packet[1]).toBe(0xFF);
      expect(packet[2]).toBe(0xFD);
      expect(packet[3]).toBe(0x00);
      
      // Check broadcast ID
      expect(packet[4]).toBe(BROADCAST_ID);
      
      // Check instruction
      expect(packet[7]).toBe(INSTRUCTIONS.SYNC_WRITE);
      
      // Check parameters
      expect(packet[8]).toBe(startAddress & 0xFF); // Start address low
      expect(packet[9]).toBe((startAddress >> 8) & 0xFF); // Start address high
      expect(packet[10]).toBe(dataLength & 0xFF); // Data length low
      expect(packet[11]).toBe((dataLength >> 8) & 0xFF); // Data length high
      
      // Check ID + DATA pairs
      expect(packet[12]).toBe(1); // Device 1 ID
      expect(packet[13]).toBe(100); // Device 1 data[0]
      expect(packet[14]).toBe(101); // Device 1 data[1]
      expect(packet[15]).toBe(102); // Device 1 data[2]
      expect(packet[16]).toBe(103); // Device 1 data[3]
      
      expect(packet[17]).toBe(2); // Device 2 ID
      expect(packet[18]).toBe(200); // Device 2 data[0]
      expect(packet[19]).toBe(201); // Device 2 data[1]
      expect(packet[20]).toBe(202); // Device 2 data[2]
      expect(packet[21]).toBe(203); // Device 2 data[3]
    });

    test('should throw error for empty writeData array', () => {
      expect(() => {
        Protocol2.createGroupSyncWritePacket([], CONTROL_TABLE.GOAL_POSITION, 4);
      }).toThrow('writeData must be a non-empty array');
    });

    test('should throw error for missing id or data properties', () => {
      expect(() => {
        Protocol2.createGroupSyncWritePacket([{ id: 1 }], CONTROL_TABLE.GOAL_POSITION, 4);
      }).toThrow('Each writeData item must have id and data properties');
      
      expect(() => {
        Protocol2.createGroupSyncWritePacket([{ data: [1, 2, 3, 4] }], CONTROL_TABLE.GOAL_POSITION, 4);
      }).toThrow('Each writeData item must have id and data properties');
    });

    test('should throw error for data length mismatch', () => {
      expect(() => {
        Protocol2.createGroupSyncWritePacket([
          { id: 1, data: [1, 2, 3] } // Only 3 bytes, expected 4
        ], CONTROL_TABLE.GOAL_POSITION, 4);
      }).toThrow('Data length mismatch for ID 1: expected 4, got 3');
    });

    test('should accept Buffer data', () => {
      const writeData = [
        { id: 1, data: Buffer.from([100, 101, 102, 103]) }
      ];
      
      expect(() => {
        Protocol2.createGroupSyncWritePacket(writeData, CONTROL_TABLE.GOAL_POSITION, 4);
      }).not.toThrow();
    });
  });
});