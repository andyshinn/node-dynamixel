# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-07-17

### Added
- **Indirect Addressing Support** - Complete DYNAMIXEL indirect addressing functionality
  - `setupIndirectAddress(index, targetAddress)` - Map control table addresses to indirect slots
  - `writeIndirectData(index, value)` / `readIndirectData(index)` - Read/write through indirect addressing
  - `bulkReadIndirect(indices)` / `bulkWriteIndirect(mappings)` - Optimized bulk operations with contiguous address detection
  - `setupCommonIndirectMappings()` - Pre-configured mappings for common monitoring values
  - `readCommonStatus()` - Read position, velocity, PWM, temperature, and moving status in one call
  - `clearIndirectMapping(index)` / `clearAllIndirectMappings()` - Clean up indirect mappings
  - Full validation with descriptive error messages for out-of-range indices and addresses
  - Supports up to 20 indirect address mappings (addresses 168-207) with data at addresses 208-227
  - Example usage: `realtime-timestamp-test.js` demonstrating high-speed monitoring capabilities
- **Goal Current Control** - Current-based motor control methods
  - `setGoalCurrent(current)` - Set target current in mA for precise torque control
  - `getGoalCurrent()` - Read current goal current setting
  - Enhanced control capabilities for applications requiring precise force/torque control
- **Realtime Tick Support** - Hardware timestamp access for precise timing
  - `getRealtimeTick()` - Read hardware timestamp counter (16-bit, rolls over at 32767)
  - Enables precise timing measurements and synchronization between multiple motors
  - Useful for real-time applications and performance monitoring
- **Serial Buffer Configuration** - Configurable buffer sizes for performance optimization
  - `highWaterMark` option in SerialConnection and DynamixelController constructors
  - Default 64KB buffer size, configurable from 0 to 1MB+ for different use cases
  - Optimizes memory usage and performance for high-speed applications
  - Examples: `serial-buffer-options.js` showing different buffer configurations
- **Enhanced Development Tools** - New example applications
  - `realtime-timestamp-test.js` - Demonstrates indirect addressing and realtime tick usage
  - `serial-buffer-options.js` - Shows different buffer size configurations for performance tuning
- **XC330-M288 Motor Profile** - Complete motor profile with specifications and control table
  - Detailed specs: 0.93 N·m torque, 81 RPM, 3.7-6.0V operating range
  - Full control table mapping with addresses, sizes, and access types
  - Pre-configured operating modes and recommended profiles
  - Conversion factors for position, velocity, current, voltage, and temperature
- **Enhanced MotorProfiles API** - New utility methods for motor management
  - `getModelNumber(modelName)` - Get model number for motor name
  - `getModelByNumber(modelNumber)` - Find motor model by number
  - `getOperatingModes(modelName)` - Get available operating modes
  - `getDefaultSettings(modelName)` - Get factory default settings
  - `getSpecs(modelName)` - Get motor specifications
  - `getControlTable(modelName)` - Get complete control table
  - `getConversions(modelName)` - Get unit conversion factors
  - `hasFeature(modelName, feature)` - Check motor feature support
  - `getModelNumbers()` - Get all model numbers as lookup map
- **Enhanced Control Table Constants** - Extended protocol support
  - Added `CURRENT_LIMIT`, `GOAL_CURRENT`, `STARTUP_CONFIGURATION`
  - Added `PWM_SLOPE`, `BACKUP_READY` registers
  - Added `MODEL_NUMBERS` constants for quick model identification
  - Added `INDIRECT_ADDRESS` constants for indirect addressing support
- **New Example Applications** - Expanded development tools
  - `debug-model-detection.js` - Motor model detection debugging
  - `find-xl330.js` - XL330-specific device discovery
  - `realtime-monitoring.js` - Real-time motor monitoring
  - `xl330-realtime-monitoring.js` - XL330-specific monitoring
  - `xl330-sensor-test.js` - XL330 sensor testing utilities

### Changed
- **Enhanced TypeScript Documentation** - Comprehensive API documentation
  - Added TypeDoc definitions for `DeviceInfo[]`, `SerialPortInfo[]`, `USBDeviceInfo[]`
  - Added `CommunicationDevice[]`, `SystemInfo`, `USBDiagnostics` types
  - Improved return type documentation across all transport classes
  - Better IDE support with detailed JSDoc comments
- **Updated Field Naming** - Consistency improvements
  - `PRESENT_LOAD` → `PRESENT_CURRENT` for better protocol alignment
  - Enhanced control table field organization

