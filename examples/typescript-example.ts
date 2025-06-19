/**
 * TypeScript Example for DYNAMIXEL Library
 *
 * This example demonstrates how to use the dynamixel library
 * in a TypeScript project with full type safety and IntelliSense support.
 *
 * To use this example:
 * 1. Install the library: npm install dynamixel
 * 2. Compile with TypeScript: npx tsc typescript-example.ts
 * 3. Run with Node.js: node typescript-example.js
 */

import {
  DynamixelController,
  DynamixelDevice,
  INSTRUCTIONS,
  CONTROL_TABLE
} from '../index.esm.js';

// TypeScript will provide full type checking and IntelliSense
async function main(): Promise<void> {
  try {
    // Create controller with typed options
    const controller = new DynamixelController({
      connectionType: 'auto',  // TypeScript knows valid options: 'auto' | 'serial' | 'usb' | 'webserial'
      timeout: 5000,
      debug: true
    });

    // Connect with proper return type checking
    const connected: boolean = await controller.connect();
    if (!connected) {
      console.error('❌ Failed to connect to DYNAMIXEL devices');
      return;
    }

    console.log('✅ Connected to DYNAMIXEL controller');

    // Discover devices with type-safe options
    const devices = await controller.discoverDevices({
      range: 'quick',     // TypeScript validates: 'quick' | 'full' | number[] | { start: number, end: number }
      timeout: 100,
      onProgress: (progress) => {
        // TypeScript knows the progress object structure
        console.log(`Discovery progress: ${progress.current}/${progress.total}`);
      }
    });

    console.log(`🔍 Found ${devices.length} DYNAMIXEL devices`);

    // Work with individual devices with full type safety
    for (const deviceInfo of devices) {
      const device: DynamixelDevice | null = controller.getDevice(deviceInfo.id);
      if (!device) continue;

      console.log(`\n📡 Device ID ${deviceInfo.id}:`);

      // All device methods are properly typed
      const position: number = await device.getPresentPosition();
      const temperature: number = await device.getPresentTemperature();
      const voltage: number = await device.getPresentVoltage();
      const isMoving: boolean = await device.isMoving();

      // Unit conversion methods with proper typing
      const degrees: number = device.positionToDegrees(position);
      const volts: number = device.voltageToVolts(voltage);

      console.log(`  Position: ${position} (${degrees.toFixed(1)}°)`);
      console.log(`  Temperature: ${temperature}°C`);
      console.log(`  Voltage: ${volts.toFixed(1)}V`);
      console.log(`  Moving: ${isMoving}`);

      // Set goal position with type checking
      if (!isMoving) {
        const targetPosition: number = device.degreesToPosition(180);
        await device.setGoalPosition(targetPosition);
        console.log(`  ➡️  Moving to 180° (position: ${targetPosition})`);
      }

      // LED control with boolean type checking
      await device.setLED(true);
      const ledState: boolean = await device.getLED();
      console.log(`  💡 LED: ${ledState ? 'ON' : 'OFF'}`);
    }

    // Use constants with proper typing
    console.log(`\n📋 Protocol Constants:`);
    console.log(`  PING instruction: 0x${INSTRUCTIONS.PING.toString(16)}`);
    console.log(`  LED register: ${CONTROL_TABLE.LED}`);
    console.log(`  Position register: ${CONTROL_TABLE.PRESENT_POSITION}`);

    // Connection status with typed return
    const connectionStatus: boolean = controller.getConnectionStatus();
    console.log(`\n📊 Connection Status: ${connectionStatus ? 'Connected' : 'Disconnected'}`);

    // Get static information with proper typing
    const deviceCount: number = controller.getDeviceCount();
    const allDevices: DynamixelDevice[] = controller.getAllDevices();

    console.log(`\n📈 Summary:`);
    console.log(`  Total devices: ${deviceCount}`);
    console.log(`  Managed devices: ${allDevices.length}`);

    // Static utility methods with type safety
    const modelName: string = DynamixelController.getModelName(1060);
    console.log(`  XL430-W250 model number 1060: ${modelName}`);

    // Disconnect
    await controller.disconnect();
    console.log('👋 Disconnected from DYNAMIXEL devices');

  } catch (error) {
    // TypeScript knows this is Error | unknown
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

// Entry point with proper typing
if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

export { main };

// Example 1: Using deferConnection with proper TypeScript typing
const controller1 = new DynamixelController({
  deferConnection: true,  // TypeScript should recognize this as boolean
  connectionType: 'auto',
  timeout: 5000,
  debug: false
});

// Example 2: Verify the property is properly typed
console.log('deferConnection type:', typeof controller1.deferConnection); // Should be 'boolean'
console.log('deferConnection value:', controller1.deferConnection); // Should be true

// Example 3: TypeScript should provide intellisense for the options
const controller2 = new DynamixelController({
  deferConnection: false,
  connectionType: 'serial',
  baudRate: 1000000,
  portPath: '/dev/ttyUSB0'
});

// Example 4: Demonstrate the separated discovery workflow with types
async function demonstrateTypedWorkflow() {
  try {
    // 1. Discover devices without connecting
    const devices = await DynamixelController.discoverCommunicationDevices();
    console.log('Discovered devices:', devices);

    // 2. Create controller with deferred connection
    const controller = new DynamixelController({
      deferConnection: true  // Properly typed as boolean
    });

    // 3. Connect to a specific device
    if (devices.usb.length > 0) {
      const success = await controller.connectToDevice(devices.usb[0]);
      console.log('Connection successful:', success);
    }

    // 4. Discover motors on connected device
    const motors = await controller.discoverDevices();
    console.log('Found motors:', motors.length);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Export for module usage
export { demonstrateTypedWorkflow };

// Run if called directly (Node.js module check)
if (require.main === module) {
  demonstrateTypedWorkflow().catch(console.error);
}
