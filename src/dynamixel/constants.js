// DYNAMIXEL Protocol 2.0 Constants

// Packet Structure
export const HEADER = [0xFF, 0xFF, 0xFD, 0x00];
export const BROADCAST_ID = 0xFE;

// Instructions
export const INSTRUCTIONS = {
  PING: 0x01,
  READ: 0x02,
  WRITE: 0x03,
  REG_WRITE: 0x04,
  ACTION: 0x05,
  FACTORY_RESET: 0x06,
  REBOOT: 0x08,
  CLEAR: 0x10,
  CONTROL_TABLE_BACKUP: 0x20,
  CONTROL_TABLE_RESTORE: 0x21,
  STATUS: 0x55,
  SYNC_READ: 0x82,
  SYNC_WRITE: 0x83,
  FAST_SYNC_READ: 0x8A,
  BULK_READ: 0x92,
  BULK_WRITE: 0x93,
  FAST_BULK_READ: 0x9A
};

// Error Flags
export const ERROR_FLAGS = {
  RESULT_FAIL: 0x01,
  INSTRUCTION_ERROR: 0x02,
  CRC_ERROR: 0x03,
  DATA_RANGE_ERROR: 0x04,
  DATA_LENGTH_ERROR: 0x05,
  DATA_LIMIT_ERROR: 0x06,
  ACCESS_ERROR: 0x07
};

// Control Table with integrated address and size information
// Supports both constant access (CONTROL_TABLE.PRESENT_POSITION) and string access (CONTROL_TABLE['PRESENT_POSITION'])
export const CONTROL_TABLE = {
  // EEPROM Area
  'MODEL_NUMBER': { address: 0, size: 2 },
  'MODEL_INFORMATION': { address: 2, size: 4 },
  'FIRMWARE_VERSION': { address: 6, size: 1 },
  'ID': { address: 7, size: 1 },
  'BAUD_RATE': { address: 8, size: 1 },
  'RETURN_DELAY_TIME': { address: 9, size: 1 },
  'DRIVE_MODE': { address: 10, size: 1 },
  'OPERATING_MODE': { address: 11, size: 1 },
  'SECONDARY_ID': { address: 12, size: 1 },
  'PROTOCOL_TYPE': { address: 13, size: 1 },
  'HOMING_OFFSET': { address: 20, size: 4 },
  'MOVING_THRESHOLD': { address: 24, size: 4 },
  'TEMPERATURE_LIMIT': { address: 31, size: 1 },
  'MAX_VOLTAGE_LIMIT': { address: 32, size: 2 },
  'MIN_VOLTAGE_LIMIT': { address: 34, size: 2 },
  'PWM_LIMIT': { address: 36, size: 2 },
  'VELOCITY_LIMIT': { address: 44, size: 4 },
  'MAX_POSITION_LIMIT': { address: 48, size: 4 },
  'MIN_POSITION_LIMIT': { address: 52, size: 4 },
  'EXTERNAL_PORT_MODE_1': { address: 56, size: 1 },
  'EXTERNAL_PORT_MODE_2': { address: 57, size: 1 },
  'EXTERNAL_PORT_MODE_3': { address: 58, size: 1 },
  'SHUTDOWN': { address: 63, size: 1 },

  // RAM Area
  'TORQUE_ENABLE': { address: 64, size: 1 },
  'LED': { address: 65, size: 1 },  
  'STATUS_RETURN_LEVEL': { address: 68, size: 1 },
  'REGISTERED_INSTRUCTION': { address: 69, size: 1 },
  'HARDWARE_ERROR_STATUS': { address: 70, size: 1 },
  'VELOCITY_I_GAIN': { address: 76, size: 2 },
  'VELOCITY_P_GAIN': { address: 78, size: 2 },
  'POSITION_D_GAIN': { address: 80, size: 2 },
  'POSITION_I_GAIN': { address: 82, size: 2 },
  'POSITION_P_GAIN': { address: 84, size: 2 },
  'FEEDFORWARD_2ND_GAIN': { address: 88, size: 2 },
  'FEEDFORWARD_1ST_GAIN': { address: 90, size: 2 },
  'BUS_WATCHDOG': { address: 98, size: 1 },
  'GOAL_PWM': { address: 100, size: 2 },
  'GOAL_CURRENT': { address: 102, size: 2 },
  'GOAL_VELOCITY': { address: 104, size: 4 },
  'PROFILE_ACCELERATION': { address: 108, size: 4 },
  'PROFILE_VELOCITY': { address: 112, size: 4 },
  'GOAL_POSITION': { address: 116, size: 4 },
  'REALTIME_TICK': { address: 120, size: 2 },
  'MOVING': { address: 122, size: 1 },
  'MOVING_STATUS': { address: 123, size: 1 },
  'PRESENT_PWM': { address: 124, size: 2 },
  'PRESENT_LOAD': { address: 126, size: 2 },
  'PRESENT_VELOCITY': { address: 128, size: 4 },
  'PRESENT_POSITION': { address: 132, size: 4 },
  'VELOCITY_TRAJECTORY': { address: 136, size: 4 },
  'POSITION_TRAJECTORY': { address: 140, size: 4 },
  'PRESENT_INPUT_VOLTAGE': { address: 144, size: 2 },
  'PRESENT_TEMPERATURE': { address: 146, size: 1 }
};

