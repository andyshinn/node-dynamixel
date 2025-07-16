#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Debug Model Detection
 * This script helps debug model detection issues by showing raw model numbers
 * and other device information during discovery.
 */

async function main() {
  console.log('🔍 DYNAMIXEL Model Detection Debug Tool');
  console.log('═'.repeat(50));
  
  const controller = new DynamixelController({
    timeout: 2000, // Longer timeout for debugging
    debug: false
  });
  
  controller.on('connected', () => {
    console.log('✅ Connected to U2D2 device');
  });
  
  controller.on('error', (error) => {
    console.error('❌ Controller error:', error.message);
  });
  
  try {
    // Connect
    console.log('🔌 Connecting to U2D2...');
    await controller.connect();
    
    // Manual device discovery with detailed debugging
    console.log('🔍 Starting detailed device discovery...');
    console.log('Testing device IDs 1-20...\n');
    
    for (let id = 1; id <= 20; id++) {
      try {
        console.log(`Testing ID ${id}...`);
        const deviceInfo = await controller.ping(id, 1000);
        
        console.log(`🎯 FOUND DEVICE ID ${id}:`);
        console.log(`   Raw Model Number: ${deviceInfo.modelNumber} (0x${deviceInfo.modelNumber.toString(16).padStart(4, '0')})`);
        console.log(`   Firmware Version: ${deviceInfo.firmwareVersion}`);
        console.log(`   Hardware Error: ${deviceInfo.error} (0x${deviceInfo.error.toString(16).padStart(2, '0')})`);
        
        // Get device instance to check model name mapping
        const device = controller.getDevice(id);
        if (device) {
          console.log(`   Detected Model Name: ${device.modelName}`);
          console.log(`   Expected for XL330-M288-T: Model Number should be 1190`);
          
          // Try to read additional device info
          try {
            console.log('   📡 Testing basic communication...');
            const torqueStatus = await device.getTorqueEnable();
            console.log(`   ✅ Communication OK - Torque Status: ${torqueStatus ? 'ENABLED' : 'DISABLED'}`);
            
            // Try reading position
            const position = await device.getPresentPosition();
            console.log(`   ✅ Position reading OK: ${position} (${device.positionToDegrees(position).toFixed(1)}°)`);
            
          } catch (commError) {
            console.log(`   ❌ Communication test failed: ${commError.message}`);
            console.log(`   This suggests the model detection might be wrong or device has issues`);
          }
        }
        
        console.log(''); // Empty line for readability
        
      } catch (error) {
        // Device not found at this ID - continue silently
        if (!error.message.includes('Timeout')) {
          console.log(`   ⚠️  ID ${id}: ${error.message}`);
        }
      }
    }
    
    console.log('🏁 Discovery complete');
    
    // Now show what the standard discovery finds
    console.log('\n🔍 Standard discovery results:');
    const devices = await controller.quickDiscovery();
    
    if (devices.length === 0) {
      console.log('❌ No devices found in standard discovery');
    } else {
      devices.forEach((deviceInfo, index) => {
        console.log(`Device ${index + 1}:`);
        console.log(`   ID: ${deviceInfo.id}`);
        console.log(`   Model: ${deviceInfo.modelName} (${deviceInfo.modelNumber})`);
        console.log(`   Firmware: ${deviceInfo.firmwareVersion}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    try {
      await controller.disconnect();
    } catch (disconnectError) {
      console.error('Warning: Disconnect error:', disconnectError.message);
    }
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Interrupted by user');
  process.exit(0);
});

main().catch(console.error);