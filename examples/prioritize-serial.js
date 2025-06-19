#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Example: Prioritizing Serial Devices
 * This example demonstrates different ways to prioritize serial devices over USB
 */

async function main() {
  console.log('🔧 DYNAMIXEL Serial Priority Example');
  console.log('=====================================\n');

  // Method 1: Explicitly force serial connection
  console.log('📍 Method 1: Force Serial Connection');
  console.log('-----------------------------------');

  const serialController = new DynamixelController({
    connectionType: 'serial',  // Force serial, never try USB
    timeout: 1000,
    debug: false
  });

  console.log('✅ Controller created with serial priority\n');

  // Method 2: Discover devices and prioritize serial devices in selection
  console.log('📍 Method 2: Device Discovery with Serial Priority');
  console.log('------------------------------------------------');

  // Discover all available devices
  const devices = await DynamixelController.discoverCommunicationDevices();

  console.log(`📊 Discovery Results:`);
  console.log(`   USB Devices: ${devices.usb.length}`);
  console.log(`   Serial Devices: ${devices.serial.length}`);
  console.log(`   Web Serial Support: ${devices.webserial}\n`);

  // Prioritize serial devices
  let selectedDevice = null;

  if (devices.serial.length > 0) {
    // Prefer serial devices
    selectedDevice = devices.serial[0];
    console.log(`✅ Selected SERIAL device: ${selectedDevice.name}`);
  } else if (devices.usb.length > 0) {
    // Fallback to USB if no serial devices
    selectedDevice = devices.usb[0];
    console.log(`⚠️  No serial devices found, using USB: ${selectedDevice.name}`);
  } else {
    console.log('❌ No devices found');
    return;
  }

  // Method 3: Use deferred connection with device selection
  console.log('\n📍 Method 3: Deferred Connection with Serial Priority');
  console.log('---------------------------------------------------');

  const deferredController = new DynamixelController({
    deferConnection: true,  // Don't connect immediately
    timeout: 1000
  });

  // Connect to the prioritized device
  const connected = await deferredController.connectToDevice(selectedDevice);

  if (connected) {
    console.log('✅ Successfully connected to prioritized device!');

    // Now discover motors
    console.log('\n🤖 Discovering motors...');
    try {
      const motors = await deferredController.quickDiscovery((progress) => {
        process.stdout.write(`\r   Scanning motor ID ${progress.id}... (${progress.current}/${progress.total})`);
      });
      console.log(`\n   Found ${motors.length} motors`);

      if (motors.length > 0) {
        const motorDevices = deferredController.getAllDevices();
        motorDevices.forEach(motor => {
          const info = motor.getDeviceInfo();
          const modelName = DynamixelController.getModelName(info.modelNumber);
          console.log(`   Motor ID ${info.id}: ${modelName} (Model: ${info.modelNumber})`);
        });
      }
    } catch (error) {
      console.log(`\n   Motor discovery failed: ${error.message}`);
    }

    await deferredController.disconnect();
  } else {
    console.log('❌ Failed to connect to selected device');
  }

  console.log('\n📍 Method 4: Custom Auto-Detection with Serial Priority');
  console.log('-----------------------------------------------------');

  // Create a custom controller that prefers serial
  const customController = createSerialPriorityController({
    timeout: 1000,
    debug: false
  });

  console.log('✅ Custom controller created with serial priority logic');

  try {
    const success = await customController.connect();
    if (success) {
      console.log(`✅ Connected using: ${customController.connectionType}`);
      await customController.disconnect();
    } else {
      console.log('❌ Failed to connect with any method');
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
  }

  console.log('\n✅ Serial priority demonstration complete!');
}

/**
 * Create a controller that prioritizes serial connections
 * @param {Object} options - Controller options
 * @returns {DynamixelController} - Controller with serial priority
 */
function createSerialPriorityController(options = {}) {
  // Simply force serial connection type - much simpler approach
  return new DynamixelController({
    ...options,
    connectionType: 'serial'  // Force serial priority
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createSerialPriorityController };
