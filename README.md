# node-dynamixel

A Node.js library for controlling DYNAMIXEL servo motors using Protocol 2.0 via the U2D2 USB-to-TTL converter.

## Features

- ✅ **DYNAMIXEL Protocol 2.0** implementation with full CRC validation
- ✅ **U2D2 USB Communication** for reliable device connection
- ✅ **Device Discovery** using Ping packets
- ✅ **Individual Device Control** with convenient methods
- ✅ **Event-driven Architecture** for real-time monitoring
- ✅ **TypeScript-like JSDoc** annotations for better IDE support
- ✅ **Cross-platform** support (Linux, macOS, Windows)
- ✅ **Electron & Web Serial API** support for desktop applications
- ✅ **Multiple Connection Types** (USB, Serial, Web Serial)
- 🆕 **Separated Device Discovery** for better Electron app integration
- 🆕 **Advanced Alarm Management** with intelligent thresholds and monitoring
- 🆕 **Motor Profiles System** for optimal motor configurations
- 🆕 **Enhanced Logging** with performance metrics and structured output
- 🆕 **Multi-Motor Synchronization** optimization settings

## Supported Devices

This library supports all DYNAMIXEL devices that use Protocol 2.0, including:

- **X Series**: XL-320, XL330, XL430, XC330, XC430, XM430, XM540, XH430, XH540
- **P Series**: PH42, PH54, PM42, PM54
- **Y Series**: YM070, YM080
- **MX Series (2.0)**: MX-28(2.0), MX-64(2.0), MX-106(2.0)

## Hardware Requirements

