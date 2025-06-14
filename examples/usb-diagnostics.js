#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Example: USB Diagnostics
 * This example helps diagnose USB connection issues with the U2D2 device
 */

async function main() {
  console.log('🔧 DYNAMIXEL U2D2 USB Diagnostics Tool\n');
  console.log('This tool will help diagnose USB connection issues with your U2D2 device.\n');

  // Run comprehensive diagnostics
  const diagnostics = DynamixelController.performUSBDiagnostics();

  // Additional checks
  console.log('\n🧪 Additional Checks:');

  // Check Node.js version compatibility
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    console.log('   ⚠️  Node.js version may be too old (current: ' + nodeVersion + ')');
    console.log('   • Recommended: Node.js 16 or higher');
  } else {
    console.log('   ✅ Node.js version is compatible (' + nodeVersion + ')');
  }

  // Check if running as root/admin
  if (diagnostics.systemInfo.platform === 'darwin' && !diagnostics.systemInfo.isRoot) {
    console.log('   ⚠️  Not running with elevated privileges');
    console.log('   • This is often required on macOS for USB access');
  }

  if (diagnostics.u2d2Found) {
    console.log('\n🧪 Testing U2D2 Connection:');
    const controller = new DynamixelController({
      timeout: 5000,
      debug: true // Enable USB debugging
    });

    // Set up event listeners for detailed error reporting
    controller.on('error', (error) => {
      console.error('❌ Connection Error Details:', error.message);

      // Provide specific guidance based on error type
      if (error.message.includes('Permission denied') || error.message.includes('LIBUSB_ERROR_ACCESS')) {
        console.log('\n💡 Access Error Solutions:');
        console.log('   1. Try running with sudo:');
        console.log('      sudo node examples/usb-diagnostics.js');
        console.log('   2. Check if other software is using the U2D2');
        console.log('   3. Try unplugging and reconnecting the U2D2');
        console.log('   4. On newer macOS, check Privacy & Security settings');
      }
    });

    try {
      console.log('   Attempting connection...');
      const connected = await controller.connect();

      if (connected) {
        console.log('   ✅ Successfully connected to U2D2!');
        console.log('   📡 Connection is working properly');

        // Quick test
        console.log('   🧪 Testing basic communication...');
        try {
          await controller.ping(1, 100); // Quick ping test
          console.log('   ✅ Communication test passed');
        } catch (pingError) {
          console.log('   ℹ️  No DYNAMIXEL found at ID 1 (this is normal if no devices are connected)');
        }

        await controller.disconnect();
        console.log('   ✅ Disconnected successfully');
      } else {
        console.log('   ❌ Failed to connect to U2D2');
      }

    } catch (testError) {
      console.log('   ❌ Connection test failed:', testError.message);
    }
  }

  // Summary and next steps
  console.log('\n📋 Summary:');
  if (diagnostics.u2d2Found) {
    console.log('   ✅ U2D2 device detected');
    console.log('   💻 Platform:', diagnostics.systemInfo.platform);
    console.log('   🔑 Root access:', diagnostics.systemInfo.isRoot);

    console.log('\n🎯 Next Steps:');
    if (diagnostics.systemInfo.platform === 'darwin' && !diagnostics.systemInfo.isRoot) {
      console.log('   1. Try running with: sudo node examples/device-discovery.js');
      console.log('   2. Or check macOS Privacy & Security settings');
    }
    console.log('   3. Ensure no other applications are using the U2D2');
    console.log('   4. Try the device discovery example: npm run example:discovery');
  } else {
    console.log('   ❌ U2D2 device not found');
    console.log('\n🎯 Troubleshooting Steps:');
    console.log('   1. Check USB cable connection');
    console.log('   2. Try a different USB port');
    console.log('   3. Verify U2D2 power (LED should be on)');
    console.log('   4. Check device manager (Windows) or system info (macOS/Linux)');
  }

  console.log('\n📚 Additional Resources:');
  console.log('   • U2D2 Manual: https://emanual.robotis.com/docs/en/parts/interface/u2d2/');
  console.log('   • DYNAMIXEL SDK: https://github.com/ROBOTIS-GIT/DynamixelSDK');
  console.log('   • Driver Downloads: https://ftdichip.com/drivers/');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Diagnostics interrupted');
  process.exit(0);
});

// Run diagnostics
main().catch(console.error);
