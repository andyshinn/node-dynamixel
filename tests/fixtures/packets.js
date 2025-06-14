/**
 * Test fixtures containing common DYNAMIXEL packet examples
 * Based on official ROBOTIS Protocol 2.0 documentation
 */

export const PACKETS = {
  // PING packets
  PING_ID_1: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x03, 0x00, 0x01, 0x19, 0x4E],
    description: 'PING packet for device ID 1',
    id: 1,
    instruction: 0x01,
    parameters: []
  },

  PING_BROADCAST: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0xFE, 0x03, 0x00, 0x01, 0x31, 0x42],
    description: 'PING packet for broadcast (ID 254)',
    id: 0xFE,
    instruction: 0x01,
    parameters: []
  },

  // STATUS packets (responses)
  STATUS_PING_RESPONSE: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x07, 0x00, 0x55, 0x00, 0xB0, 0x04, 0x34, 0x19, 0x4E],
    description: 'STATUS response to PING from XC430-W150 (Model 1200, FW 52)',
    id: 1,
    instruction: 0x55,
    error: 0x00,
    parameters: [0xB0, 0x04, 0x34], // Model number (1200) + firmware (52)
    modelNumber: 1200,
    firmwareVersion: 52
  },

  // READ packets
  READ_POSITION: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x07, 0x00, 0x02, 0x84, 0x00, 0x04, 0x00, 0x1D, 0x15],
    description: 'READ current position (4 bytes from 0x84)',
    id: 1,
    instruction: 0x02,
    parameters: [0x84, 0x00, 0x04, 0x00] // Address 0x84, length 4
  },

  READ_TEMPERATURE: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x06, 0x00, 0x02, 0x92, 0x00, 0x01, 0x00, 0x69, 0x0D],
    description: 'READ temperature (1 byte from 0x92)',
    id: 1,
    instruction: 0x02,
    parameters: [0x92, 0x00, 0x01, 0x00] // Address 0x92, length 1
  },

  // WRITE packets
  WRITE_LED_ON: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x06, 0x00, 0x03, 0x41, 0x00, 0x01, 0x4D, 0xBB],
    description: 'WRITE LED on (1 to address 0x41)',
    id: 1,
    instruction: 0x03,
    parameters: [0x41, 0x00, 0x01] // Address 0x41, value 1
  },

  WRITE_LED_OFF: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x06, 0x00, 0x03, 0x41, 0x00, 0x00, 0x8C, 0x7B],
    description: 'WRITE LED off (0 to address 0x41)',
    id: 1,
    instruction: 0x03,
    parameters: [0x41, 0x00, 0x00] // Address 0x41, value 0
  },

  WRITE_POSITION: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x09, 0x00, 0x03, 0x74, 0x00, 0x00, 0x08, 0x00, 0x00, 0x7E, 0x13],
    description: 'WRITE target position 2048 (0x0800) to address 0x74',
    id: 1,
    instruction: 0x03,
    parameters: [0x74, 0x00, 0x00, 0x08, 0x00, 0x00] // Address 0x74, value 2048 (4 bytes)
  },

  // STATUS responses to operations
  STATUS_READ_POSITION: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x08, 0x00, 0x55, 0x00, 0xF8, 0x06, 0x00, 0x00, 0x8A, 0x1B],
    description: 'STATUS response with position 1784 (0x06F8)',
    id: 1,
    instruction: 0x55,
    error: 0x00,
    parameters: [0xF8, 0x06, 0x00, 0x00], // Position 1784 in little endian
    value: 1784
  },

  STATUS_READ_TEMPERATURE: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x05, 0x00, 0x55, 0x00, 0x17, 0x8C, 0x7B],
    description: 'STATUS response with temperature 23°C',
    id: 1,
    instruction: 0x55,
    error: 0x00,
    parameters: [0x17], // Temperature 23
    value: 23
  },

  STATUS_WRITE_SUCCESS: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x04, 0x00, 0x55, 0x00, 0xA1, 0x0C],
    description: 'STATUS response indicating successful write',
    id: 1,
    instruction: 0x55,
    error: 0x00,
    parameters: []
  },

  // Error responses
  STATUS_WITH_ERROR: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x04, 0x00, 0x55, 0x01, 0x60, 0x8C],
    description: 'STATUS response with Result Fail error',
    id: 1,
    instruction: 0x55,
    error: 0x01, // Result Fail
    parameters: []
  },

  STATUS_CRC_ERROR: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x04, 0x00, 0x55, 0x03, 0xE2, 0x8C],
    description: 'STATUS response with CRC Error',
    id: 1,
    instruction: 0x55,
    error: 0x03, // CRC Error
    parameters: []
  },

  // Invalid packets for testing error handling
  INVALID_HEADER: {
    raw: [0xFE, 0xFF, 0xFD, 0x00, 0x01, 0x03, 0x00, 0x01, 0x19, 0x4E],
    description: 'Packet with invalid header'
  },

  INVALID_CRC: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01, 0x03, 0x00, 0x01, 0xFF, 0xFF],
    description: 'Packet with invalid CRC'
  },

  INCOMPLETE_PACKET: {
    raw: [0xFF, 0xFF, 0xFD, 0x00, 0x01],
    description: 'Incomplete packet (header only)'
  }
};

