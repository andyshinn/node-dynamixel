#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * XL330 Device Finder
 * Comprehensive search for XL330 motors across all IDs and baud rates
 */

const COMMON_BAUD_RATES = [
  57600,   // Default for most DYNAMIXEL-X
  1000000, // High-speed option  
  115200,  // Common alternative
  2000000, // Very high-speed
  3000000, // Maximum for some models
  9600,    // Low-speed fallback
];

const ID_RANGES = [
  { name: 'Factory Default', ids: [1] },
  { name: 'Common Range', ids: [1, 2, 3, 4, 5] },
  { name: 'Extended Range', ids: Array.from({length: 20}, (_, i) => i + 1) },
  { name: 'Full Range', ids: Array.from({length: 252}, (_, i) => i + 1) }
];

async function testBaudRate(baudRate) {
  console.log(`\n🔍 Testing baud rate: ${baudRate}`);
  console.log('─'.repeat(50));
  
  const controller = new DynamixelController({
    timeout: 3000,
    baudRate: baudRate,
    debug: false
  });
  
  let foundDevices = [];
  
  try {
    await controller.connect();
    console.log(`✅ Connected at ${baudRate} baud`);
    
    // Try quick discovery first
    console.log('🔍 Quick discovery (IDs 1-20)...');
    try {
      const devices = await controller.quickDiscovery();
      if (devices.length > 0) {
        console.log(`🎯 FOUND ${devices.length} device(s) via quick discovery!`);
        devices.forEach(device => {
          console.log(`   ID ${device.id}: ${device.modelName} (${device.modelNumber})`);
          foundDevices.push({...device, baudRate});
        });
        return foundDevices;
      }
    } catch (error) {
      console.log(`❌ Quick discovery failed: ${error.message}`);
    }
    
    // Manual ID scanning
    for (const range of ID_RANGES) {
      console.log(`\n🔍 Scanning ${range.name} (${range.ids.length} IDs)...`);
      
      let rangeFound = false;
      for (const id of range.ids) {
        try {
          process.stdout.write(`Testing ID ${id}...`);
          const deviceInfo = await controller.ping(id, 2000);
          
          console.log(` 🎯 FOUND!`);
          console.log(`   Model: ${deviceInfo.modelNumber} (${controller.getDevice(id)?.modelName || 'Unknown'})`);
          console.log(`   Firmware: ${deviceInfo.firmwareVersion}`);
          console.log(`   Error: ${deviceInfo.error}`);
          
          foundDevices.push({
            id,
            modelNumber: deviceInfo.modelNumber,
            modelName: controller.getDevice(id)?.modelName || `Unknown (${deviceInfo.modelNumber})`,
            firmwareVersion: deviceInfo.firmwareVersion,
            error: deviceInfo.error,
            baudRate
          });
          rangeFound = true;
          
        } catch (error) {
          if (error.message.includes('Timeout')) {
            process.stdout.write(` ⏱️`);
          } else {
            process.stdout.write(` ❌`);
          }
        }
        
        // Add small delay to avoid overwhelming the motor
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      if (!rangeFound) {
        console.log(`\n   No devices found in ${range.name}`);
      }
      
      // If we found devices in this range, no need to scan larger ranges
      if (foundDevices.length > 0) {
        break;
      }
    }
    
  } catch (error) {
    console.log(`❌ Connection failed at ${baudRate}: ${error.message}`);
  } finally {
    try {
      await controller.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
  
  return foundDevices;
}

async function main() {
  console.log('🔍 XL330-M288-T Device Finder');
  console.log('═'.repeat(60));
  console.log('Comprehensive search across all IDs and baud rates\n');
  
  let allFoundDevices = [];
  
  // Test each baud rate
  for (const baudRate of COMMON_BAUD_RATES) {
    const devices = await testBaudRate(baudRate);
    allFoundDevices.push(...devices);
    
    // If we found devices, we can stop testing other baud rates
    if (devices.length > 0) {
      console.log(`\n✅ Found devices at ${baudRate} baud - stopping search`);
      break;
    }
  }
  
  console.log('\n🏁 SEARCH COMPLETE');
  console.log('═'.repeat(60));
  
  if (allFoundDevices.length === 0) {
    console.log('❌ No DYNAMIXEL devices found');
    console.log('\n🚨 TROUBLESHOOTING CHECKLIST:');
    console.log('1. Motor Power:');
    console.log('   • Is the motor powered? (3.7V - 6V for XL330)');
    console.log('   • Check power LED on motor');
    console.log('   • Verify power supply capacity');
    console.log('');
    console.log('2. Connections:');
    console.log('   • U2D2 to motor: Data cable properly connected?');
    console.log('   • U2D2 to computer: USB cable working?');
    console.log('   • Check for loose connections');
    console.log('');
    console.log('3. Motor Configuration:');
    console.log('   • Motor might be at a different baud rate');
    console.log('   • Motor ID might be changed from factory default');
    console.log('   • Try ROBOTIS software to reset motor');
    console.log('');
    console.log('4. Hardware Issues:');
    console.log('   • Try different USB port');
    console.log('   • Test with different cable');
    console.log('   • Check motor with ROBOTIS Dynamixel Wizard');
    
  } else {
    console.log(`✅ Found ${allFoundDevices.length} device(s):`);
    
    allFoundDevices.forEach((device, index) => {
      console.log(`\nDevice ${index + 1}:`);
      console.log(`   ID: ${device.id}`);
      console.log(`   Model: ${device.modelName} (${device.modelNumber})`);
      console.log(`   Firmware: ${device.firmwareVersion}`);
      console.log(`   Baud Rate: ${device.baudRate}`);
      console.log(`   Hardware Error: ${device.error === 0 ? 'None' : `0x${device.error.toString(16)}`}`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    const device = allFoundDevices[0];
    console.log(`1. Update your scripts to use ID ${device.id} and baud rate ${device.baudRate}`);
    console.log(`2. Test with: node examples/xl330-sensor-test.js`);
    console.log(`3. Run monitoring: node examples/xl330-realtime-monitoring.js`);
    
    if (device.id !== 1) {
      console.log(`\n💡 Your motor is at ID ${device.id}, not ID 1!`);
      console.log(`   You can change scripts to use ID ${device.id}, or`);
      console.log(`   Use ROBOTIS Dynamixel Wizard to change motor ID to 1`);
    }
    
    if (device.baudRate !== 57600) {
      console.log(`\n💡 Your motor uses baud rate ${device.baudRate}, not 57600!`);
      console.log(`   Update DynamixelController options: { baudRate: ${device.baudRate} }`);
    }
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Search interrupted by user');
  process.exit(0);
});

main().catch(console.error);