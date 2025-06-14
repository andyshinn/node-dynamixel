import { HEADER, INSTRUCTIONS, ERROR_FLAGS, MIN_PACKET_LENGTH } from './constants.js';

/**
 * DYNAMIXEL Protocol 2.0 implementation
 * Handles packet construction, parsing, and CRC calculation
 */
export class Protocol2 {
  /**
   * Calculate CRC-16 for DYNAMIXEL Protocol 2.0
   * Based on official ROBOTIS code: http://support.robotis.com/en/product/actuator/dynamixel_pro/communication/crc.htm
   * CRC-16 (IBM/ANSI) - Polynomial: x16 + x15 + x2 + 1 (0x8005), Initial Value: 0
   * @param {Buffer|Array} data - Data to calculate CRC for
   * @returns {number} - 16-bit CRC value
   */
  static calculateCRC(data) {
    const crcTable = [
      0x0000, 0x8005, 0x800F, 0x000A, 0x801B, 0x001E, 0x0014, 0x8011,
      0x8033, 0x0036, 0x003C, 0x8039, 0x0028, 0x802D, 0x8027, 0x0022,
      0x8063, 0x0066, 0x006C, 0x8069, 0x0078, 0x807D, 0x8077, 0x0072,
      0x0050, 0x8055, 0x805F, 0x005A, 0x804B, 0x004E, 0x0044, 0x8041,
      0x80C3, 0x00C6, 0x00CC, 0x80C9, 0x00D8, 0x80DD, 0x80D7, 0x00D2,
      0x00F0, 0x80F5, 0x80FF, 0x00FA, 0x80EB, 0x00EE, 0x00E4, 0x80E1,
      0x00A0, 0x80A5, 0x80AF, 0x00AA, 0x80BB, 0x00BE, 0x00B4, 0x80B1,
      0x8093, 0x0096, 0x009C, 0x8099, 0x0088, 0x808D, 0x8087, 0x0082,
      0x8183, 0x0186, 0x018C, 0x8189, 0x0198, 0x819D, 0x8197, 0x0192,
      0x01B0, 0x81B5, 0x81BF, 0x01BA, 0x81AB, 0x01AE, 0x01A4, 0x81A1,
      0x01E0, 0x81E5, 0x81EF, 0x01EA, 0x81FB, 0x01FE, 0x01F4, 0x81F1,
      0x81D3, 0x01D6, 0x01DC, 0x81D9, 0x01C8, 0x81CD, 0x81C7, 0x01C2,
      0x0140, 0x8145, 0x814F, 0x014A, 0x815B, 0x015E, 0x0154, 0x8151,
      0x8173, 0x0176, 0x017C, 0x8179, 0x0168, 0x816D, 0x8167, 0x0162,
      0x8123, 0x0126, 0x012C, 0x8129, 0x0138, 0x813D, 0x8137, 0x0132,
      0x0110, 0x8115, 0x811F, 0x011A, 0x810B, 0x010E, 0x0104, 0x8101,
      0x8303, 0x0306, 0x030C, 0x8309, 0x0318, 0x831D, 0x8317, 0x0312,
      0x0330, 0x8335, 0x833F, 0x033A, 0x832B, 0x032E, 0x0324, 0x8321,
      0x0360, 0x8365, 0x836F, 0x036A, 0x837B, 0x037E, 0x0374, 0x8371,
      0x8353, 0x0356, 0x035C, 0x8359, 0x0348, 0x834D, 0x8347, 0x0342,
      0x03C0, 0x83C5, 0x83CF, 0x03CA, 0x83DB, 0x03DE, 0x03D4, 0x83D1,
      0x83F3, 0x03F6, 0x03FC, 0x83F9, 0x03E8, 0x83ED, 0x83E7, 0x03E2,
      0x83A3, 0x03A6, 0x03AC, 0x83A9, 0x03B8, 0x83BD, 0x83B7, 0x03B2,
      0x0390, 0x8395, 0x839F, 0x039A, 0x838B, 0x038E, 0x0384, 0x8381,
      0x0280, 0x8285, 0x828F, 0x028A, 0x829B, 0x029E, 0x0294, 0x8291,
      0x82B3, 0x02B6, 0x02BC, 0x82B9, 0x02A8, 0x82AD, 0x82A7, 0x02A2,
      0x82E3, 0x02E6, 0x02EC, 0x82E9, 0x02F8, 0x82FD, 0x82F7, 0x02F2,
      0x02D0, 0x82D5, 0x82DF, 0x02DA, 0x82CB, 0x02CE, 0x02C4, 0x82C1,
      0x8243, 0x0246, 0x024C, 0x8249, 0x0258, 0x825D, 0x8257, 0x0252,
      0x0270, 0x8275, 0x827F, 0x027A, 0x826B, 0x026E, 0x0264, 0x8261,
      0x0220, 0x8225, 0x822F, 0x022A, 0x823B, 0x023E, 0x0234, 0x8231,
      0x8213, 0x0216, 0x021C, 0x8219, 0x0208, 0x820D, 0x8207, 0x0202
    ];

    let crcAccum = 0;
    const dataArray = Array.isArray(data) ? data : Array.from(data);

    // Official ROBOTIS algorithm:
    // for(j = 0; j < data_blk_size; j++) {
    //   i = ((unsigned short)(crc_accum >> 8) ^ data_blk_ptr[j]) & 0xFF;
    //   crc_accum = (crc_accum << 8) ^ crc_table[i];
    // }
    for (let j = 0; j < dataArray.length; j++) {
      const i = ((crcAccum >> 8) ^ dataArray[j]) & 0xFF;
      crcAccum = (crcAccum << 8) ^ crcTable[i];
    }

    // Ensure 16-bit result
    crcAccum = crcAccum & 0xFFFF;

    return crcAccum;
  }

