# Electron Setup Guide

This guide shows how to use the DYNAMIXEL library with Electron applications using the Web Serial API.

## Prerequisites

- **Electron 13+** (for Web Serial API support)
- **Chromium-based Electron** (built-in Web Serial support)
- **U2D2 USB-to-TTL converter** or compatible serial device

## Quick Start

### 1. Install Dependencies

```bash
# Install the DYNAMIXEL library
npm install dynamixel

# Install Electron (if not already installed)
npm install --save-dev electron
```

### 2. Main Process Configuration

Create or update your `main.js` (Electron main process):

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,        // Security: disable node integration
      contextIsolation: true,        // Security: enable context isolation
      enableRemoteModule: false,     // Security: disable remote module
      webSecurity: true,             // Keep web security enabled
      experimentalFeatures: true,    // Enable experimental web features

      // Enable Web Serial API
      additionalArguments: ['--enable-web-serial']
    }
  });

  // Enable Web Serial API permissions
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial') {
      return true; // Allow serial port access
    }
    return false;
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission === 'serial') {
      callback(true); // Grant serial port permission
    } else {
      callback(false);
    }
  });

  // Load the renderer HTML
  mainWindow.loadFile('renderer.html');

  // Open DevTools for debugging
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 3. Renderer HTML

Create `renderer.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DYNAMIXEL Control - Electron</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline';">
</head>
<body>
  <h1>🤖 DYNAMIXEL Control Panel</h1>
  <div id="app-container">
    <!-- UI will be created dynamically by renderer.js -->
  </div>

  <!-- Load the renderer script as ES module -->
  <script type="module" src="./examples/electron-renderer.js"></script>
</body>
</html>
```

### 4. Package.json Configuration

Update your `package.json`:

```json
{
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "NODE_ENV=development electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^22.0.0"
  },
  "dependencies": {
    "dynamixel": "^0.0.2"
  }
}
```

## Advanced Configuration

### Security Considerations

For production apps, consider these additional security measures:

```javascript
// main.js - Enhanced security
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    webSecurity: true,

    // Preload script for secure API exposure
    preload: path.join(__dirname, 'preload.js'),

    // Web Serial API
    additionalArguments: ['--enable-web-serial']
  }
});

// More restrictive permission handling
mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
  // Only allow serial permissions for your app's origin
  if (permission === 'serial' && details.requestingUrl.startsWith('file://')) {
    callback(true);
  } else {
    callback(false);
  }
});
```

### Preload Script (Optional)

Create `preload.js` for enhanced security:

```javascript
const { contextBridge } = require('electron');

// Expose limited APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,

  // Custom methods for your app
  isDevelopment: () => process.env.NODE_ENV === 'development'
});
```

## Connection Types

The library automatically detects the best connection method:

```javascript
import { DynamixelController } from 'dynamixel';

// Auto-detection (recommended)
const controller = new DynamixelController({
  connectionType: 'auto',  // Will use Web Serial API in Electron renderer
  timeout: 1000
});

// Force Web Serial API
const controller = new DynamixelController({
  connectionType: 'webserial',
  timeout: 1000
});
```

## Common Issues & Solutions

### 1. Web Serial API Not Available

**Error:** `Web Serial API not available`

**Solutions:**
- Ensure Electron version 13+
- Add `--enable-web-serial` flag to `additionalArguments`
- Check that you're running in renderer process, not main process

### 2. Permission Denied

**Error:** `Serial port access denied`

**Solutions:**
- Configure permission handlers in main process
- Check Content Security Policy allows Web Serial API
- Ensure HTTPS context (file:// URLs work in Electron)

### 3. Device Not Found

**Error:** `No compatible serial device found`

**Solutions:**
- Install U2D2 FTDI drivers
- Check USB connection
- Verify device is not in use by another application
- Try different USB ports

### 4. Module Loading Issues

**Error:** `Cannot resolve module 'dynamixel'`

**Solutions:**
- Install as dependency: `npm install dynamixel`
- Use correct import syntax: `import { DynamixelController } from 'dynamixel'`
- Ensure ES modules enabled in HTML: `<script type="module">`

## Environment Detection

The library can detect and adapt to different environments:

```javascript
import { WebSerialConnection } from 'dynamixel';

// Check Web Serial API support
if (WebSerialConnection.isSupported()) {
  console.log('✅ Web Serial API available');

  // Get detailed feature support
  const features = WebSerialConnection.getFeatureSupport();
  console.log('Feature support:', features);
} else {
  console.log('❌ Web Serial API not available');
}
```

## Development Tips

### 1. Enable Debug Mode

```javascript
const controller = new DynamixelController({
  connectionType: 'webserial',
  debug: true,  // Enable verbose logging
  timeout: 2000
});
```

### 2. DevTools Console

Open DevTools (`Ctrl+Shift+I`) to see detailed logs and debug connection issues.

### 3. Hot Reload

For development, use `electron-reload`:

```bash
npm install --save-dev electron-reload
```

```javascript
// main.js
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}
```

### 4. Error Handling

```javascript
controller.on('error', (error) => {
  console.error('Connection error:', error.message);

  // Handle specific error types
  if (error.message.includes('NotFoundError')) {
    alert('No device selected or user cancelled');
  } else if (error.message.includes('SecurityError')) {
    alert('Permission denied - check Web Serial API settings');
  }
});
```

## Building for Distribution

### Electron Builder Configuration

`electron-builder.json`:

```json
{
  "appId": "com.yourcompany.dynamixel-app",
  "productName": "DYNAMIXEL Control",
  "directories": {
    "output": "dist"
  },
  "files": [
    "main.js",
    "renderer.html",
    "preload.js",
    "examples/",
    "node_modules/"
  ],
  "mac": {
    "category": "public.app-category.utilities"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

### Build Commands

```bash
# Install electron-builder
npm install --save-dev electron-builder

# Build for current platform
npm run build

# Build for specific platforms
npx electron-builder --mac
npx electron-builder --win
npx electron-builder --linux
```

## Example Projects

Check out these complete example projects:

- **Basic Electron App**: `examples/electron-basic/`
- **Advanced Features**: `examples/electron-advanced/`
- **React Integration**: `examples/electron-react/`

## Browser Compatibility

The Web Serial API requires:

- **Chrome/Chromium 89+**
- **Edge 89+**
- **Electron 13+** (built on Chromium)

Firefox and Safari do not currently support Web Serial API.

## Next Steps

1. Copy the example files to your project
2. Install dependencies and configure Electron
3. Run with `npm run dev`
4. Connect your U2D2/DYNAMIXEL devices
5. Start discovering and controlling devices!

For more examples and advanced usage, see the [API Documentation](./api.md) and [Examples](../examples/) directory.
