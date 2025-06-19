/**
 * DYNAMIXEL Layer Index (CommonJS)
 * Exports all DYNAMIXEL protocol, device, and constant definitions
 */

const { Protocol2 } = require('./Protocol2.js');
const { DynamixelDevice } = require('./DynamixelDevice.js');
const constants = require('./constants.js');

module.exports = {
  Protocol2,
  DynamixelDevice,
  ...constants
};
