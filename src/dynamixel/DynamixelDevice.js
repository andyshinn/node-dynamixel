import { EventEmitter } from 'events';
import { Protocol2 } from './Protocol2.js';
import { INSTRUCTIONS, CONTROL_TABLE, INDIRECT_ADDRESS, getControlTableItem } from './constants.js';

/**
 * Individual DYNAMIXEL Device
 * Represents a single DYNAMIXEL motor with its specific capabilities
 */
export class DynamixelDevice extends EventEmitter {
  constructor(id, connection, deviceInfo = {}) {
    super();

    this.id = id;
    this.connection = connection;
    this.modelNumber = deviceInfo.modelNumber || null;
    this.firmwareVersion = deviceInfo.firmwareVersion || null;
    this.modelName = deviceInfo.modelName || null;
    this.lastError = null;

    // Indirect addressing state
    this.indirectMappings = new Map();
    this.indirectReadBlock = null;
    this.indirectWriteBlocks = new Map();

    // Determine model name if not provided
    if (!this.modelName && this.modelNumber) {
      this.modelName = this.getModelName(this.modelNumber);
    }
  }

  /**
   * Ping this device to check if it's responsive
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} - Device information
   */
  async ping(timeout = null) {
    try {
      const deviceInfo = await this.connection.ping(this.id, timeout);

      // Update device info
      this.modelNumber = deviceInfo.modelNumber;
      this.firmwareVersion = deviceInfo.firmwareVersion;
      this.modelName = this.getModelName(this.modelNumber);
      this.lastError = deviceInfo.error;

      return deviceInfo;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Read data from the device's control table
   * @param {number} address - Control table address
   * @param {number} length - Number of bytes to read
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Buffer>} - Read data
   */
  async read(address, length, timeout = null) {
    const parameters = [
      address & 0xFF,         // Address low byte
      (address >> 8) & 0xFF,  // Address high byte
      length & 0xFF,          // Length low byte
      (length >> 8) & 0xFF    // Length high byte
    ];

    const packet = Protocol2.createInstructionPacket(this.id, INSTRUCTIONS.READ, parameters);

    try {
      const response = await this.connection.sendAndWaitForResponse(packet, this.id, timeout);

      // First parse the raw buffer into a status packet
      const statusPacket = Protocol2.parseStatusPacket(response);
      if (!statusPacket) {
        throw new Error(`Invalid response from device ${this.id}`);
      }

      if (statusPacket.error !== 0) {
        const errorMsg = Protocol2.getErrorDescription(statusPacket.error);
        throw new Error(`Device ${this.id} error: ${errorMsg}`);
      }

      return Buffer.from(statusPacket.parameters);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Write data to the device's control table
   * @param {number} address - Control table address
   * @param {Buffer|Array} data - Data to write
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - Success status
   */
  async write(address, data, timeout = null) {
    const dataArray = Array.isArray(data) ? data : Array.from(data);
    const parameters = [
      address & 0xFF,         // Address low byte
      (address >> 8) & 0xFF,  // Address high byte
      ...dataArray            // Data bytes
    ];

    const packet = Protocol2.createInstructionPacket(this.id, INSTRUCTIONS.WRITE, parameters);

    try {
      const response = await this.connection.sendAndWaitForResponse(packet, this.id, timeout);

      // First parse the raw buffer into a status packet
      const statusPacket = Protocol2.parseStatusPacket(response);
      if (!statusPacket) {
        throw new Error(`Invalid response from device ${this.id}`);
      }

      if (statusPacket.error !== 0) {
        const errorMsg = Protocol2.getErrorDescription(statusPacket.error);
        throw new Error(`Device ${this.id} error: ${errorMsg}`);
      }

      return true;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get realtime tick
   * @returns {Promise<number>} - timestamp in ms (rolls over at 32767)
   */
  async getRealtimeTick() {
    return await this.readWord(CONTROL_TABLE.REALTIME_TICK);
  }

  /**
   * Read a 1-byte value from control table
   * @param {number} address - Control table address
   * @returns {Promise<number>} - 8-bit value
   */
  async readByte(address) {
    const data = await this.read(address, 1);
    return data[0];
  }

  /**
   * Read a 2-byte value from control table (little-endian)
   * @param {number} address - Control table address
   * @returns {Promise<number>} - 16-bit value
   */
  async readWord(address) {
    const data = await this.read(address, 2);
    return data[0] | (data[1] << 8);
  }

  /**
   * Read a 4-byte value from control table (little-endian)
   * @param {number} address - Control table address
   * @returns {Promise<number>} - 32-bit value
   */
  async readDWord(address) {
    const data = await this.read(address, 4);
    return data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
  }

  /**
   * Write a 1-byte value to control table
   * @param {number} address - Control table address
   * @param {number} value - 8-bit value
   * @returns {Promise<boolean>} - Success status
   */
  async writeByte(address, value) {
    return await this.write(address, [value & 0xFF]);
  }

  /**
   * Write a 2-byte value to control table (little-endian)
   * @param {number} address - Control table address
   * @param {number} value - 16-bit value
   * @returns {Promise<boolean>} - Success status
   */
  async writeWord(address, value) {
    return await this.write(address, [value & 0xFF, (value >> 8) & 0xFF]);
  }

  /**
   * Write a 4-byte value to control table (little-endian)
   * @param {number} address - Control table address
   * @param {number} value - 32-bit value
   * @returns {Promise<boolean>} - Success status
   */
  async writeDWord(address, value) {
    return await this.write(address, [
      value & 0xFF,
      (value >> 8) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 24) & 0xFF
    ]);
  }

  // Convenience methods for common control table operations

  /**
   * Enable/disable torque
   * @param {boolean} enable - True to enable, false to disable
   * @returns {Promise<boolean>} - Success status
   */
  async setTorqueEnable(enable) {
    return await this.writeByte(CONTROL_TABLE.TORQUE_ENABLE, enable ? 1 : 0);
  }

  /**
   * Get torque enable status
   * @returns {Promise<boolean>} - Torque enable status
   */
  async getTorqueEnable() {
    const value = await this.readByte(CONTROL_TABLE.TORQUE_ENABLE);
    return value === 1;
  }

  /**
   * Set goal position
   * @param {number} position - Goal position (0-4095 for most models)
   * @returns {Promise<boolean>} - Success status
   */
  async setGoalPosition(position) {
    return await this.writeDWord(CONTROL_TABLE.GOAL_POSITION, position);
  }

  /**
   * Get goal position
   * @returns {Promise<number>} - Goal position
   */
  async getGoalPosition() {
    return await this.readDWord(CONTROL_TABLE.GOAL_POSITION);
  }

  /**
   * Get present position
   * @returns {Promise<number>} - Present position
   */
  async getPresentPosition() {
    return await this.readDWord(CONTROL_TABLE.PRESENT_POSITION);
  }

  /**
   * Set goal velocity
   * @param {number} velocity - Goal velocity
   * @returns {Promise<boolean>} - Success status
   */
  async setGoalVelocity(velocity) {
    return await this.writeDWord(CONTROL_TABLE.GOAL_VELOCITY, velocity);
  }

  /**
   * Get goal velocity
   * @returns {Promise<number>} - Goal velocity
   */
  async getGoalVelocity() {
    return await this.readDWord(CONTROL_TABLE.GOAL_VELOCITY);
  }

  /**
   * Get present velocity
   * @returns {Promise<number>} - Present velocity
   */
  async getPresentVelocity() {
    return await this.readDWord(CONTROL_TABLE.PRESENT_VELOCITY);
  }

  /**
   * Set goal PWM
   * @param {number} pwm - Goal PWM value
   * @returns {Promise<boolean>} - Success status
   */
  async setGoalPWM(pwm) {
    return await this.writeWord(CONTROL_TABLE.GOAL_PWM, pwm);
  }

  /**
   * Get present PWM
   * @returns {Promise<number>} - Present PWM
   */
  async getPresentPWM() {
    return await this.readWord(CONTROL_TABLE.PRESENT_PWM);
  }

  /**
   * Get present temperature
   * @returns {Promise<number>} - Temperature in Celsius
   */
  async getPresentTemperature() {
    return await this.readByte(CONTROL_TABLE.PRESENT_TEMPERATURE);
  }

  /**
   * Set goal current
   * @param {number} current - Goal current (0-max mA)
   * @returns {Promise<boolean>} - Success status
   */
  async setGoalCurrent(current) {
    return await this.writeWord(CONTROL_TABLE.GOAL_CURRENT, current);
  }

  /**
   * Get goal current
   * @returns {Promise<number>} - Current in mA
   */
  async getGoalCurrent() {
    return await this.readWord(CONTROL_TABLE.GOAL_CURRENT);
  }

  /**
   * Get present voltage
   * @returns {Promise<number>} - Voltage in 0.1V units
   */
  async getPresentVoltage() {
    return await this.readWord(CONTROL_TABLE.PRESENT_INPUT_VOLTAGE);
  }

  /**
   * Set LED state
   * @param {boolean} on - True to turn on, false to turn off
   * @returns {Promise<boolean>} - Success status
   */
  async setLED(on) {
    return await this.writeByte(CONTROL_TABLE.LED, on ? 1 : 0);
  }

  /**
   * Get LED state
   * @returns {Promise<boolean>} - LED state
   */
  async getLED() {
    const value = await this.readByte(CONTROL_TABLE.LED);
    return value === 1;
  }

  /**
   * Check if device is moving
   * @returns {Promise<boolean>} - Moving status
   */
  async isMoving() {
    const value = await this.readByte(CONTROL_TABLE.MOVING);
    return value === 1;
  }

  /**
   * Reboot the device
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} - Success status
   */
  async reboot(timeout = 2000) {
    const packet = Protocol2.createInstructionPacket(this.id, INSTRUCTIONS.REBOOT, []);

    try {
      const response = await this.connection.sendAndWaitForResponse(packet, this.id, timeout);
      return response.error === 0;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get device information summary
   * @returns {Object} - Device information
   */
  getDeviceInfo() {
    return {
      id: this.id,
      modelNumber: this.modelNumber,
      modelName: this.modelName,
      firmwareVersion: this.firmwareVersion,
      lastError: this.lastError
    };
  }

  /**
   * Get model name from model number
   * @param {number} modelNumber - Model number
   * @returns {string} - Model name
   */
  getModelName(modelNumber) {
    // Use the static method from DynamixelController
    // This is a simple implementation - you could expand it
    const models = {
      12: 'AX-12A',
      18: 'AX-18A',
      320: 'XL-320',
      1020: 'XL430-W250',
      1060: 'XL330-M077',
      1190: 'XL330-M288',
      1200: 'XC430-W150',
      1210: 'XC430-W240',
      1270: 'XC330-T181',
      1280: 'XC330-T288',
      1290: 'XC330-M181',
      1300: 'XC330-M288',
      1130: 'XM430-W210',
      1140: 'XM430-W350',
      1150: 'XM540-W150',
      1170: 'XM540-W270'
    };

    return models[modelNumber] || `Unknown (${modelNumber})`;
  }

  /**
   * Convert position to degrees (assuming 0-4095 range)
   * @param {number} position - Position value
   * @returns {number} - Degrees (0-360)
   */
  positionToDegrees(position) {
    return (position / 4095) * 360;
  }

  /**
   * Convert degrees to position (assuming 0-4095 range)
   * @param {number} degrees - Degrees (0-360)
   * @returns {number} - Position value
   */
  degreesToPosition(degrees) {
    return Math.round((degrees / 360) * 4095);
  }

  /**
   * Convert velocity to RPM (model-specific)
   * @param {number} velocity - Velocity value
   * @returns {number} - RPM
   */
  velocityToRPM(velocity) {
    // This is model-specific - different models have different conversion factors
    // For XL/XC series: 1 unit = 0.229 RPM
    // For XM/XH series: 1 unit = 0.229 RPM
    return velocity * 0.229;
  }

  /**
   * Convert RPM to velocity (model-specific)
   * @param {number} rpm - RPM
   * @returns {number} - Velocity value
   */
  rpmToVelocity(rpm) {
    return Math.round(rpm / 0.229);
  }

  /**
   * Convert voltage reading to actual voltage
   * @param {number} voltageReading - Raw voltage reading
   * @returns {number} - Voltage in volts
   */
  voltageToVolts(voltageReading) {
    return voltageReading * 0.1;
  }

  // Indirect Addressing Methods

  /**
   * Generate standardized error messages for indirect addressing operations
   * @param {string} type - Error type ('indexOutOfRange', 'indexNotMapped', 'invalidValue', 'targetOutOfRange')
   * @param {Object} params - Parameters for the error message
   * @returns {string} - Formatted error message
   */
  getIndirectAddressErrorMessage(type, params) {
    const { index, value, targetAddress } = params;

    switch (type) {
      case 'indexOutOfRange':
        return `Indirect address index ${index} out of range [0, ${INDIRECT_ADDRESS.MAX_ENTRIES - 1}]`;
      case 'indexNotMapped':
        return `Indirect address index ${index} not mapped`;
      case 'invalidValue':
        return `Invalid value ${value} for index ${index}. Must be 0-255.`;
      case 'targetOutOfRange':
        return `Target address ${targetAddress} out of valid range [${INDIRECT_ADDRESS.VALID_RANGE_MIN}, ${INDIRECT_ADDRESS.VALID_RANGE_MAX}]`;
      default:
        return `Unknown indirect address error: ${type}`;
    }
  }

  /**
   * Setup indirect address mapping
   * Maps a control table address to an indirect address slot
   * @param {number} index - Indirect address index (0-19)
   * @param {number} targetAddress - Control table address to map
   * @returns {Promise<boolean>} - Success status
   */
  async setupIndirectAddress(index, targetAddress) {
    if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
    }

    if (targetAddress < INDIRECT_ADDRESS.VALID_RANGE_MIN || targetAddress > INDIRECT_ADDRESS.VALID_RANGE_MAX) {
      throw new Error(this.getIndirectAddressErrorMessage('targetOutOfRange', { targetAddress }));
    }

    const indirectAddressAddr = INDIRECT_ADDRESS.BASE_ADDRESS + (index * INDIRECT_ADDRESS.ADDRESS_SIZE);
    const success = await this.writeWord(indirectAddressAddr, targetAddress);

    if (success) {
      this.indirectMappings.set(index, targetAddress);
    }

    return success;
  }

  /**
   * Write data through indirect addressing
   * @param {number} index - Indirect address index
   * @param {number} value - Value to write (1 byte)
   * @returns {Promise<boolean>} - Success status
   */
  async writeIndirectData(index, value) {
    if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
    }

    if (!this.indirectMappings.has(index)) {
      throw new Error(this.getIndirectAddressErrorMessage('indexNotMapped', { index }));
    }

    const indirectDataAddr = INDIRECT_ADDRESS.DATA_BASE_ADDRESS + index;
    return await this.writeByte(indirectDataAddr, value);
  }

  /**
   * Read data through indirect addressing
   * @param {number} index - Indirect address index
   * @returns {Promise<number>} - Read value (1 byte)
   */
  async readIndirectData(index) {
    if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
    }

    if (!this.indirectMappings.has(index)) {
      throw new Error(this.getIndirectAddressErrorMessage('indexNotMapped', { index }));
    }

    const indirectDataAddr = INDIRECT_ADDRESS.DATA_BASE_ADDRESS + index;
    return await this.readByte(indirectDataAddr);
  }

  /**
   * Bulk read multiple indirect data addresses
   * @param {number[]} indices - Array of indirect address indices
   * @returns {Promise<Object>} - Map of index to value
   */
  async bulkReadIndirect(indices) {
    if (!Array.isArray(indices) || indices.length === 0) {
      throw new Error('Indices must be a non-empty array');
    }

    // Validate all indices
    for (const index of indices) {
      if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
        throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
      }
      if (!this.indirectMappings.has(index)) {
        throw new Error(this.getIndirectAddressErrorMessage('indexNotMapped', { index }));
      }
    }

    // Sort indices to ensure contiguous read if possible
    const sortedIndices = [...indices].sort((a, b) => a - b);
    const results = {};

    // Check if indices are contiguous for optimized bulk read
    let isContiguous = true;
    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
        isContiguous = false;
        break;
      }
    }

    if (isContiguous && sortedIndices.length > 1) {
      // Optimized contiguous read
      const startAddr = INDIRECT_ADDRESS.DATA_BASE_ADDRESS + sortedIndices[0];
      const length = sortedIndices.length;
      const data = await this.read(startAddr, length);

      for (let i = 0; i < sortedIndices.length; i++) {
        results[sortedIndices[i]] = data[i];
      }
    } else {
      // Individual reads for non-contiguous indices
      for (const index of indices) {
        results[index] = await this.readIndirectData(index);
      }
    }

    return results;
  }

