# macOS USB Permissions for U2D2 Device

This guide explains how to run DYNAMIXEL examples without `sudo` on macOS.

## The Problem

macOS restricts USB device access for security reasons. The U2D2 device requires:
1. **USB enumeration access** - to detect the device
2. **Interface claiming access** - to communicate with the device

## Solutions (Ordered by Recommendation)

### 1. Serial Connection (New! No sudo required) 🚀

**Install FTDI VCP Drivers** to enable serial port access:

1. **Download FTDI VCP Drivers**: https://ftdichip.com/drivers/
2. **Install the macOS VCP driver** package
3. **Restart your computer** after installation
4. **Use serial connection**:

```javascript
import { DynamixelController } from './index.js';

// Force serial connection (no sudo required!)
const controller = new DynamixelController({
  connectionType: 'serial'
});

await controller.connect();
```

After installing drivers, the U2D2 should appear as:
- `/dev/cu.usbserial-FTAA0AS4`
- `/dev/tty.usbserial-FTAA0AS4`

### 2. Auto-Detection (Recommended for most users) ✨

```javascript
// Try serial first, fallback to USB if needed
const controller = new DynamixelController({
  connectionType: 'auto'  // This is the default
});

await controller.connect();
```

This approach:
1. **Tries serial first** (no sudo required)
2. **Falls back to USB** (requires sudo) if serial fails

### 3. System Settings (For USB approach) ✅

Enable Terminal as a developer tool:

```bash
# Enable developer mode for Terminal
spctl developer-mode enable-terminal
```

Then manually enable in **System Settings**:
1. Open **System Settings** → **Privacy & Security**
2. Scroll to **Developer Tools**
3. Enable **Terminal.app**
4. Restart Terminal

Test with:
```bash
npm run discovery
```

### 4. Quick Scripts 🚀

Use the provided convenience scripts:

```bash
# Try auto-detection (serial → USB fallback)
npm run discovery

# Force USB with sudo
npm run discovery:sudo
```

## Connection Types

You can now choose your connection method:

```javascript
// Serial connection (requires FTDI drivers, no sudo)
const controller = new DynamixelController({
  connectionType: 'serial'
});

// USB connection (requires sudo on macOS)
const controller = new DynamixelController({
  connectionType: 'usb'
});

// Auto-detection (tries serial first, then USB)
const controller = new DynamixelController({
  connectionType: 'auto'  // Default
});
```

## Available Scripts

| Command | Description | Permission Level |
|---------|-------------|------------------|
| `npm run discovery` | Auto-detection | User → Root |
| `npm run discovery:sudo` | Force USB with sudo | Root |
| `npm run diagnostics` | USB diagnostics | User |
| `npm run diagnostics:sudo` | Diagnostics with sudo | Root |

## Why Serial Connection is Better

| Aspect | Serial Connection | USB Connection |
|--------|------------------|----------------|
| **Permissions** | ✅ No sudo required | ❌ Requires sudo |
| **Setup** | ⚠️ Need FTDI drivers | ✅ Works out of box |
| **Stability** | ✅ More stable | ⚠️ Kernel driver conflicts |
| **Performance** | ✅ Same speed | ✅ Same speed |

## Troubleshooting

### Serial Connection Issues

```bash
# Check if FTDI drivers are installed
ls -la /dev/cu.usb*

# Check for U2D2 serial port
system_profiler SPUSBDataType | grep -A 5 "Serial"

# Download drivers if not found
open https://ftdichip.com/drivers/
```

### USB Connection Issues

```bash
# Use sudo version
npm run discovery:sudo

# Or check System Settings as described above
```

### Still Having Issues?

1. **Install FTDI VCP drivers** (for serial approach)
2. **Disconnect/Reconnect** the U2D2 device
3. **Try different USB port**
4. **Close other applications** (DYNAMIXEL Wizard, etc.)
5. **Check Privacy & Security** settings in System Settings
6. **Restart Terminal** after changing settings

## Security Note

The `sudo` requirement is a macOS security feature. The **serial connection approach eliminates this requirement** by using the operating system's built-in serial port drivers instead of direct USB access.

For production applications, **use the serial connection method** with proper FTDI driver installation.
