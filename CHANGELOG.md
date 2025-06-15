# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