### Fixed
- **Motor Model Identification** - Corrected model number assignments
  - Fixed XC430-W150 model number (1070) 
  - Added XL330-M288-T model (1200) for proper identification
  - Improved motor discovery and model detection accuracy

### Technical Improvements
- **Advanced Protocol Support** - Full indirect addressing implementation following DYNAMIXEL Protocol 2.0
- **Performance Optimization** - Configurable buffer sizes and contiguous bulk operations
- **Enhanced Motor Profile System** - More comprehensive motor support with current control
- **Real-time Capabilities** - Hardware timestamp access for precise timing applications
- **Improved Documentation** - Better TypeScript/JSDoc integration with new API methods
- **Extended Protocol Support** - Additional control table registers and indirect addressing constants
- **Developer Tools** - New debugging and monitoring utilities with practical examples

### Breaking Changes
- None - All changes are backward compatible

### Migration Guide
- **For high-performance applications**: Use indirect addressing for efficient bulk operations and reduced communication overhead
- **For precise control applications**: Utilize `setGoalCurrent()` and `getGoalCurrent()` for current-based torque control
- **For real-time applications**: Use `getRealtimeTick()` for hardware-level timing synchronization
- **For buffer optimization**: Configure `highWaterMark` option based on your application's memory and performance requirements
- **For XC330-M288 users**: New motor profile available with optimized settings
- **For developers**: New MotorProfiles utility methods provide easier motor management
- **For TypeScript users**: Enhanced type definitions improve development experience

## [0.0.5] - 2025-01-20

### Added
- **Separated Discovery Pattern** for Electron applications
  - `discoverCommunicationDevices()` - Discover USB/Serial devices without connecting
  - `discoverU2D2Devices()` - Find U2D2-compatible devices specifically
  - `connectToDevice(device)` - Connect to user-selected device
  - `deferConnection` option in DynamixelController constructor
  - Example: `separated-discovery.js` demonstrating the complete workflow
- **TypeScript Support**
  - Complete TypeScript declaration files generation
  - Proper type annotations for all public APIs
  - `deferConnection` correctly typed as `boolean` (was `any`)
  - JSDoc type definitions for better IDE support
- **Build System Enhancements**
  - Rollup configuration for ESM and CommonJS builds
  - Automatic TypeScript declaration generation
  - Support for both `import` and `require` usage patterns
  - Proper package.json exports configuration
- **Enhanced Examples**
  - `electron-main-process.js` - Electron main process integration
  - `electron-renderer.js` - Electron renderer process integration
  - `electron-dynamixel-service.js` - Complete Electron service example
  - `typescript-example.ts` - TypeScript usage demonstration
  - `prioritize-serial.js` - Serial device prioritization example

### Changed
- **Device Discovery Priority**: Serial devices now properly prioritized over USB devices
- **Improved Error Handling**: Better error messages and timeout handling
- **Enhanced Motor Property Reading**: Motor model numbers and firmware versions now display correctly
- **Test Reliability**: All 284 tests now pass consistently without hanging
- **Protocol Buffer Processing**: Fixed infinite loop issues in packet processing
- **Connection Stability**: Improved timeout handling and connection cleanup

### Fixed
- **Critical Motor Discovery Bug**: Fixed infinite loop in `processReceiveBuffer()` methods
  - Changed condition from `packetLength === -1` to `packetLength === 0`
  - Added buffer size limits (1KB max) to prevent memory issues
  - Added maximum packets per processing call (10) to prevent infinite loops
  - Applied to all transport classes: SerialConnection, U2D2Connection
- **Motor Properties Null Issue**: Fixed motor properties showing as `null` values
  - Root cause: `ping()` methods incorrectly parsing response buffers
  - Fixed: Proper parsing of raw buffers before extracting ping information
  - Now correctly displays: "Motor ID 1: XC430-W150 (Model: 1200), FW: 52"
- **Test Hanging Issue**: Resolved Jest hanging on test completion
  - Fixed USB device handle leaks by using mocked connections
  - Fixed timeout handle leaks by clearing setTimeout properly
  - All tests now exit cleanly with `--detectOpenHandles`
- **DynamixelDevice Buffer Parsing**: Fixed raw response buffer handling
  - `read()` and `write()` methods now properly parse status packets
  - Added `Protocol2.parseStatusPacket()` calls before error checking
  - Updated test mocks to return proper status packet buffers
- **Missing CommonJS Methods**: Added missing discovery methods to CommonJS exports
  - `discoverCommunicationDevices()`, `discoverU2D2Devices()`, `connectToDevice()`
  - Fixed inconsistency between ESM and CommonJS module exports

