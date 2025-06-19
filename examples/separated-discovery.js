#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Example: Separated Device Discovery
 * This example demonstrates how to:
 * 1. Discover communication devices (USB/Serial) without connecting
 * 2. Allow user to select a device
 * 3. Connect to the selected device
 * 4. Discover motors on that device
 *
 * This pattern is ideal for Electron applications where you want to:
 * - Show available devices in a UI dropdown
 * - Let user select which device to use
 * - Only then connect and discover motors
 */

async function main() {
  console.log('🔍 DYNAMIXEL Separated Discovery Example');
  console.log('========================================\n');

  // Step 1: Discover available communication devices WITHOUT connecting
  console.log('📡 Step 1: Discovering communication devices...');

  try {
    const devices = await DynamixelController.discoverCommunicationDevices();

    console.log(`\n📊 Discovery Results:`);
    console.log(`   USB Devices: ${devices.usb.length}`);
    console.log(`   Serial Devices: ${devices.serial.length}`);
    console.log(`   Web Serial Support: ${devices.webserial}`);

    // Display USB devices
    if (devices.usb.length > 0) {
      console.log('\n🔌 USB Devices:');
      devices.usb.forEach((device, index) => {
        const marker = device.isU2D2 ? '✅' : '⚪';
        console.log(`   ${index + 1}. ${marker} ${device.name}`);
        if (device.isU2D2) {
          console.log(`      → Recommended U2D2 device`);
        }
      });
    }

    // Display Serial devices
    if (devices.serial.length > 0) {
      console.log('\n📡 Serial Devices:');
      devices.serial.forEach((device, index) => {
        const marker = device.isU2D2 ? '✅' : '⚪';
        console.log(`   ${index + 1}. ${marker} ${device.name}`);
        if (device.isU2D2) {
          console.log(`      → Likely U2D2 device (FTDI chip)`);
        }
      });
    }

    // Step 2: Get U2D2-specific devices
    console.log('\n🎯 Step 2: Finding U2D2-compatible devices...');
    const u2d2Devices = await DynamixelController.discoverU2D2Devices();

    if (u2d2Devices.length === 0) {
      console.log('❌ No U2D2-compatible devices found!');
      console.log('\n💡 Make sure:');
      console.log('   - U2D2 device is connected via USB');
      console.log('   - Drivers are installed');
      console.log('   - Device is not being used by other software');
      return;
    }

    console.log(`\n✅ Found ${u2d2Devices.length} U2D2-compatible device(s):`);
    u2d2Devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.name}`);
      if (device.type === 'serial') {
        console.log(`      Path: ${device.path}`);
        console.log(`      Manufacturer: ${device.manufacturer || 'Unknown'}`);
      }
    });

    // Step 3: Simulate device selection (in a real app, user would select from UI)
    console.log('\n🎯 Step 3: Selecting device...');
    const selectedDevice = u2d2Devices[0]; // Select first available device
    console.log(`Selected: ${selectedDevice.name}`);

    // Step 4: Create controller with deferred connection
    console.log('\n🏗️  Step 4: Creating DynamixelController with deferred connection...');
    const controller = new DynamixelController({
      deferConnection: true, // Don't connect immediately
      timeout: 3000,
      debug: false
    });

    // Set up event listeners
    controller.on('connected', () => {
      console.log('✅ Connected to selected device');
    });

    controller.on('disconnected', () => {
      console.log('❌ Disconnected from device');
    });

    controller.on('error', (error) => {
      console.error('❌ Error:', error.message);
    });

    // Step 5: Connect to the selected device
    console.log('\n🔗 Step 5: Connecting to selected device...');
    const connected = await controller.connectToDevice(selectedDevice);

    if (!connected) {
      console.error('❌ Failed to connect to selected device');
      return;
    }

    console.log('✅ Successfully connected!');

    // Step 6: Now discover motors on the connected device
    console.log('\n🤖 Step 6: Discovering DYNAMIXEL motors...');
    console.log('Scanning for motors on the connected bus...\n');

    let discoveredMotors = [];

    // Quick motor discovery
    try {
      discoveredMotors = await controller.quickDiscovery((progress) => {
        process.stdout.write(`\r   Scanning motor ID ${progress.id}... (${progress.current}/${progress.total})`);
      });
      console.log(`\n   Found ${discoveredMotors.length} motors in quick scan`);
    } catch (error) {
      console.log(`\n   Motor discovery failed: ${error.message}`);
    }

    // Display discovered motors
    if (discoveredMotors.length > 0) {
      console.log('\n🤖 Discovered Motors:');
      const devices = controller.getAllDevices();
      devices.forEach(device => {
        const info = device.getDeviceInfo();
        const modelName = DynamixelController.getModelName(info.modelNumber);
        console.log(`   Motor ID ${info.id}: ${modelName} (Model: ${info.modelNumber}), FW: ${info.firmwareVersion}`);
      });

      // Test first motor
      console.log('\n🧪 Testing first motor...');
      const firstMotor = devices[0];

      // Add a small delay to allow motor to settle after discovery
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        console.log(`   Pinging motor ${firstMotor.id}...`);
        await firstMotor.ping();
        console.log(`   ✅ Motor ${firstMotor.id} is responding`);

        // Get status
        const temperature = await firstMotor.getPresentTemperature();
        const voltage = await firstMotor.getPresentVoltage();
        const position = await firstMotor.getPresentPosition();

        console.log(`   Status for Motor ${firstMotor.id}:`);
        console.log(`     Temperature: ${temperature}°C`);
        console.log(`     Voltage: ${firstMotor.voltageToVolts(voltage).toFixed(1)}V`);
        console.log(`     Position: ${position} (${firstMotor.positionToDegrees(position).toFixed(1)}°)`);

      } catch (error) {
        console.log(`   ❌ Error testing motor: ${error.message}`);
      }
    } else {
      console.log('\n❌ No motors found on the bus');
      console.log('\n💡 Make sure:');
      console.log('   - DYNAMIXEL motors are connected to the bus');
      console.log('   - Motors are powered');
      console.log('   - Baud rate matches (default: 57600)');
      console.log('   - Motor IDs are in range 1-20 (or run full discovery)');
    }

    // Step 7: Cleanup
    console.log('\n🧹 Step 7: Disconnecting...');
    await controller.disconnect();
    console.log('✅ Disconnected successfully');

  } catch (error) {
    console.error('\n❌ Discovery process failed:', error.message);
  }

  console.log('\n🎉 Separated discovery example complete!');
  console.log('\n💡 In an Electron app, you would:');
  console.log('   1. Run discoverCommunicationDevices() on app start');
  console.log('   2. Show devices in a dropdown/list UI');
  console.log('   3. Let user select a device');
  console.log('   4. Create controller with { deferConnection: true }');
  console.log('   5. Call connectToDevice(selectedDevice)');
  console.log('   6. Run motor discovery after connection');
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the example
main().catch(console.error);
