import { DynamixelController } from '../src/DynamixelController.js';

console.log('🔧 DYNAMIXEL Motor Diagnostics Tool');
console.log('====================================');
console.log('This tool will help diagnose why your DYNAMIXEL-X motor is not being discovered.\n');

const COMMON_BAUD_RATES = [
  57600,   // Default for most DYNAMIXEL-X
  1000000, // High-speed option
  115200,  // Common alternative
  2000000, // Very high-speed
  3000000, // Maximum for some models
  9600,    // Low-speed fallback
];

const EXTENDED_ID_RANGES = [
  { name: 'Default Range', start: 1, end: 20 },
  { name: 'Extended Range', start: 1, end: 50 },
  { name: 'Full Range', start: 1, end: 253 },
];

async function testConnection() {
  console.log('🔌 Step 1: Testing U2D2 Connection');
  console.log('─'.repeat(40));

  const controller = new DynamixelController();

  try {
    await controller.connect();
    console.log('✅ U2D2 connection successful!');
    console.log('📍 Connection type:', controller.connection.constructor.name);

    if (controller.connection.portPath) {
      console.log('📍 Port:', controller.connection.portPath);
    }

    return controller;
  } catch (error) {
    console.error('❌ U2D2 connection failed:', error.message);
    console.log('\n🚨 Cannot proceed without U2D2 connection.');
    console.log('Please ensure:');
    console.log('• U2D2 is connected via USB');
    console.log('• Required drivers are installed');
    console.log('• No other software is using the device');
    process.exit(1);
  }
}

async function testBaudRates(controller) {
  console.log('\n🔍 Step 2: Testing Different Baud Rates');
  console.log('─'.repeat(40));
  console.log('DYNAMIXEL-X motors may be configured with different baud rates.\n');

  for (const baudRate of COMMON_BAUD_RATES) {
    console.log(`📡 Testing baud rate: ${baudRate}...`);

    try {
      // Set new baud rate
      controller.setBaudRate(baudRate);

      // Quick scan of first 10 IDs
      let foundDevices = [];
      for (let id = 1; id <= 10; id++) {
        try {
          const result = await controller.ping(id);
          if (result.success) {
            foundDevices.push({
              id,
              model: result.modelNumber,
              firmware: result.firmwareVersion
            });
          }
        } catch (e) {
          // Silent fail for ping attempts
        }
      }

      if (foundDevices.length > 0) {
        console.log(`✅ Found ${foundDevices.length} device(s) at ${baudRate} baud!`);
        for (const device of foundDevices) {
          console.log(`   📍 ID ${device.id}: Model ${device.model}, FW ${device.firmware}`);
        }
        return { baudRate, devices: foundDevices };
      } else {
        console.log(`   No devices found at ${baudRate} baud`);
      }
    } catch (error) {
      console.log(`   Error testing ${baudRate}: ${error.message}`);
    }
  }

  console.log('❌ No devices found at any tested baud rate');
  return null;
}

async function testExtendedRanges(controller, workingBaudRate) {
  console.log('\n🔍 Step 3: Extended ID Range Testing');
  console.log('─'.repeat(40));
  console.log(`Using baud rate: ${workingBaudRate}\n`);

  controller.setBaudRate(workingBaudRate);

  for (const range of EXTENDED_ID_RANGES) {
    console.log(`📍 Testing ${range.name} (ID ${range.start}-${range.end})...`);

    let foundDevices = [];
    let scannedCount = 0;

    for (let id = range.start; id <= range.end; id++) {
      scannedCount++;

      // Show progress for larger ranges
      if (range.end > 20 && scannedCount % 10 === 0) {
        process.stdout.write(`   Progress: ${scannedCount}/${range.end - range.start + 1}\r`);
      }

      try {
        const result = await controller.ping(id);
        if (result.success) {
          foundDevices.push({
            id,
            model: result.modelNumber,
            firmware: result.firmwareVersion
          });
          console.log(`\n   ✅ Found device at ID ${id}: Model ${result.modelNumber}`);
        }
      } catch (e) {
        // Silent fail for ping attempts
      }
    }

    if (range.end > 20) {
      console.log(''); // New line after progress
    }

    console.log(`   Result: ${foundDevices.length} device(s) found in ${range.name}`);

    if (foundDevices.length > 0) {
      return foundDevices;
    }
  }

  return [];
}

async function performHardwareChecks() {
  console.log('\n🔧 Step 4: Hardware Diagnostic Checklist');
  console.log('─'.repeat(40));

  console.log('Please verify the following:');
  console.log('');

  console.log('🔌 Power Supply:');
  console.log('   • DYNAMIXEL motor has external power connected');
  console.log('   • Power supply voltage matches motor requirements (usually 12V)');
  console.log('   • Power supply current capacity is sufficient (check motor specs)');
  console.log('   • Power LED on motor is lit (if available)');
  console.log('');

  console.log('🔗 Physical Connections:');
  console.log('   • 3-pin cable securely connected to motor');
  console.log('   • 3-pin cable securely connected to U2D2');
  console.log('   • No loose connections or damaged cables');
  console.log('   • Correct cable orientation (not reversed)');
  console.log('');

  console.log('⚙️  Motor Configuration:');
  console.log('   • Motor is not in an error state');
  console.log('   • Motor ID has not been changed from default (usually 1)');
  console.log('   • Motor baud rate has not been changed from default (usually 57600)');
  console.log('   • Motor is DYNAMIXEL Protocol 2.0 compatible (X-series should be)');
  console.log('');

  console.log('🛠️  Troubleshooting Steps:');
  console.log('   1. Try a different 3-pin cable');
  console.log('   2. Test with DYNAMIXEL Wizard software');
  console.log('   3. Reset motor to factory defaults (if possible)');
  console.log('   4. Check motor manual for specific requirements');
}

async function runDiagnostics() {
  try {
    // Test connection
    const controller = await testConnection();

    // Test baud rates
    const baudResult = await testBaudRates(controller);

    if (baudResult) {
      console.log(`\n🎉 SUCCESS! Found devices at ${baudResult.baudRate} baud rate!`);

      // Test extended ranges if devices found
      const extendedDevices = await testExtendedRanges(controller, baudResult.baudRate);

      if (extendedDevices.length > 0) {
        console.log('\n📋 Final Device Summary:');
        console.log('─'.repeat(40));
        for (const device of extendedDevices) {
          console.log(`   ID ${device.id}: Model ${device.model}, Firmware ${device.firmware}`);
        }
      }
    } else {
      console.log('\n❌ No devices detected during baud rate testing.');
      await performHardwareChecks();
    }

    await controller.disconnect();
    console.log('\n✅ Diagnostics complete!');

  } catch (error) {
    console.error('\n💥 Diagnostic error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run diagnostics
runDiagnostics();
