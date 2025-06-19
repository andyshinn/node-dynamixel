# Enhanced Features Documentation

## Overview

Our DYNAMIXEL library has been enhanced with several advanced features inspired by the DynaNode architecture, providing professional-grade monitoring, configuration management, and logging capabilities.

## New Components

### 1. AlarmManager (`src/dynamixel/AlarmManager.js`)

An intelligent alarm system that monitors device health and triggers appropriate responses.

#### Features:
- **Threshold-based monitoring** for temperature, voltage, and load
- **Hardware error processing** from DYNAMIXEL status packets
- **Alarm history tracking** with configurable limits
- **Emergency stop triggers** for critical conditions
- **Multi-device alarm management**

#### Usage:
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
```

### 2. MotorProfiles (`src/dynamixel/MotorProfiles.js`)

A comprehensive motor configuration system with predefined profiles for optimal performance.

#### Features:
- **Predefined motor profiles** for AX, MX, and X series
- **Application-specific configurations** (robot arms, mobile robots, grippers)
- **Setting validation** against motor specifications
- **Custom profile creation** for specialized motors
- **Multi-motor synchronization** optimization

#### Usage:
```javascript
import { MotorProfiles } from 'dynamixel';

const motorProfiles = new MotorProfiles();

// Get recommended settings for precision control
const settings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');

// Validate settings against motor specs
const validation = motorProfiles.validateProfile('XM430-W350', {
  goalPosition: 2048,
  goalVelocity: 50
});

// Get synchronization settings for multiple motors
const syncSettings = motorProfiles.getSynchronizationSettings([
  'XM430-W350', 'MX-28', 'AX-12A'
]);
```

### 3. Enhanced Logger (`src/utils/Logger.js`)

A professional logging system with structured output and performance tracking.

#### Features:
- **Configurable log levels** (trace, debug, info, warn, error, fatal)
- **Performance metrics** tracking with timing measurements
- **Protocol-level logging** for debugging communication
- **Log filtering and export** (JSON, CSV, text formats)
- **Device and category-specific** loggers

#### Usage:
```javascript
import { Logger } from 'dynamixel';

const logger = new Logger({
  level: 'debug',
  enablePerformanceMetrics: true
});

// Basic logging
logger.info('Device connected', { deviceId: 1, category: 'connection' });

// Performance measurement
const result = await logger.measureAsync('device_scan', async () => {
  return await scanForDevices();
});

// Create specialized loggers
const deviceLogger = logger.forDevice(5);
const protocolLogger = logger.forCategory('protocol');
```

## Test Coverage

### Unit Tests
- **AlarmManager.test.js**: 29 tests covering all alarm management functionality
- **MotorProfiles.test.js**: 32 tests covering profile management and validation
- **Logger.test.js**: 30 tests covering logging, performance tracking, and export

### Integration Tests
- **EnhancedFeatures.test.js**: 17 tests demonstrating real-world scenarios combining all enhanced features

## Key Benefits

### 1. Production-Ready Monitoring
- Real-time sensor monitoring with intelligent thresholds
- Automatic emergency stop for critical conditions
- Comprehensive alarm history and statistics

### 2. Optimized Motor Control
- Motor-specific configurations for best performance
- Application templates for common robotics scenarios
- Validation to prevent invalid settings

### 3. Professional Debugging
- Structured logging with filtering and export capabilities
- Performance profiling for optimization
- Protocol-level debugging for communication issues

### 4. Event-Driven Architecture
- Seamless integration between components
- Real-time event coordination
- Extensible for custom monitoring needs

## Architecture Inspiration

These features were inspired by the DynaNode project's architectural decisions:

- **Structured alarm handling** with severity classification
- **Motor profile systems** for optimized configurations
- **Enhanced logging** with performance metrics
- **Event-driven coordination** between components

## Usage Examples

See `examples/enhanced-features.js` for a comprehensive demonstration of all enhanced features working together in realistic robotics scenarios.

## API Reference

For detailed API documentation, see the JSDoc comments in each module:
- `src/dynamixel/AlarmManager.js`
- `src/dynamixel/MotorProfiles.js`
- `src/utils/Logger.js`

## Separated Device Discovery

### Overview

The separated device discovery feature allows you to discover USB and serial communication devices before connecting to them. This is particularly useful for Electron applications where you want to:

1. **Discover available devices** without creating connections
2. **Present a device selection UI** to users
3. **Connect to a specific selected device**
4. **Then discover motors** on that device

This separation of concerns provides better user experience and more control over the connection process.

### Basic Usage

```javascript
import { DynamixelController } from 'node-dynamixel';