// Legacy constants for backward compatibility - now derived from CONTROL_TABLE
export const CONTROL_TABLE_ADDRESSES = Object.fromEntries(
  Object.entries(CONTROL_TABLE).map(([key, value]) => [key, value.address])
);

export const CONTROL_TABLE_SIZE = Object.fromEntries(
  Object.entries(CONTROL_TABLE).map(([key, value]) => [key, value.size])
);

// Backward compatibility - expose addresses as direct constants
export const {
  MODEL_NUMBER, MODEL_INFORMATION, FIRMWARE_VERSION, ID, BAUD_RATE, RETURN_DELAY_TIME,
  DRIVE_MODE, OPERATING_MODE, SECONDARY_ID, PROTOCOL_TYPE, HOMING_OFFSET, MOVING_THRESHOLD,
  TEMPERATURE_LIMIT, MAX_VOLTAGE_LIMIT, MIN_VOLTAGE_LIMIT, PWM_LIMIT, VELOCITY_LIMIT,
  MAX_POSITION_LIMIT, MIN_POSITION_LIMIT, EXTERNAL_PORT_MODE_1, EXTERNAL_PORT_MODE_2, 
  EXTERNAL_PORT_MODE_3, SHUTDOWN, TORQUE_ENABLE, LED, STATUS_RETURN_LEVEL, 
  REGISTERED_INSTRUCTION, HARDWARE_ERROR_STATUS, VELOCITY_I_GAIN, VELOCITY_P_GAIN,
  POSITION_D_GAIN, POSITION_I_GAIN, POSITION_P_GAIN, FEEDFORWARD_2ND_GAIN, 
  FEEDFORWARD_1ST_GAIN, BUS_WATCHDOG, GOAL_PWM, GOAL_CURRENT, GOAL_VELOCITY,
  PROFILE_ACCELERATION, PROFILE_VELOCITY, GOAL_POSITION, REALTIME_TICK, MOVING,
  MOVING_STATUS, PRESENT_PWM, PRESENT_LOAD, PRESENT_VELOCITY, PRESENT_POSITION,
  VELOCITY_TRAJECTORY, POSITION_TRAJECTORY, PRESENT_INPUT_VOLTAGE, PRESENT_TEMPERATURE
} = CONTROL_TABLE_ADDRESSES;

// Helper function to get control table item (now supports both string and constant access)
export function getControlTableItem(name) {
  // Handle direct object access
  if (typeof name === 'object' && name.address !== undefined) {
    return name;
  }
  
  // Handle string access
  if (typeof name === 'string' && CONTROL_TABLE[name]) {
    return CONTROL_TABLE[name];
  }
  
  // Handle numeric address lookup (reverse lookup)
  if (typeof name === 'number') {
    const entry = Object.entries(CONTROL_TABLE).find(([, value]) => value.address === name);
    return entry ? entry[1] : null;
  }
  
  return null;
}

// U2D2 USB Device Information
export const U2D2_DEVICE = {
  VENDOR_ID: 0x0403,  // FTDI
  PRODUCT_ID: 0x6014, // FT232H
  INTERFACE: 0
};

// Indirect Address Constants
export const INDIRECT_ADDRESS = {
  BASE_ADDRESS: 168,        // Starting address for indirect addresses
  DATA_BASE_ADDRESS: 208,   // Starting address for indirect data
  MAX_ENTRIES: 20,          // Maximum number of indirect mappings
  ADDRESS_SIZE: 2,          // Each indirect address entry is 2 bytes
  DATA_SIZE: 1,             // Each indirect data entry is 1 byte
  VALID_RANGE_MIN: 64,      // Minimum valid address for indirect mapping
  VALID_RANGE_MAX: 227      // Maximum valid address for indirect mapping
};

// Default timeouts and settings
export const DEFAULT_TIMEOUT = 1000; // milliseconds
export const DEFAULT_BAUD_RATE = 57600;
export const MIN_PACKET_LENGTH = 10; // Header + ID + Length + Instruction + CRC