- **U2D2** USB-to-TTL converter ([ROBOTIS U2D2](https://emanual.robotis.com/docs/en/parts/interface/u2d2/))
- Compatible DYNAMIXEL servo motors
- Appropriate power supply for your servos

## Installation

```bash
npm install dynamixel
# or
yarn add dynamixel
```

### Additional Dependencies

- **For Node.js USB support**: `npm install usb` (optional, may require sudo)
- **For Node.js Serial support**: `npm install serialport` (included as dependency)
- **For Electron**: No additional dependencies required (Web Serial API built-in)
- **For Browsers**: Use Web Serial API (Chrome/Edge 89+, no installation needed)

## Quick Start

### Node.js / Server-side

```javascript
import { DynamixelController } from 'dynamixel';

async function main() {
  // Create controller (auto-detects best connection method)
  const controller = new DynamixelController();

  // Connect to U2D2
  await controller.connect();

  // Discover devices
  const devices = await controller.quickDiscovery();
  console.log(`Found ${devices.length} DYNAMIXEL devices`);

  // Control first device
  if (devices.length > 0) {
    const device = controller.getDevice(devices[0].id);

    // Enable torque
    await device.setTorqueEnable(true);

    // Move to position (90 degrees)
    await device.setGoalPosition(device.degreesToPosition(90));

    // Wait for movement to complete
    while (await device.isMoving()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Movement complete!');
  }

  // Cleanup
  await controller.disconnect();
}

main().catch(console.error);
```

### Electron Renderer Process

```javascript
import { DynamixelController } from 'dynamixel';

async function main() {
  // Create controller for Web Serial API (Electron renderer)
  const controller = new DynamixelController({
    connectionType: 'webserial'  // Use Web Serial API
  });

  // Connect (will show browser serial port selection dialog)
  await controller.connect();

  // Rest of the code is the same as Node.js example...
  const devices = await controller.quickDiscovery();
  console.log(`Found ${devices.length} DYNAMIXEL devices`);
}

main().catch(console.error);
```

**📋 For complete Electron setup instructions, see [Electron Setup Guide](./docs/electron-setup.md)**

### Separated Device Discovery (for Electron Apps)

For Electron applications, you can separate device discovery from motor discovery to provide better user experience:

```javascript
import { DynamixelController } from 'dynamixel';

// Step 1: Discover available devices (no connection)
const devices = await DynamixelController.discoverCommunicationDevices();
console.log(`Found ${devices.usb.length} USB and ${devices.serial.length} serial devices`);

// Step 2: Get U2D2-specific devices
const u2d2Devices = await DynamixelController.discoverU2D2Devices();

// Step 3: Create controller with deferred connection
const controller = new DynamixelController({
  deferConnection: true // Don't connect immediately
});

// Step 4: Connect to specific device (user selection)
const selectedDevice = u2d2Devices[0]; // From UI selection
await controller.connectToDevice(selectedDevice);

// Step 5: Now discover motors
const motors = await controller.quickDiscovery();
console.log(`Found ${motors.length} motors`);
```

**📋 For complete separated discovery guide, see [Enhanced Features](./docs/enhanced-features.md#separated-device-discovery)**

## Architecture

The library is organized into logical layers for maintainability and extensibility:

- **`src/transport/`** - Communication layer (USB, Serial, Web Serial)
- **`src/dynamixel/`** - Protocol and device logic (Protocol 2.0, device control)
- **`src/DynamixelController.js`** - Main orchestration layer

**📋 For detailed architecture documentation, see [Architecture Guide](./docs/architecture.md)**

## API Reference

### DynamixelController

Main controller class for managing DYNAMIXEL devices.

#### Constructor

```javascript
const controller = new DynamixelController(options);
```

**Options:**
- `connectionType` (string): Connection type - `'auto'`, `'usb'`, `'serial'`, `'webserial'` (default: `'auto'`)
- `timeout` (number): Default timeout in milliseconds (default: 1000)
- `debug` (boolean): Enable debugging output (default: false)
- `baudRate` (number): Serial baud rate (default: 57600)
- `portPath` (string): Specific serial port path (for serial connections)

#### Methods

- `connect()` → `Promise<boolean>` - Connect to U2D2 device
- `disconnect()` → `Promise<void>` - Disconnect from U2D2 device
- `ping(id, timeout?)` → `Promise<Object>` - Ping specific device
- `discoverDevices(options?)` → `Promise<Array>` - Discover all devices
- `quickDiscovery(onProgress?)` → `Promise<Array>` - Quick scan (IDs 1-20)
- `fullDiscovery(onProgress?)` → `Promise<Array>` - Full scan (IDs 1-252)
- `getDevice(id)` → `DynamixelDevice|null` - Get device by ID
- `getAllDevices()` → `Array<DynamixelDevice>` - Get all discovered devices

#### Events

- `'connected'` - U2D2 connection established
- `'disconnected'` - U2D2 connection lost
- `'deviceFound'` - New device discovered
- `'discoveryComplete'` - Device discovery finished
- `'error'` - Error occurred

### DynamixelDevice

Individual device control class.

#### Methods

**Basic Control:**
- `ping(timeout?)` → `Promise<Object>` - Ping device
- `read(address, length)` → `Promise<Buffer>` - Read from control table
- `write(address, data)` → `Promise<boolean>` - Write to control table

**Convenience Methods:**
- `setTorqueEnable(enable)` → `Promise<boolean>` - Enable/disable torque
- `getTorqueEnable()` → `Promise<boolean>` - Get torque status
- `setGoalPosition(position)` → `Promise<boolean>` - Set goal position
- `getGoalPosition()` → `Promise<number>` - Get goal position
- `getPresentPosition()` → `Promise<number>` - Get current position
- `setGoalVelocity(velocity)` → `Promise<boolean>` - Set goal velocity
- `getPresentVelocity()` → `Promise<number>` - Get current velocity
- `getPresentTemperature()` → `Promise<number>` - Get temperature (°C)
- `getPresentVoltage()` → `Promise<number>` - Get voltage (0.1V units)
- `setLED(on)` → `Promise<boolean>` - Control LED
- `isMoving()` → `Promise<boolean>` - Check if device is moving

**Utility Methods:**
- `positionToDegrees(position)` → `number` - Convert position to degrees
- `degreesToPosition(degrees)` → `number` - Convert degrees to position
- `velocityToRPM(velocity)` → `number` - Convert velocity to RPM
- `rpmToVelocity(rpm)` → `number` - Convert RPM to velocity
- `voltageToVolts(reading)` → `number` - Convert voltage reading to volts

## Connection Types

The library supports multiple connection methods and automatically detects the best one for your environment:

### Auto-Detection (Recommended)

```javascript
// Auto-detects best connection: Web Serial API in browsers/Electron, SerialPort in Node.js
const controller = new DynamixelController({ connectionType: 'auto' });
```

### Web Serial API (Browsers & Electron)

```javascript
// Force Web Serial API (for Electron renderer or modern browsers)
const controller = new DynamixelController({ connectionType: 'webserial' });
```

### Node.js Serial Port

```javascript
// Use Node.js SerialPort (no sudo required)
const controller = new DynamixelController({
  connectionType: 'serial',
  portPath: '/dev/ttyUSB0'  // Optional: specify port
});
```

### USB Direct (Node.js)

```javascript
// Direct USB communication (may require sudo on some systems)
const controller = new DynamixelController({ connectionType: 'usb' });
```

## Examples

### Device Discovery

```javascript
import { DynamixelController } from 'dynamixel';

const controller = new DynamixelController();

// Event-driven discovery
controller.on('deviceFound', (device) => {
  console.log(`Found: ID ${device.id}, Model: ${device.modelNumber}`);
});

await controller.connect();
const devices = await controller.quickDiscovery();
console.log(`Discovery complete: ${devices.length} devices found`);
```

### Position Control

```javascript
const device = controller.getDevice(1);

// Enable torque
await device.setTorqueEnable(true);

// Move to 180 degrees
const goalPosition = device.degreesToPosition(180);
await device.setGoalPosition(goalPosition);

// Monitor movement
while (await device.isMoving()) {
  const currentPos = await device.getPresentPosition();
  const degrees = device.positionToDegrees(currentPos);
  console.log(`Current position: ${degrees.toFixed(1)}°`);

  await new Promise(resolve => setTimeout(resolve, 100));
}
```

### Velocity Control

```javascript
const device = controller.getDevice(1);

// Set to velocity control mode (if supported by model)
await device.setTorqueEnable(false); // Disable torque first
// ... set operating mode to velocity control ...
await device.setTorqueEnable(true);

// Set goal velocity (50 RPM)
const goalVelocity = device.rpmToVelocity(50);
await device.setGoalVelocity(goalVelocity);
```

### Multiple Device Control

```javascript
const devices = controller.getAllDevices();

// Control multiple devices simultaneously
const promises = devices.map(async (device) => {
  await device.setTorqueEnable(true);
  const randomPosition = Math.random() * 4095;
  await device.setGoalPosition(randomPosition);
});

await Promise.all(promises);
console.log('All devices moving!');
```

## Enhanced Features (Inspired by DynaNode)

The library includes several advanced features for professional robotics applications:

### Alarm Management

Advanced alarm system with intelligent thresholds and monitoring:

```javascript
import { AlarmManager } from 'dynamixel';

const alarmManager = new AlarmManager();

// Set up alarm listeners
alarmManager.on('alarm', (alarm) => {
  console.log(`⚠️ ${alarm.severity}: ${alarm.message}`);
});

alarmManager.on('emergency_stop', (event) => {
  console.log(`🛑 Emergency stop for device ${event.deviceId}`);
  // Implement emergency stop logic
});

// Monitor device sensors
alarmManager.checkSensorAlarms(deviceId, {
  temperature: 75,  // °C
  voltage: 12.0,    // V
  load: 85          // %
});

// Process hardware error flags
alarmManager.processHardwareError(deviceId, errorFlags);
```

### Motor Profiles

Predefined configurations for different motor models and applications:

```javascript
import { MotorProfiles } from 'dynamixel';

const motorProfiles = new MotorProfiles();

// Get profile for specific motor
const profile = motorProfiles.getProfile('XM430-W350');
console.log('Max torque:', profile.specs.stallTorque, 'kg·cm');

// Get recommended settings for precision mode
const settings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');
await device.applySettings(settings);

// Get application profiles
const armProfile = motorProfiles.getProfile('ROBOT_ARM_6DOF');
console.log('Application:', armProfile.description);

// Multi-motor synchronization settings
const syncSettings = motorProfiles.getSynchronizationSettings(['XM430-W350', 'MX-28']);
console.log('Recommended sync velocity:', syncSettings.recommendedVelocity);
```

### Enhanced Logging

Structured logging with performance metrics and filtering:

```javascript
import { Logger } from 'dynamixel';

const logger = new Logger({
  level: 'debug',
  enablePerformanceMetrics: true
});

// Create device-specific logger
const deviceLogger = logger.forDevice(1);

// Performance measurement
const result = await logger.measureAsync('device_discovery', async () => {
  return await controller.discoverDevices();
});

// Protocol logging
logger.logPacketSent(deviceId, 'PING', [], { duration: 2.5 });
logger.logPacketReceived(deviceId, packet, { duration: 1.8 });

// Get filtered logs
const errorLogs = logger.getLogs({ level: 'error', deviceId: 1 });
const exportedLogs = logger.exportLogs('csv', { since: Date.now() - 3600000 });
```

### Complete Enhanced Example

```javascript
import {
  DynamixelController,
  AlarmManager,
  MotorProfiles,
  Logger
} from 'dynamixel';

// Setup enhanced features
const logger = new Logger({ level: 'debug', enablePerformanceMetrics: true });
const alarmManager = new AlarmManager();
const motorProfiles = new MotorProfiles();

const controller = new DynamixelController({
  connectionType: 'auto',
  logger: logger.forCategory('controller')
});

// Enhanced event handling
controller.on('device_discovered', (device) => {
  logger.info(`Device discovered: ${device.modelName} (ID: ${device.id})`);

  // Apply motor profile
  const profile = motorProfiles.getProfile(device.modelName);
  if (profile) {
    const settings = motorProfiles.getRecommendedSettings(device.modelName, 'balanced');
    // Apply settings to device...
  }
});

// Monitor devices with alarms
async function monitorDevice(device) {
  const status = await device.getStatus();

  // Check for alarms
  alarmManager.checkSensorAlarms(device.id, {
    temperature: status.temperature,
    voltage: status.voltage,
    load: status.load
  });

  // Process hardware errors
  if (status.hardwareError > 0) {
    alarmManager.processHardwareError(device.id, status.hardwareError);
  }
}

// Use enhanced discovery with monitoring
const devices = await logger.measureAsync('enhanced_discovery', async () => {
  return await controller.discoverDevices();
});

// Monitor all devices
for (const device of devices) {
  await monitorDevice(device);
}
```

## Error Handling

The library includes comprehensive error handling:

```javascript
try {
  await device.setGoalPosition(2048);
} catch (error) {
  if (error.message.includes('CRC mismatch')) {
    console.log('Communication error - check connections');
  } else if (error.message.includes('Timeout')) {
    console.log('Device not responding - check power and ID');
  } else {
    console.log('Device error:', error.message);
  }
}
```

## Troubleshooting

### U2D2 Not Found
- Ensure U2D2 is connected via USB
- Install FTDI drivers if needed
- Check that device permissions allow access
- Verify no other software is using the device

### No Devices Found
- Check DYNAMIXEL power supply
- Verify baud rate (default: 57600 for Protocol 2.0)
- Ensure devices are properly wired
- Try different ID ranges in discovery

### Communication Errors
- Check cable connections
- Verify proper termination resistors
- Reduce baud rate if experiencing errors
- Ensure adequate power supply

## Protocol 2.0 Reference

This library implements [DYNAMIXEL Protocol 2.0](https://emanual.robotis.com/docs/en/dxl/protocol2/) as specified by ROBOTIS.

**Key Features:**
- 16-bit CRC error detection
- Extended ID range (0-252)
- Improved packet structure
- Enhanced error reporting

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.

## Links

- [DYNAMIXEL Protocol 2.0 Documentation](https://emanual.robotis.com/docs/en/dxl/protocol2/)
- [U2D2 Interface Documentation](https://emanual.robotis.com/docs/en/parts/interface/u2d2/)
- [ROBOTIS Official Website](https://www.robotis.us/)