  /**
   * Bulk write multiple indirect data addresses
   * @param {Object} mappings - Object with index as key and value as data
   * @returns {Promise<boolean>} - Success status
   */
  async bulkWriteIndirect(mappings) {
    if (!mappings || typeof mappings !== 'object') {
      throw new Error('Mappings must be an object');
    }

    const indices = Object.keys(mappings).map(Number);

    if (indices.length === 0) {
      return true;
    }

    // Validate all indices and values
    for (const index of indices) {
      if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
        throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
      }
      if (!this.indirectMappings.has(index)) {
        throw new Error(this.getIndirectAddressErrorMessage('indexNotMapped', { index }));
      }
      if (typeof mappings[index] !== 'number' || mappings[index] < 0 || mappings[index] > 255) {
        throw new Error(this.getIndirectAddressErrorMessage('invalidValue', { index, value: mappings[index] }));
      }
    }

    // Sort indices for potential optimization
    const sortedIndices = indices.sort((a, b) => a - b);

    // Check if indices are contiguous for optimized bulk write
    let isContiguous = true;
    for (let i = 1; i < sortedIndices.length; i++) {
      if (sortedIndices[i] !== sortedIndices[i - 1] + 1) {
        isContiguous = false;
        break;
      }
    }

    if (isContiguous && sortedIndices.length > 1) {
      // Optimized contiguous write
      const startAddr = INDIRECT_ADDRESS.DATA_BASE_ADDRESS + sortedIndices[0];
      const data = sortedIndices.map(index => mappings[index]);
      return await this.write(startAddr, data);
    } else {
      // Individual writes for non-contiguous indices
      for (const index of indices) {
        const success = await this.writeIndirectData(index, mappings[index]);
        if (!success) {
          return false;
        }
      }
      return true;
    }
  }

  /**
   * Clear indirect mapping for a specific index
   * @param {number} index - Indirect address index to clear
   * @returns {Promise<boolean>} - Success status
   */
  async clearIndirectMapping(index) {
    if (index < 0 || index >= INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(this.getIndirectAddressErrorMessage('indexOutOfRange', { index }));
    }

    const indirectAddressAddr = INDIRECT_ADDRESS.BASE_ADDRESS + (index * INDIRECT_ADDRESS.ADDRESS_SIZE);
    const success = await this.writeWord(indirectAddressAddr, 0);

    if (success) {
      this.indirectMappings.delete(index);
    }

    return success;
  }

  /**
   * Clear all indirect mappings
   * @returns {Promise<boolean>} - Success status
   */
  async clearAllIndirectMappings() {
    for (let i = 0; i < INDIRECT_ADDRESS.MAX_ENTRIES; i++) {
      const success = await this.clearIndirectMapping(i);
      if (!success) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get current indirect address mappings
   * @returns {Map} - Map of index to target address
   */
  getIndirectMappings() {
    return new Map(this.indirectMappings);
  }

  /**
   * Setup common indirect mappings for monitoring
   * @returns {Promise<boolean>} - Success status
   */
  async setupCommonIndirectMappings() {
    const mappings = [
      { index: 0, address: CONTROL_TABLE.PRESENT_POSITION.address },
      { index: 4, address: CONTROL_TABLE.PRESENT_VELOCITY.address },
      { index: 8, address: CONTROL_TABLE.PRESENT_PWM.address },
      { index: 10, address: CONTROL_TABLE.PRESENT_TEMPERATURE.address },
      { index: 11, address: CONTROL_TABLE.MOVING.address }
    ];

    for (const mapping of mappings) {
      const success = await this.setupIndirectAddress(mapping.index, mapping.address);
      if (!success) {
        return false;
      }
    }

    return true;
  }

  /**
   * Read all common monitoring values through indirect addressing
   * @returns {Promise<Object>} - Object containing position, velocity, pwm, temperature, moving
   * @warning The returned values are incomplete for multi-byte fields:
   *          - position: Only 1 byte of 4-byte value (use consecutive indirect mappings for full values)
   *          - velocity: Only 1 byte of 4-byte value (use consecutive indirect mappings for full values)
   *          - pwm: Only 1 byte of 2-byte value (use consecutive indirect mappings for full values)
   *          For complete values, map consecutive indirect addresses to cover all bytes
   */
  async readCommonStatus() {
    const indices = [0, 4, 8, 10, 11];
    const data = await this.bulkReadIndirect(indices);

    // Present position is 4 bytes, but we can only read 1 byte per indirect data
    // For full 4-byte values, we need to map consecutive indirect addresses
    return {
      position: data[0], // This will only be 1 byte of the 4-byte position
      velocity: data[4], // This will only be 1 byte of the 4-byte velocity
      pwm: data[8],      // This will only be 1 byte of the 2-byte PWM
      temperature: data[10],
      moving: data[11]
    };
  }

  // Enhanced Indirect Addressing Methods

  /**
   * Setup indirect READ block with control table items
   * Automatically calculates contiguous sections and maps addresses
   * @param {Array<string>} controlTableItems - Array of control table item names
   * @returns {Promise<Object>} - Block configuration with startIndex, totalSize, and itemMap
   */
  async setupIndirectReadBlock(controlTableItems) {
    if (!Array.isArray(controlTableItems) || controlTableItems.length === 0) {
      throw new Error('controlTableItems must be a non-empty array');
    }

    // Clear existing read block if any
    if (this.indirectReadBlock) {
      await this.clearIndirectReadBlock();
    }

    // Get control table information for each item
    const items = [];
    let totalSize = 0;
    
    for (const itemName of controlTableItems) {
      const item = getControlTableItem(itemName);
      if (!item) {
        throw new Error(`Unknown control table item: ${itemName}`);
      }
      items.push({ name: itemName, ...item });
      totalSize += item.size;
    }

    if (totalSize > INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(`Total size ${totalSize} exceeds maximum indirect entries ${INDIRECT_ADDRESS.MAX_ENTRIES}`);
    }

    // Sort items by address to create contiguous blocks
    items.sort((a, b) => a.address - b.address);

    // Setup indirect addresses
    let currentIndex = 0;
    const itemMap = {};

    for (const item of items) {
      itemMap[item.name] = {
        startIndex: currentIndex,
        size: item.size,
        address: item.address
      };

      // Map each byte of multi-byte items
      for (let i = 0; i < item.size; i++) {
        await this.setupIndirectAddress(currentIndex + i, item.address + i);
      }

      currentIndex += item.size;
    }

    this.indirectReadBlock = {
      items: controlTableItems,
      itemMap,
      startIndex: 0,
      totalSize,
      dataStartAddress: INDIRECT_ADDRESS.DATA_BASE_ADDRESS
    };

    return this.indirectReadBlock;
  }

  /**
   * Read all values from the indirect READ block
   * @returns {Promise<Object>} - Object with control table item names as keys and values
   */
  async readIndirectBlock() {
    if (!this.indirectReadBlock) {
      throw new Error('No indirect read block configured. Call setupIndirectReadBlock() first.');
    }

    const { totalSize, itemMap, dataStartAddress } = this.indirectReadBlock;
    
    // Read all data in one contiguous read
    const data = await this.read(dataStartAddress, totalSize);
    
    // Parse data according to item map
    const result = {};
    for (const [itemName, config] of Object.entries(itemMap)) {
      const { startIndex, size } = config;
      const itemData = data.slice(startIndex, startIndex + size);
      
      // Convert to appropriate data type based on size
      if (size === 1) {
        result[itemName] = itemData[0];
      } else if (size === 2) {
        result[itemName] = itemData[0] | (itemData[1] << 8);
      } else if (size === 4) {
        result[itemName] = itemData[0] | (itemData[1] << 8) | (itemData[2] << 16) | (itemData[3] << 24);
      } else {
        result[itemName] = Array.from(itemData);
      }
    }

    return result;
  }

  /**
   * Setup indirect WRITE block with control table items
   * @param {string} blockName - Name for this write block
   * @param {Array<string>} controlTableItems - Array of control table item names
   * @returns {Promise<Object>} - Block configuration
   */
  async setupIndirectWriteBlock(blockName, controlTableItems) {
    if (!blockName || typeof blockName !== 'string') {
      throw new Error('blockName must be a non-empty string');
    }

    if (!Array.isArray(controlTableItems) || controlTableItems.length === 0) {
      throw new Error('controlTableItems must be a non-empty array');
    }

    // Calculate available indices (avoiding read block if it exists)
    let availableStart = 0;
    if (this.indirectReadBlock) {
      availableStart = this.indirectReadBlock.totalSize;
    }

    // Calculate space used by existing write blocks
    let usedSpace = availableStart;
    for (const [, block] of this.indirectWriteBlocks) {
      usedSpace += block.totalSize;
    }

    // Get control table information for each item
    const items = [];
    let totalSize = 0;
    
    for (const itemName of controlTableItems) {
      const item = getControlTableItem(itemName);
      if (!item) {
        throw new Error(`Unknown control table item: ${itemName}`);
      }
      items.push({ name: itemName, ...item });
      totalSize += item.size;
    }

    if (usedSpace + totalSize > INDIRECT_ADDRESS.MAX_ENTRIES) {
      throw new Error(`Total size would exceed maximum indirect entries. Used: ${usedSpace}, Need: ${totalSize}, Max: ${INDIRECT_ADDRESS.MAX_ENTRIES}`);
    }

    // Sort items by address
    items.sort((a, b) => a.address - b.address);

    // Setup indirect addresses
    let currentIndex = usedSpace;
    const itemMap = {};

    for (const item of items) {
      itemMap[item.name] = {
        startIndex: currentIndex,
        size: item.size,
        address: item.address
      };

      // Map each byte of multi-byte items
      for (let i = 0; i < item.size; i++) {
        await this.setupIndirectAddress(currentIndex + i, item.address + i);
      }

      currentIndex += item.size;
    }

    const blockConfig = {
      name: blockName,
      items: controlTableItems,
      itemMap,
      startIndex: usedSpace,
      totalSize,
      dataStartAddress: INDIRECT_ADDRESS.DATA_BASE_ADDRESS + usedSpace
    };

    this.indirectWriteBlocks.set(blockName, blockConfig);
    return blockConfig;
  }

  /**
   * Write values to an indirect WRITE block
   * @param {string} blockName - Name of the write block
   * @param {Object} values - Object with control table item names as keys and values to write
   * @returns {Promise<boolean>} - Success status
   */
  async writeIndirectBlock(blockName, values) {
    if (!this.indirectWriteBlocks.has(blockName)) {
      throw new Error(`Indirect write block '${blockName}' not found. Call setupIndirectWriteBlock() first.`);
    }

    const block = this.indirectWriteBlocks.get(blockName);
    const { itemMap, dataStartAddress, totalSize } = block;

    // Validate all required values are provided
    for (const itemName of block.items) {
      if (!(itemName in values)) {
        throw new Error(`Missing value for control table item: ${itemName}`);
      }
    }

    // Build data buffer
    const dataBuffer = Buffer.alloc(totalSize);
    
    for (const [itemName, value] of Object.entries(values)) {
      if (!itemMap[itemName]) {
        throw new Error(`Control table item '${itemName}' not in block '${blockName}'`);
      }

      const { startIndex, size } = itemMap[itemName];
      const relativeIndex = startIndex - block.startIndex;

      // Convert value to bytes based on size
      if (size === 1) {
        dataBuffer[relativeIndex] = value & 0xFF;
      } else if (size === 2) {
        dataBuffer[relativeIndex] = value & 0xFF;
        dataBuffer[relativeIndex + 1] = (value >> 8) & 0xFF;
      } else if (size === 4) {
        dataBuffer[relativeIndex] = value & 0xFF;
        dataBuffer[relativeIndex + 1] = (value >> 8) & 0xFF;
        dataBuffer[relativeIndex + 2] = (value >> 16) & 0xFF;
        dataBuffer[relativeIndex + 3] = (value >> 24) & 0xFF;
      } else {
        // For multi-byte arrays
        const valueArray = Array.isArray(value) ? value : [value];
        for (let i = 0; i < Math.min(size, valueArray.length); i++) {
          dataBuffer[relativeIndex + i] = valueArray[i] & 0xFF;
        }
      }
    }

    // Write all data in one contiguous write
    return await this.write(dataStartAddress, dataBuffer);
  }

  /**
   * Clear indirect READ block
   * @returns {Promise<boolean>} - Success status
   */
  async clearIndirectReadBlock() {
    if (!this.indirectReadBlock) {
      return true;
    }

    const { totalSize } = this.indirectReadBlock;
    
    // Clear mappings
    for (let i = 0; i < totalSize; i++) {
      await this.clearIndirectMapping(i);
    }

    this.indirectReadBlock = null;
    return true;
  }

  /**
   * Clear an indirect WRITE block
   * @param {string} blockName - Name of the write block to clear
   * @returns {Promise<boolean>} - Success status
   */
  async clearIndirectWriteBlock(blockName) {
    if (!this.indirectWriteBlocks.has(blockName)) {
      return true;
    }

    const block = this.indirectWriteBlocks.get(blockName);
    const { startIndex, totalSize } = block;

    // Clear mappings
    for (let i = startIndex; i < startIndex + totalSize; i++) {
      await this.clearIndirectMapping(i);
    }

    this.indirectWriteBlocks.delete(blockName);
    return true;
  }

  /**
   * Get information about current indirect blocks
   * @returns {Object} - Information about read and write blocks
   */
  getIndirectBlockInfo() {
    return {
      readBlock: this.indirectReadBlock ? {
        items: this.indirectReadBlock.items,
        totalSize: this.indirectReadBlock.totalSize
      } : null,
      writeBlocks: Array.from(this.indirectWriteBlocks.entries()).map(([name, block]) => ({
        name,
        items: block.items,
        totalSize: block.totalSize,
        startIndex: block.startIndex
      })),
      availableEntries: INDIRECT_ADDRESS.MAX_ENTRIES - this.getTotalUsedIndirectEntries()
    };
  }

  /**
   * Get total number of used indirect entries
   * @returns {number} - Number of used entries
   */
  getTotalUsedIndirectEntries() {
    let total = 0;
    
    if (this.indirectReadBlock) {
      total += this.indirectReadBlock.totalSize;
    }

    for (const [, block] of this.indirectWriteBlocks) {
      total += block.totalSize;
    }

    return total;
  }

  /**
   * Group sync read using indirect addressing
   * Compatible with GroupSyncRead for multiple devices
   * @param {Array<DynamixelDevice>} devices - Array of devices to read from
   * @returns {Promise<Object>} - Results keyed by device ID
   */
  static async groupSyncReadIndirect(devices) {
    if (!Array.isArray(devices) || devices.length === 0) {
      throw new Error('devices must be a non-empty array');
    }

    // Verify all devices have the same read block configuration
    const firstDevice = devices[0];
    if (!firstDevice.indirectReadBlock) {
      throw new Error('Devices must have indirect read block configured');
    }

    const { dataStartAddress, totalSize } = firstDevice.indirectReadBlock;
    
    for (const device of devices) {
      if (!device.indirectReadBlock || 
          device.indirectReadBlock.dataStartAddress !== dataStartAddress ||
          device.indirectReadBlock.totalSize !== totalSize) {
        throw new Error('All devices must have identical indirect read block configuration');
      }
    }

    // Use the first device's connection for group sync read
    const connection = firstDevice.connection;
    const deviceIds = devices.map(d => d.id);
    
    // Create and send group sync read packet
    const packet = Protocol2.createGroupSyncReadPacket(deviceIds, dataStartAddress, totalSize, true);
    const response = await connection.sendAndWaitForGroupResponse(packet, deviceIds);
    
    // Parse responses and convert to readable format
    const results = {};
    const parsedResponses = Protocol2.parseGroupSyncReadResponse(response, deviceIds, totalSize);
    
    for (const device of devices) {
      if (parsedResponses[device.id] && parsedResponses[device.id].success) {
        const data = parsedResponses[device.id].data;
        const { itemMap } = device.indirectReadBlock;
        
        // Parse data according to item map
        const deviceResult = {};
        for (const [itemName, config] of Object.entries(itemMap)) {
          const { startIndex, size } = config;
          const itemData = data.slice(startIndex, startIndex + size);
          
          // Convert to appropriate data type based on size
          if (size === 1) {
            deviceResult[itemName] = itemData[0];
          } else if (size === 2) {
            deviceResult[itemName] = itemData[0] | (itemData[1] << 8);
          } else if (size === 4) {
            deviceResult[itemName] = itemData[0] | (itemData[1] << 8) | (itemData[2] << 16) | (itemData[3] << 24);
          } else {
            deviceResult[itemName] = Array.from(itemData);
          }
        }
        
        results[device.id] = {
          success: true,
          data: deviceResult,
          error: parsedResponses[device.id].error
        };
      } else {
        results[device.id] = {
          success: false,
          data: null,
          error: parsedResponses[device.id] ? parsedResponses[device.id].error : 'No response'
        };
      }
    }

    return results;
  }

  /**
   * Group sync write using indirect addressing
   * Compatible with GroupSyncWrite for multiple devices
   * @param {Array<Object>} deviceData - Array of {device, blockName, values} objects
   * @returns {Promise<boolean>} - Success status
   */
  static async groupSyncWriteIndirect(deviceData) {
    if (!Array.isArray(deviceData) || deviceData.length === 0) {
      throw new Error('deviceData must be a non-empty array');
    }

    // Group devices by their write block configuration
    const blockConfigs = new Map();
    
    for (const { device, blockName, values } of deviceData) {
      if (!device.indirectWriteBlocks.has(blockName)) {
        throw new Error(`Device ${device.id} does not have write block '${blockName}'`);
      }

      const block = device.indirectWriteBlocks.get(blockName);
      const configKey = `${block.dataStartAddress}-${block.totalSize}`;
      
      if (!blockConfigs.has(configKey)) {
        blockConfigs.set(configKey, {
          startAddress: block.dataStartAddress,
          dataLength: block.totalSize,
          devices: []
        });
      }

      // Build data buffer for this device
      const dataBuffer = Buffer.alloc(block.totalSize);
      const { itemMap } = block;
      
      for (const [itemName, value] of Object.entries(values)) {
        if (!itemMap[itemName]) {
          throw new Error(`Control table item '${itemName}' not in block '${blockName}' for device ${device.id}`);
        }

        const { startIndex, size } = itemMap[itemName];
        const relativeIndex = startIndex - block.startIndex;

        // Convert value to bytes based on size
        if (size === 1) {
          dataBuffer[relativeIndex] = value & 0xFF;
        } else if (size === 2) {
          dataBuffer[relativeIndex] = value & 0xFF;
          dataBuffer[relativeIndex + 1] = (value >> 8) & 0xFF;
        } else if (size === 4) {
          dataBuffer[relativeIndex] = value & 0xFF;
          dataBuffer[relativeIndex + 1] = (value >> 8) & 0xFF;
          dataBuffer[relativeIndex + 2] = (value >> 16) & 0xFF;
          dataBuffer[relativeIndex + 3] = (value >> 24) & 0xFF;
        }
      }

      blockConfigs.get(configKey).devices.push({
        id: device.id,
        data: Array.from(dataBuffer)
      });
    }

    // Send group sync write for each configuration
    for (const [, config] of blockConfigs) {
      const { startAddress, dataLength, devices } = config;
      const firstDevice = deviceData.find(d => d.device.id === devices[0].id).device;
      
      const packet = Protocol2.createGroupSyncWritePacket(devices, startAddress, dataLength);
      await firstDevice.connection.sendPacket(packet);
    }

    return true;
  }
}
