import { DynamixelDevice } from '../../src/dynamixel/DynamixelDevice.js';
import { getControlTableItem } from '../../src/dynamixel/constants.js';

// Mock connection for testing
class MockConnection {
  constructor() {
    this.responses = new Map();
    this.writes = [];
  }

  setResponse(address, data) {
    this.responses.set(address, Buffer.from(data));
  }

  async sendAndWaitForResponse(_packet) {
    // Mock response - create a valid status packet with no error
    const { Protocol2 } = await import('../../src/dynamixel/Protocol2.js');
    const { INSTRUCTIONS } = await import('../../src/dynamixel/constants.js');
    return Protocol2.createInstructionPacket(1, INSTRUCTIONS.STATUS, [0]); // Status packet with no error
  }

  async send(packet) {
    this.writes.push(packet);
  }
}

describe('Indirect Addressing', () => {
  let device;
  let connection;

  beforeEach(() => {
    connection = new MockConnection();
    device = new DynamixelDevice(1, connection, { modelNumber: 1060, modelName: 'XL330-M077' });
  });

  describe('Control Table Helper', () => {
    test('should get control table item by name', () => {
      const item = getControlTableItem('PRESENT_POSITION');
      expect(item).toEqual({
        address: 132,
        size: 4
      });
    });

    test('should return null for unknown item', () => {
      const item = getControlTableItem('UNKNOWN_ITEM');
      expect(item).toBeNull();
    });
  });

  describe('Enhanced Indirect Read Block', () => {
    test('should setup indirect read block with control table items', async() => {
      const items = ['PRESENT_POSITION', 'PRESENT_VELOCITY', 'REALTIME_TICK'];
      
      const block = await device.setupIndirectReadBlock(items);
      
      expect(block.items).toEqual(items);
      expect(block.totalSize).toBe(4 + 4 + 2); // position (4) + velocity (4) + tick (2)
      expect(block.itemMap.PRESENT_POSITION.size).toBe(4);
      expect(block.itemMap.PRESENT_VELOCITY.size).toBe(4);
      expect(block.itemMap.REALTIME_TICK.size).toBe(2);
    });

    test('should throw error for unknown control table item', async() => {
      await expect(device.setupIndirectReadBlock(['UNKNOWN_ITEM'])).rejects.toThrow('Unknown control table item: UNKNOWN_ITEM');
    });

    test('should throw error if total size exceeds maximum', async() => {
      // Create an array of items that would exceed 20 bytes
      const items = Array(21).fill('PRESENT_POSITION'); // 21 * 4 = 84 bytes > 20 max
      
      await expect(device.setupIndirectReadBlock(items)).rejects.toThrow('Total size 84 exceeds maximum indirect entries 20');
    });

    test('should clear existing read block when setting up new one', async() => {
      await device.setupIndirectReadBlock(['PRESENT_POSITION']);
      expect(device.indirectReadBlock).toBeDefined();
      
      await device.setupIndirectReadBlock(['PRESENT_VELOCITY']);
      expect(device.indirectReadBlock.items).toEqual(['PRESENT_VELOCITY']);
    });
  });

  describe('Enhanced Indirect Write Block', () => {
    test('should setup indirect write block with control table items', async() => {
      const blockName = 'control_gains';
      const items = ['POSITION_P_GAIN', 'POSITION_I_GAIN', 'POSITION_D_GAIN'];
      
      const block = await device.setupIndirectWriteBlock(blockName, items);
      
      expect(block.name).toBe(blockName);
      expect(block.items).toEqual(items);
      expect(block.totalSize).toBe(2 + 2 + 2); // All gains are 2 bytes each
      expect(device.indirectWriteBlocks.has(blockName)).toBe(true);
    });

    test('should calculate correct start index avoiding read block', async() => {
      // Setup read block first
      await device.setupIndirectReadBlock(['PRESENT_POSITION']); // 4 bytes
      
      // Setup write block
      const block = await device.setupIndirectWriteBlock('test', ['GOAL_POSITION']);
      
      expect(block.startIndex).toBe(4); // Should start after read block
      expect(block.dataStartAddress).toBe(208 + 4); // DATA_BASE_ADDRESS + offset
    });

    test('should throw error if total size would exceed maximum', async() => {
      // Fill up most of the space with read block
      await device.setupIndirectReadBlock(['PRESENT_POSITION', 'PRESENT_VELOCITY']); // 8 bytes
      
      // Try to add write block that would exceed 20 total
      const items = Array(13).fill('GOAL_POSITION'); // 13 * 4 = 52 bytes, total would be 60 > 20 max
      
      await expect(device.setupIndirectWriteBlock('test', items)).rejects.toThrow('Total size would exceed maximum indirect entries');
    });
  });

  describe('Block Information', () => {
    test('should return correct block information', async() => {
      await device.setupIndirectReadBlock(['PRESENT_POSITION']);
      await device.setupIndirectWriteBlock('gains', ['POSITION_P_GAIN', 'POSITION_I_GAIN']);
      
      const info = device.getIndirectBlockInfo();
      
      expect(info.readBlock).toBeDefined();
      expect(info.readBlock.items).toEqual(['PRESENT_POSITION']);
      expect(info.readBlock.totalSize).toBe(4);
      
      expect(info.writeBlocks).toHaveLength(1);
      expect(info.writeBlocks[0].name).toBe('gains');
      expect(info.writeBlocks[0].totalSize).toBe(4);
      
      expect(info.availableEntries).toBe(20 - 4 - 4); // 20 - read block - write block
    });

    test('should calculate total used indirect entries correctly', () => {
      // Initially no blocks
      expect(device.getTotalUsedIndirectEntries()).toBe(0);
    });
  });

  describe('Block Operations', () => {
    test('should clear read block', async() => {
      await device.setupIndirectReadBlock(['PRESENT_POSITION']);
      expect(device.indirectReadBlock).toBeDefined();
      
      await device.clearIndirectReadBlock();
      expect(device.indirectReadBlock).toBeNull();
    });

    test('should clear write block', async() => {
      await device.setupIndirectWriteBlock('test', ['GOAL_POSITION']);
      expect(device.indirectWriteBlocks.has('test')).toBe(true);
      
      await device.clearIndirectWriteBlock('test');
      expect(device.indirectWriteBlocks.has('test')).toBe(false);
    });

    test('should handle clearing non-existent blocks gracefully', async() => {
      expect(await device.clearIndirectReadBlock()).toBe(true);
      expect(await device.clearIndirectWriteBlock('non-existent')).toBe(true);
    });
  });

  describe('Write Block Operations', () => {
    test('should require all values for write block', async() => {
      await device.setupIndirectWriteBlock('gains', ['POSITION_P_GAIN', 'POSITION_I_GAIN']);
      
      // Missing POSITION_I_GAIN value
      await expect(device.writeIndirectBlock('gains', {
        POSITION_P_GAIN: 100
      })).rejects.toThrow('Missing value for control table item: POSITION_I_GAIN');
    });

    test('should reject unknown control table items in values', async() => {
      await device.setupIndirectWriteBlock('test', ['POSITION_P_GAIN']);
      
      await expect(device.writeIndirectBlock('test', {
        POSITION_P_GAIN: 100,
        UNKNOWN_ITEM: 200
      })).rejects.toThrow('Control table item \'UNKNOWN_ITEM\' not in block \'test\'');
    });

    test('should throw error for non-existent write block', async() => {
      await expect(device.writeIndirectBlock('non-existent', {})).rejects.toThrow('Indirect write block \'non-existent\' not found');
    });
  });

  describe('Static Group Operations', () => {
    test('should validate devices array for group sync read', async() => {
      await expect(DynamixelDevice.groupSyncReadIndirect([])).rejects.toThrow('devices must be a non-empty array');
    });

    test('should require read block configuration for group sync read', async() => {
      const device1 = new DynamixelDevice(1, connection);
      
      await expect(DynamixelDevice.groupSyncReadIndirect([device1])).rejects.toThrow('Devices must have indirect read block configured');
    });

    test('should validate devices array for group sync write', async() => {
      await expect(DynamixelDevice.groupSyncWriteIndirect([])).rejects.toThrow('deviceData must be a non-empty array');
    });

    test('should require write block for group sync write', async() => {
      const device1 = new DynamixelDevice(1, connection);
      
      await expect(DynamixelDevice.groupSyncWriteIndirect([
        { device: device1, blockName: 'non-existent', values: {} }
      ])).rejects.toThrow('Device 1 does not have write block \'non-existent\'');
    });
  });
});