// Step 1: Discover available communication devices (no connection created)
const devices = await DynamixelController.discoverCommunicationDevices();

console.log(`Found ${devices.usb.length} USB devices`);
console.log(`Found ${devices.serial.length} serial devices`);

// Get U2D2-specific devices (recommended)
const u2d2Devices = await DynamixelController.discoverU2D2Devices();

// Step 2: Let user select a device (in UI)
const selectedDevice = u2d2Devices[0]; // User selection

// Step 3: Create controller with deferred connection
const controller = new DynamixelController({
  deferConnection: true // Don't connect immediately
});

// Step 4: Connect to the selected device
const connected = await controller.connectToDevice(selectedDevice);

if (connected) {
  // Step 5: Now discover motors on the connected device
  const motors = await controller.quickDiscovery();
  console.log(`Found ${motors.length} motors`);
}
```

### Device Discovery Methods

#### `DynamixelController.discoverCommunicationDevices()`

Discovers all available USB and serial communication devices:

```javascript
const devices = await DynamixelController.discoverCommunicationDevices();

// Returns:
{
  usb: [
    {
      vendorId: 0x0403,
      productId: 0x6014,
      type: 'usb',
      name: 'USB Device (VID: 0x0403, PID: 0x6014)',
      isU2D2: true
    }
  ],
  serial: [
    {
      path: '/dev/ttyUSB0',
      manufacturer: 'FTDI',
      vendorId: '0403',
      productId: '6014',
      type: 'serial',
      name: '/dev/ttyUSB0 - FTDI',
      isU2D2: true
    }
  ],
  webserial: true // If Web Serial API is supported
}
```

#### `DynamixelController.discoverU2D2Devices()`

Discovers U2D2-compatible devices specifically:

```javascript
const u2d2Devices = await DynamixelController.discoverU2D2Devices();

// Returns array of U2D2-compatible devices with recommended flag
[
  {
    vendorId: 0x0403,
    productId: 0x6014,
    type: 'usb',
    name: 'U2D2 USB Device',
    recommended: true
  }
]
```

### Connection Methods

#### Constructor with Deferred Connection

```javascript
const controller = new DynamixelController({
  deferConnection: true, // Don't create connection immediately
  timeout: 1000,
  debug: false
});
```

#### `connectToDevice(deviceInfo)`

Connect to a specific discovered device:

```javascript
const deviceInfo = {
  type: 'usb', // or 'serial'
  vendorId: 0x0403,
  productId: 0x6014,
  // ... other device properties
};

const connected = await controller.connectToDevice(deviceInfo);
```

### Electron Application Integration

For Electron applications, you can use the provided `DynamixelService` class that encapsulates the separated discovery workflow:

```javascript
// In main process
import { DynamixelService } from './services/DynamixelService.js';

const dynamixelService = new DynamixelService();

// IPC handlers
ipcMain.handle('dynamixel:discoverDevices', () =>
  dynamixelService.discoverDevices()
);

ipcMain.handle('dynamixel:connectToDevice', (event, deviceInfo) =>
  dynamixelService.connectToDevice(deviceInfo)
);

ipcMain.handle('dynamixel:discoverMotors', (event, options) =>
  dynamixelService.discoverMotors(options)
);
```

```javascript
// In renderer process
class DynamixelClient {
  async discoverDevices() {
    return await window.electronAPI.invoke('dynamixel:discoverDevices');
  }

  async connectToDevice(deviceInfo) {
    return await window.electronAPI.invoke('dynamixel:connectToDevice', deviceInfo);
  }

  async discoverMotors(options = {}) {
    return await window.electronAPI.invoke('dynamixel:discoverMotors', options);
  }
}
```

### Benefits

1. **Better UX**: Users can see and select from available devices
2. **Error Handling**: Better error messages for connection issues
3. **Multiple Devices**: Support for multiple U2D2 devices
4. **Resource Management**: Only connect when needed
5. **Electron Friendly**: Perfect for desktop applications

### Backward Compatibility

The existing API continues to work unchanged:

```javascript
// This still works as before
const controller = new DynamixelController();
await controller.connect();
const motors = await controller.quickDiscovery();
```

## Motor Diagnostics

// ... existing content ...
