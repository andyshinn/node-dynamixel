import { EventEmitter } from 'events';
import { Protocol2 } from './Protocol2.js';
import { INSTRUCTIONS, CONTROL_TABLE } from './constants.js';

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
}