/**
 * Device model information for testing
 */
export const DEVICE_MODELS = {
  XC430_W150: {
    modelNumber: 1200,
    name: 'XC430-W150',
    series: 'X-Series'
  },
  XL430_W250: {
    modelNumber: 1060,
    name: 'XL430-W250',
    series: 'X-Series'
  },
  UNKNOWN: {
    modelNumber: 9999,
    name: 'Unknown',
    series: 'Unknown'
  }
};

/**
 * Register addresses for testing
 */
export const REGISTERS = {
  MODEL_NUMBER: 0x00,
  FIRMWARE_VERSION: 0x02,
  ID: 0x03,
  BAUD_RATE: 0x04,
  TORQUE_ENABLE: 0x40,
  LED: 0x41,
  TARGET_VELOCITY: 0x68,
  TARGET_POSITION: 0x74,
  PRESENT_LOAD: 0x7E,
  PRESENT_VELOCITY: 0x80,
  PRESENT_POSITION: 0x84,
  PRESENT_VOLTAGE: 0x90,
  PRESENT_TEMPERATURE: 0x92
};

/**
 * Common test scenarios
 */
export const SCENARIOS = {
  MOTOR_DISCOVERY: {
    description: 'Discovering an XC430-W150 motor at ID 1',
    deviceId: 1,
    expectedResponse: PACKETS.STATUS_PING_RESPONSE,
    expectedModel: DEVICE_MODELS.XC430_W150
  },

  LED_CONTROL: {
    description: 'Turning LED on and off',
    turnOn: {
      command: PACKETS.WRITE_LED_ON,
      response: PACKETS.STATUS_WRITE_SUCCESS
    },
    turnOff: {
      command: PACKETS.WRITE_LED_OFF,
      response: PACKETS.STATUS_WRITE_SUCCESS
    }
  },

  POSITION_MONITORING: {
    description: 'Reading motor position and temperature',
    readPosition: {
      command: PACKETS.READ_POSITION,
      response: PACKETS.STATUS_READ_POSITION
    },
    readTemperature: {
      command: PACKETS.READ_TEMPERATURE,
      response: PACKETS.STATUS_READ_TEMPERATURE
    }
  }
};

/**
 * Utility function to convert packet arrays to Buffers
 */
export function packetToBuffer(packetArray) {
  return Buffer.from(packetArray);
}

/**
 * Utility function to calculate expected CRC for a packet
 */
export async function calculateTestCRC(packetArray) {
  // Use the same CRC calculation as Protocol2
  const { Protocol2 } = await import('../../src/Protocol2.js');
  return Protocol2.calculateCRC(packetArray.slice(0, -2));
}