  /**
   * Create an instruction packet
   * @param {number} id - DYNAMIXEL ID (0-252, 0xFE for broadcast)
   * @param {number} instruction - Instruction byte
   * @param {Array|Buffer} parameters - Parameter data
   * @returns {Buffer} - Complete instruction packet
   */
  static createInstructionPacket(id, instruction, parameters = []) {
    const paramArray = Array.isArray(parameters) ? parameters : Array.from(parameters);
    const length = 3 + paramArray.length; // Instruction + Parameters + CRC(2)

    // Build packet without CRC
    const packet = [
      ...HEADER,           // Header: 0xFF 0xFF 0xFD 0x00
      id,                  // Packet ID
      length & 0xFF,       // Length low byte
      (length >> 8) & 0xFF, // Length high byte
      instruction,         // Instruction
      ...paramArray        // Parameters
    ];

    // Calculate CRC for the entire packet (excluding only the CRC bytes)
    // According to ROBOTIS documentation: CRC is calculated on the full packet
    const crc = this.calculateCRC(packet);

    // Add CRC to packet
    packet.push(crc & 0xFF);        // CRC low byte
    packet.push((crc >> 8) & 0xFF); // CRC high byte

    return Buffer.from(packet);
  }

  /**
   * Parse a status packet
   * @param {Buffer} buffer - Raw packet data
   * @returns {Object|null} - Parsed packet or null if invalid
   */
  static parseStatusPacket(buffer) {
    if (!buffer || buffer.length < MIN_PACKET_LENGTH) {
      return null;
    }

    // Check header
    if (buffer[0] !== HEADER[0] || buffer[1] !== HEADER[1] ||
        buffer[2] !== HEADER[2] || buffer[3] !== HEADER[3]) {
      return null;
    }

    const id = buffer[4];
    const length = buffer[5] | (buffer[6] << 8);
    const instruction = buffer[7];
    const error = buffer[8];

    // Check if we have enough data for the complete packet
    if (buffer.length < 9 + length - 2) {
      return null;
    }

    // Extract parameters (everything between error and CRC)
    const paramLength = length - 4; // length - instruction - error - CRC(2)
    const parameters = Array.from(buffer.slice(9, 9 + paramLength));

    // Extract CRC
    const crcReceived = buffer[9 + paramLength] | (buffer[9 + paramLength + 1] << 8);

    // Verify CRC - calculate on entire packet excluding only the CRC bytes
    const crcData = Array.from(buffer.slice(0, 9 + paramLength));
    const crcCalculated = this.calculateCRC(crcData);

    if (crcReceived !== crcCalculated) {
      throw new Error(`CRC mismatch: received ${crcReceived.toString(16)}, calculated ${crcCalculated.toString(16)}`);
    }

    return {
      id,
      instruction,
      error,
      parameters,
      length,
      raw: buffer
    };
  }

  /**
   * Create a PING instruction packet
   * @param {number} id - DYNAMIXEL ID (0-252, 0xFE for broadcast)
   * @returns {Buffer} - PING instruction packet
   */
  static createPingPacket(id) {
    return this.createInstructionPacket(id, INSTRUCTIONS.PING, []);
  }

  /**
   * Parse PING status packet to extract device information
   * @param {Object} statusPacket - Parsed status packet
   * @returns {Object|null} - Device information or null if not a PING response
   */
  static parsePingResponse(statusPacket) {
    if (!statusPacket || statusPacket.instruction !== INSTRUCTIONS.STATUS) {
      return null;
    }

    if (statusPacket.parameters.length < 3) {
      return null;
    }

    const modelNumber = statusPacket.parameters[0] | (statusPacket.parameters[1] << 8);
    const firmwareVersion = statusPacket.parameters[2];

    return {
      id: statusPacket.id,
      modelNumber,
      firmwareVersion,
      error: statusPacket.error
    };
  }

  /**
   * Check if buffer contains a complete packet
   * @param {Buffer} buffer - Buffer to check
   * @returns {number} - Length of complete packet, or 0 if incomplete
   */
  static getCompletePacketLength(buffer) {
    if (!buffer || buffer.length < 7) {
      return 0;
    }

    // Check for header
    if (buffer[0] !== HEADER[0] || buffer[1] !== HEADER[1] ||
        buffer[2] !== HEADER[2] || buffer[3] !== HEADER[3]) {
      return 0;
    }

    const length = buffer[5] | (buffer[6] << 8);
    const totalLength = 7 + length; // Header(4) + ID(1) + Length(2) + Data(length)

    return buffer.length >= totalLength ? totalLength : 0;
  }

  /**
   * Convert error code to human-readable string
   * @param {number} errorCode - Error code from status packet
   * @returns {string} - Error description
   */
  static getErrorDescription(errorCode) {
    const errors = [];

    if (errorCode & ERROR_FLAGS.RESULT_FAIL) errors.push('Result Fail');
    if (errorCode & ERROR_FLAGS.INSTRUCTION_ERROR) errors.push('Instruction Error');
    if (errorCode & ERROR_FLAGS.CRC_ERROR) errors.push('CRC Error');
    if (errorCode & ERROR_FLAGS.DATA_RANGE_ERROR) errors.push('Data Range Error');
    if (errorCode & ERROR_FLAGS.DATA_LENGTH_ERROR) errors.push('Data Length Error');
    if (errorCode & ERROR_FLAGS.DATA_LIMIT_ERROR) errors.push('Data Limit Error');
    if (errorCode & ERROR_FLAGS.ACCESS_ERROR) errors.push('Access Error');

    return errors.length > 0 ? errors.join(', ') : 'No Error';
  }
}
