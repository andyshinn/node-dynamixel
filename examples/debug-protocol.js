import { DynamixelController } from '../src/DynamixelController.js';
import { Protocol2 } from '../src/Protocol2.js';

console.log('🔍 DYNAMIXEL Protocol 2.0 Debug Tool');
console.log('====================================');
console.log('This tool will examine the raw protocol communication to debug CRC issues.\n');

function hexDump(buffer, label = '') {
  if (label) console.log(`${label}:`);
  const hex = Array.from(buffer).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ');
  const ascii = Array.from(buffer).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
  console.log(`  HEX: ${hex}`);
  console.log(`  ASCII: ${ascii}`);
  console.log(`  Length: ${buffer.length} bytes\n`);
}

async function debugProtocol() {
  console.log('🔌 Step 1: Connecting to U2D2...');

  const controller = new DynamixelController();

  try {
    await controller.connect();
    console.log('✅ Connected successfully!\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return;
  }

  console.log('🔍 Step 2: Creating a PING packet...');

  // Create a PING packet for ID 1
  const pingPacket = Protocol2.createPingPacket(1);
  hexDump(pingPacket, '📤 PING Packet to send');

  // Manually verify our CRC calculation
  console.log('🧮 Step 3: Verifying our CRC calculation...');
  const crcData = Array.from(pingPacket.slice(4, -2)); // Data for CRC (excluding header and CRC bytes)
  console.log('CRC input data:', crcData.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));

  const calculatedCRC = Protocol2.calculateCRC(crcData);
  const packetCRC = pingPacket[pingPacket.length - 2] | (pingPacket[pingPacket.length - 1] << 8);

  console.log(`Our calculated CRC: 0x${calculatedCRC.toString(16).padStart(4, '0')} (${calculatedCRC})`);
  console.log(`CRC in packet: 0x${packetCRC.toString(16).padStart(4, '0')} (${packetCRC})`);
  console.log(`CRC match: ${calculatedCRC === packetCRC ? '✅' : '❌'}\n`);

  console.log('📡 Step 4: Sending PING and capturing raw response...');

  // Set up raw packet capture
  let rawResponses = [];

  const originalEmit = controller.connection.emit;
  controller.connection.emit = function(event, ...args) {
    if (event === 'packet') {
      console.log('🎯 Raw packet received!');
      const packet = args[0];
      if (packet && packet.raw) {
        rawResponses.push(packet.raw);
        hexDump(packet.raw, '📥 Raw response packet');

        // Manual CRC verification of response
        console.log('🔍 Analyzing response packet:');
        console.log(`  ID: ${packet.raw[4]} (0x${packet.raw[4].toString(16)})`);
        console.log(`  Length: ${packet.raw[5] | (packet.raw[6] << 8)}`);
        console.log(`  Instruction: ${packet.raw[7]} (0x${packet.raw[7].toString(16)})`);
        console.log(`  Error: ${packet.raw[8]} (0x${packet.raw[8].toString(16)})`);

        // Extract CRC from packet
        const responseLength = packet.raw[5] | (packet.raw[6] << 8);
        const crcStartIndex = 7 + responseLength - 2;
        const responseCRC = packet.raw[crcStartIndex] | (packet.raw[crcStartIndex + 1] << 8);

        // Calculate what CRC should be
        const responseCRCData = Array.from(packet.raw.slice(4, crcStartIndex));
        const expectedCRC = Protocol2.calculateCRC(responseCRCData);

        console.log(`  CRC Data for calculation:`, responseCRCData.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
        console.log(`  CRC in packet: 0x${responseCRC.toString(16).padStart(4, '0')} (${responseCRC})`);
        console.log(`  Expected CRC: 0x${expectedCRC.toString(16).padStart(4, '0')} (${expectedCRC})`);
        console.log(`  CRC match: ${responseCRC === expectedCRC ? '✅' : '❌'}\n`);
      }
    }
    return originalEmit.call(this, event, ...args);
  };

  try {
    console.log('Sending PING to ID 1...');
    const result = await controller.ping(1);
    console.log('✅ PING successful!', result);
  } catch (error) {
    console.log('❌ PING failed:', error.message);

    // If we captured raw data, let's analyze it even if parsing failed
    if (rawResponses.length > 0) {
      console.log('\n🔍 Analyzing captured responses...');
      rawResponses.forEach((response, index) => {
        console.log(`\nResponse ${index + 1}:`);
        hexDump(response, `Raw response ${index + 1}`);
      });
    }
  }

  await controller.disconnect();
  console.log('\n✅ Debug complete!');
}

// Test CRC calculation against known values
function testCRC() {
  console.log('🧪 Testing CRC calculation against known values...');

  // Test case from DYNAMIXEL Protocol 2.0 manual
  // PING packet to ID 1: FF FF FD 00 01 03 00 01 19 4E
  const testData = [0x01, 0x03, 0x00, 0x01]; // ID + Length + Instruction (excluding header and CRC)
  const expectedCRC = 0x4E19; // From manual (little-endian: 19 4E)
  const calculatedCRC = Protocol2.calculateCRC(testData);

  console.log(`Test data: ${testData.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' ')}`);
  console.log(`Expected CRC: 0x${expectedCRC.toString(16).padStart(4, '0')} (${expectedCRC})`);
  console.log(`Calculated CRC: 0x${calculatedCRC.toString(16).padStart(4, '0')} (${calculatedCRC})`);
  console.log(`CRC Test: ${calculatedCRC === expectedCRC ? '✅ PASS' : '❌ FAIL'}\n`);
}

// Run tests
testCRC();
debugProtocol();