### Technical Improvements
- **Robust Packet Processing**: Enhanced buffer processing with safety limits
- **Memory Management**: Better cleanup of USB handles and timeouts
- **Test Infrastructure**: Proper mock data generation for DYNAMIXEL Protocol 2.0
- **Error Propagation**: Consistent error handling across transport layers
- **Documentation**: Comprehensive examples for Electron integration patterns

### Breaking Changes
- None - All changes are backward compatible

### Migration Guide
- **For Electron apps**: Consider using the new separated discovery pattern for better UX
- **For TypeScript users**: Update imports to get better type safety
- **For CommonJS users**: No changes required, all new methods available

## [0.0.4] - 2025-06-15

### Added
- **Enhanced Alarm Management System** (inspired by DynaNode architecture)
  - Intelligent alarm thresholds for temperature, voltage, and load monitoring
  - Hardware error flag processing with severity classification
  - Alarm history tracking and statistics
  - Emergency stop events for fatal conditions
- **Motor Profiles System** for optimal motor configurations
  - Predefined profiles for AX, MX, and X series motors
  - Application-specific profiles (robot arms, mobile robots, grippers)
  - Recommended settings for different use cases (precision, balanced, dynamic)
  - Multi-motor synchronization optimization settings
- **Enhanced Logging System** with structured output
  - Performance metrics tracking and measurement tools
  - Protocol-level logging for debugging
  - Device-specific and category-specific loggers
  - Log filtering, export (JSON/CSV/text), and statistics
  - Configurable log levels with environment variable support
- **Comprehensive Test Suite** for enhanced features
  - 108 unit tests covering AlarmManager, MotorProfiles, and Logger
  - 17 integration tests demonstrating real-world usage scenarios
  - Enhanced features documentation and examples

### Changed
- Reorganized src directory structure for better separation of concerns
- Moved connection classes to `src/transport/` directory
- Moved DYNAMIXEL-specific classes to `src/dynamixel/` directory
- Updated main entry point exports to include enhanced features
- Enhanced documentation with comprehensive enhanced features section

### Features Inspired by DynaNode
- Advanced alarm categorization and threshold management
- Comprehensive motor model specifications and configurations
- Application profile templates for common robotics use cases
- Performance monitoring and optimization tools

## [0.0.3] - 2025-06-12

### Changed
- Updated GitHub Actions workflows for improved CI/CD
- Enhanced npm publishing process with provenance
- Improved package configuration for npm registry
- Adjusted test coverage thresholds for realistic targets

### Fixed
- GitHub Actions workflow issues with Node.js 22 compatibility
- npm publishing configuration and authentication
- Package files inclusion for distribution

## [0.0.2] - 2025-06-12

### Added
- Comprehensive test suite with Jest
- GitHub Actions CI/CD workflows
- Automated npm publishing on release
- Security and dependency scanning
- Coverage reporting with Codecov and Coveralls
- Contributing guidelines and documentation

### Changed
- Improved package.json metadata for npm publishing
- Enhanced error handling and validation
- Updated dependencies to latest stable versions

### Fixed
- CRC-16 calculation implementation for Protocol 2.0
- Device discovery reliability issues
- ES modules compatibility with testing framework

## [0.0.1] - 2025-06-12

### Added
- Initial release of node-dynamixel library
- DYNAMIXEL Protocol 2.0 support
- U2D2 USB interface connection
- Serial port connection support
- Device discovery and control
- Basic motor operations (position, LED, etc.)
- Example scripts for device discovery and diagnostics

### Features
- **DynamixelController**: Main controller class for managing connections and devices
- **DynamixelDevice**: Individual device control and monitoring
- **Protocol2**: Complete DYNAMIXEL Protocol 2.0 implementation
- **U2D2Connection**: USB connection via U2D2 interface
- **SerialConnection**: Direct serial port communication
- **Device Discovery**: Automatic detection of connected DYNAMIXEL motors
- **Register Operations**: Read/write device registers and parameters
- **Error Handling**: Comprehensive error detection and reporting

### Supported Hardware
- U2D2 USB interface
- DYNAMIXEL X-series motors (XL430, XC430, XM430, XH430, etc.)
- Serial communication interfaces

### Requirements
- Node.js 18.0.0 or higher
- USB support (optional, for U2D2 interface)
- Serial port access

---

## Release Notes Template

When creating a new release, use this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features and capabilities

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future versions

### Removed
- Features that have been removed

### Fixed
- Bug fixes and corrections

### Security
- Security-related changes and fixes
```

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for information about contributing to this project and the release process.
