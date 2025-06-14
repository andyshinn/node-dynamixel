# Library Architecture

This document describes the organized structure of the DYNAMIXEL library.

## Directory Structure

```
src/
├── dynamixel/           # DYNAMIXEL protocol and device logic
│   ├── constants.js     # Protocol constants and control table definitions
│   ├── Protocol2.js     # DYNAMIXEL Protocol 2.0 implementation
│   ├── DynamixelDevice.js # Individual device control class
│   └── index.js         # Exports for dynamixel layer
├── transport/           # Communication layer abstractions
│   ├── U2D2Connection.js    # USB direct communication (Node.js)
│   ├── SerialConnection.js  # Serial port communication (Node.js)
│   ├── WebSerialConnection.js # Web Serial API (browsers/Electron)
│   └── index.js         # Exports for transport layer
└── DynamixelController.js   # Main controller orchestrating everything
```

## Layer Responsibilities

### Transport Layer (`src/transport/`)

Handles low-level communication with DYNAMIXEL devices through different interfaces:

- **U2D2Connection**: Direct USB communication using the `usb` package
- **SerialConnection**: Serial port communication using the `serialport` package
- **WebSerialConnection**: Web Serial API for browsers and Electron renderer processes

**Key Features:**
- Automatic device detection and connection
- Packet transmission and reception
- Error handling and reconnection logic
- Environment-specific optimizations

### DYNAMIXEL Layer (`src/dynamixel/`)

Contains DYNAMIXEL-specific protocol implementation and device abstractions:

- **constants.js**: Protocol 2.0 constants, control table addresses, device models
- **Protocol2.js**: Packet construction, parsing, CRC calculation, error handling
- **DynamixelDevice.js**: High-level device control with convenience methods

**Key Features:**
- Full Protocol 2.0 implementation with CRC validation
- Device-specific control table mappings
- Unit conversion utilities (degrees, RPM, voltage)
- Error code interpretation

### Controller Layer (`src/`)

The main orchestration layer that ties everything together:

- **DynamixelController.js**: Main API entry point, device discovery, connection management

**Key Features:**
- Auto-detection of best transport method
- Device discovery and management
- Event-driven architecture
- Connection lifecycle management

## Import Structure

### Clean Imports

The reorganized structure allows for cleaner imports:

```javascript
// Before reorganization
import { U2D2Connection } from './src/U2D2Connection.js';
import { SerialConnection } from './src/SerialConnection.js';
import { WebSerialConnection } from './src/WebSerialConnection.js';
import { DynamixelDevice } from './src/DynamixelDevice.js';
import { Protocol2 } from './src/Protocol2.js';

// After reorganization
import { U2D2Connection, SerialConnection, WebSerialConnection } from './src/transport/index.js';
import { DynamixelDevice, Protocol2 } from './src/dynamixel/index.js';
```

### Public API

The main library exports remain unchanged for backward compatibility:

```javascript
import {
  DynamixelController,
  DynamixelDevice,
  Protocol2,
  U2D2Connection,
  SerialConnection,
  WebSerialConnection
} from 'dynamixel';
```

## Benefits of This Structure

### 1. **Separation of Concerns**
- Transport logic is isolated from protocol logic
- Device-specific code is separated from connection management
- Each layer has a single, well-defined responsibility

### 2. **Maintainability**
- Easier to add new transport methods (e.g., Bluetooth, WiFi)
- Protocol changes don't affect transport implementations
- Clear boundaries make debugging easier

### 3. **Testability**
- Each layer can be unit tested independently
- Mock implementations can be easily substituted
- Integration tests can focus on specific layer interactions

### 4. **Extensibility**
- New device types can be added to the dynamixel layer
- New communication methods can be added to the transport layer
- Controller logic can evolve independently

### 5. **Code Reusability**
- Transport implementations can be reused for other protocols
- Protocol implementation can work with any transport
- Device abstractions are transport-agnostic

## Design Patterns

### 1. **Strategy Pattern**
The controller uses different transport strategies based on the environment:
- USB strategy for Node.js with direct hardware access
- Serial strategy for Node.js with standard serial ports
- Web Serial strategy for browsers and Electron

### 2. **Factory Pattern**
The controller automatically creates the appropriate transport instance based on environment detection.

### 3. **Observer Pattern**
Event-driven architecture allows loose coupling between layers:
- Transport layer emits connection events
- Device layer emits device-specific events
- Controller layer coordinates and forwards events

### 4. **Adapter Pattern**
Each transport class adapts different underlying APIs (USB, SerialPort, Web Serial) to a common interface.

## Future Enhancements

This structure makes it easy to add:

### New Transport Methods
- **Bluetooth**: `src/transport/BluetoothConnection.js`
- **WiFi/TCP**: `src/transport/WiFiConnection.js`
- **WebSocket**: `src/transport/WebSocketConnection.js`

### New Protocol Versions
- **Protocol 1.0**: `src/dynamixel/Protocol1.js`
- **Custom Protocols**: `src/dynamixel/CustomProtocol.js`

### New Device Types
- **Sensors**: `src/dynamixel/DynamixelSensor.js`
- **Grippers**: `src/dynamixel/DynamixelGripper.js`

### Enhanced Features
- **Connection Pooling**: Multiple simultaneous connections
- **Device Caching**: Persistent device state management
- **Batch Operations**: Optimized multi-device commands

This architecture provides a solid foundation for the library's continued growth and evolution.
