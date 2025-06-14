#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Example: DYNAMIXEL Device Discovery
 * This example demonstrates how to discover DYNAMIXEL devices using the Ping packet
 */

async function main() {
  // Create controller instance
  const controller = new DynamixelController({
    timeout: 1000,
    debug: false // Set to true for USB debugging
  });

  // Set up event listeners
  controller.on('connected', () => {
    console.log('✅ Connected to U2D2 device');
  });

  controller.on('disconnected', () => {
    console.log('❌ Disconnected from U2D2 device');
  });

  controller.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  controller.on('deviceFound', (deviceInfo) => {
    const modelName = DynamixelController.getModelName(deviceInfo.modelNumber);
    console.log(`🔍 Found device: ID ${deviceInfo.id}, Model: ${modelName} (${deviceInfo.modelNumber}), FW: ${deviceInfo.firmwareVersion}`);
  });

  controller.on('discoveryComplete', (devices) => {
    console.log(`\n✅ Discovery complete! Found ${devices.length} device(s)`);
  });

  try {
    console.log('🔌 Attempting to connect to U2D2...');

    // List available USB devices for debugging
    const usbDevices = DynamixelController.listUSBDevices();
    console.log(`📋 Found ${usbDevices.length} USB devices:`);
    usbDevices.forEach((device, index) => {
      console.log(`  ${index + 1}. VID: 0x${device.vendorId.toString(16).padStart(4, '0')}, PID: 0x${device.productId.toString(16).padStart(4, '0')}`);
    });

    // Connect to U2D2
    const connected = await controller.connect();
    if (!connected) {
      console.error('❌ Failed to connect to U2D2. Please check:');
      console.error('   - U2D2 is connected via USB');
      console.error('   - Drivers are installed');
      console.error('   - No other software is using the device');
      process.exit(1);
    }

    console.log('\n🔍 Starting device discovery...');
    console.log('This may take a while depending on the range of IDs to scan.\n');

    // Option 1: Quick discovery (IDs 1-20)
    console.log('📍 Quick discovery (IDs 1-20):');
    const quickDevices = await controller.quickDiscovery((current, total, id) => {
      process.stdout.write(`\r   Scanning ID ${id}... (${current}/${total})`);
    });
    console.log(`\n   Found ${quickDevices.length} devices in quick scan\n`);

    // Option 2: Ping specific device
    console.log('📍 Pinging specific device (ID 1):');
    try {
      const deviceInfo = await controller.ping(1, 100);
      const modelName = DynamixelController.getModelName(deviceInfo.modelNumber);
      console.log(`   Device ID 1: ${modelName} (${deviceInfo.modelNumber}), FW: ${deviceInfo.firmwareVersion}`);
    } catch (error) {
      console.log('   No device found at ID 1');
    }

    // Option 3: Full discovery (uncomment if needed)
    // console.log('📍 Full discovery (IDs 1-252):');
    // const allDevices = await controller.fullDiscovery((current, total, id) => {
    //   if (current % 10 === 0) {
    //     process.stdout.write(`\r   Scanning... (${current}/${total})`);
    //   }
    // });
    // console.log(`\n   Found ${allDevices.length} devices in full scan\n`);

    // Work with discovered devices
    const devices = controller.getAllDevices();
    if (devices.length > 0) {
      console.log('\n📊 Device Summary:');
      devices.forEach(device => {
        const info = device.getDeviceInfo();
        console.log(`   ID ${info.id}: ${info.modelName || 'Unknown'} (Model: ${info.modelNumber})`);
      });

      // Test first device
      console.log('\n🧪 Testing first device...');
      const firstDevice = devices[0];

      try {
        // Test ping
        console.log(`   Pinging device ${firstDevice.id}...`);
        await firstDevice.ping();

        // Test LED (if supported)
        console.log(`   Testing LED on device ${firstDevice.id}...`);
        await firstDevice.setLED(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await firstDevice.setLED(false);

        // Get status information
        console.log(`   Reading status from device ${firstDevice.id}...`);
        const temperature = await firstDevice.getPresentTemperature();
        const voltage = await firstDevice.getPresentVoltage();
        const position = await firstDevice.getPresentPosition();

        console.log(`   Temperature: ${temperature}°C`);
        console.log(`   Voltage: ${firstDevice.voltageToVolts(voltage).toFixed(1)}V`);
        console.log(`   Position: ${position} (${firstDevice.positionToDegrees(position).toFixed(1)}°)`);

      } catch (error) {
        console.log(`   Error testing device: ${error.message}`);
      }
    } else {
      console.log('\n❌ No devices found. Please check:');
      console.log('   - DYNAMIXEL devices are connected to the bus');
      console.log('   - Power is supplied to the devices');
      console.log('   - Baud rate matches (default: 57600 for Protocol 2.0)');
      console.log('   - Device IDs are in the scanned range');
    }

  } catch (error) {
    console.error('\n❌ Discovery failed:', error.message);
  } finally {
    // Cleanup
    console.log('\n🔌 Disconnecting...');
    await controller.disconnect();
    console.log('👋 Goodbye!');
  }
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
