# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**MANDATORY workflow before any commit:**
```bash
npm run lint          # Fix ALL linting errors (zero tolerance)
npm run build         # Build ESM/CommonJS + TypeScript definitions  
npm test              # Run all 284 tests with --detectOpenHandles
npm pack --dry-run    # Verify package integrity
```

**Test commands:**
```bash
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only  
npm run test:coverage  # Tests with coverage report
npm run test:watch     # Watch mode for development
```

**Build commands:**
```bash
npm run build:watch    # Watch mode for building
npm run clean          # Remove dist directory
```

**Diagnostic commands:**
```bash
npm run discovery      # Test device discovery
npm run diagnostics    # USB diagnostics
```

## Architecture Overview

This is a Node.js library for controlling DYNAMIXEL servo motors via U2D2 interface with Protocol 2.0 support.

### Core Structure
- **`src/DynamixelController.js`** - Main entry point for device discovery and management
- **`src/dynamixel/`** - Core DYNAMIXEL classes:
  - `Protocol2.js` - DYNAMIXEL Protocol 2.0 implementation with CRC validation
  - `DynamixelDevice.js` - Individual motor control and monitoring  
  - `AlarmManager.js` - Advanced alarm system for professional robotics
  - `MotorProfiles.js` - Predefined motor configurations and settings
  - `constants.js` - Protocol constants and control table addresses
- **`src/transport/`** - Connection abstraction layer:
  - `U2D2Connection.js` - USB direct connection to U2D2 converter
  - `SerialConnection.js` - Serial port connection (preferred)
  - `WebSerialConnection.js` - Web Serial API for Electron/browser
- **`src/utils/`** - Utility classes:
  - `Logger.js` - Enhanced logging with performance metrics

### Key Design Patterns
- **Event-driven architecture** using EventEmitter for connection state and device discovery
- **Transport abstraction** allowing USB, Serial, and Web Serial connections
- **Dual module support** with both ESM and CommonJS builds
- **Separated discovery pattern** for Electron applications (device discovery before connection)

## Code Standards

### JavaScript/ES Modules
- Use ES6+ features and ES modules (`import`/`export`)
- Always use semicolons, 2-space indentation, single quotes
- Prefer `const` over `let`, avoid `var`
- Use JSDoc comments for all public methods and classes
- Follow eslint.config.js rules strictly (run `npm run lint`)

### DYNAMIXEL Protocol 2.0 Specifics
- All packets must have valid CRC-16 checksums using `Protocol2.calculateCRC()`
- Always validate buffer lengths before parsing with `Protocol2.parseStatusPacket()`
- Handle both little-endian and big-endian data properly
- Use proper timeout handling (default 1000ms for hardware communication)
- Parse raw responses with `Protocol2.parseStatusPacket()` before accessing error fields

### Error Handling
- Always use try/catch for async operations
- Emit 'error' events on EventEmitter classes  
- Use `Protocol2.getErrorDescription()` for DYNAMIXEL error codes
- Provide descriptive error messages with context

## Testing Requirements

- **All 284 tests must pass** - no exceptions
- Use `--detectOpenHandles` to ensure clean resource cleanup
- Unit tests in `tests/unit/` with mocked hardware connections
- Integration tests in `tests/integration/` for real hardware scenarios
- Use `createStatusPacketBuffer()` helper for mock DYNAMIXEL responses
- Mock `sendAndWaitForResponse` to return proper status packet buffers
- Always clean up connections in `afterEach` blocks

## Build & Distribution

- Maintains dual module support: ESM (`dist/esm/`) and CommonJS (`dist/cjs/`)
- TypeScript definitions generated from JSDoc annotations in `dist/types/`
- Uses Rollup for building with proper externals
- Minimal dependencies: `serialport` required, `usb` optional
- Node.js 18+ requirement specified in engines field

## Common Pitfalls to Avoid

- **Don't commit without running the full workflow** (lint → build → test → pack)
- **Don't access `response.error` on raw buffers** - parse first with `Protocol2.parseStatusPacket()`
- **Don't assume packet lengths** - validate with `Protocol2.getCompletePacketLength()`
- **Don't use real hardware in unit tests** - mock all connections
- **Don't ignore Jest open handle warnings** - indicates resource leaks

## Release Management

- **Update Changelog Workflow**
  - Always update `CHANGELOG.md` file when bumping the version
  - Include a summary of changes, additions, and fixes in the changelog
  - **Make sure our release versions do not start with the v prefix. They should be semver `#.#.#`.**