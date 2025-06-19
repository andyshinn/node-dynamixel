// Electron Main Process Example - CommonJS
// This demonstrates using the DYNAMIXEL library in Electron's main process

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import the DYNAMIXEL library using CommonJS
const { DynamixelController } = require('../dist/cjs/index.js');

let mainWindow;
let dynamixelController;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    }
  });

  // Load your app's HTML file
  mainWindow.loadFile(path.join(__dirname, 'electron-renderer.html'));

  // Initialize DYNAMIXEL controller
  initializeDynamixel();
}

async function initializeDynamixel() {
  try {
    // Create controller with SerialPort connection for main process
    dynamixelController = new DynamixelController({
      connectionType: 'serial', // Use SerialPort in main process
      baudRate: 57600,
      timeout: 1000
    });

    console.log('DYNAMIXEL Controller initialized in main process');

    // Set up IPC handlers for renderer process communication
    setupIPC();

  } catch (error) {
    console.error('Failed to initialize DYNAMIXEL controller:', error);
  }
}

function setupIPC() {
  // Handle connection request from renderer
  ipcMain.handle('dynamixel-connect', async (event, portPath) => {
    try {
      await dynamixelController.connect(portPath);
      return { success: true, connectionType: dynamixelController.getDetectedConnectionType() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle device discovery
  ipcMain.handle('dynamixel-discover', async () => {
    try {
      const devices = await dynamixelController.discoverDevices({
        range: 'quick', // Scan IDs 1-20
        timeout: 100
      });
      return { success: true, devices };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle device ping
  ipcMain.handle('dynamixel-ping', async (event, deviceId) => {
    try {
      const response = await dynamixelController.ping(deviceId);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle device control
  ipcMain.handle('dynamixel-control', async (event, deviceId, command, value) => {
    try {
      const device = dynamixelController.getDevice(deviceId);
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      let result;
      switch (command) {
        case 'setTorqueEnable':
          result = await device.setTorqueEnable(value);
          break;
        case 'setGoalPosition':
          result = await device.setGoalPosition(value);
          break;
        case 'setGoalVelocity':
          result = await device.setGoalVelocity(value);
          break;
        case 'setLED':
          result = await device.setLED(value);
          break;
        case 'getPresentPosition':
          result = await device.getPresentPosition();
          break;
        case 'getPresentVelocity':
          result = await device.getPresentVelocity();
          break;
        case 'getPresentTemperature':
          result = await device.getPresentTemperature();
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle disconnection
  ipcMain.handle('dynamixel-disconnect', async () => {
    try {
      await dynamixelController.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handle getting connection status
  ipcMain.handle('dynamixel-status', async () => {
    try {
      const status = dynamixelController.getConnectionStatus();
      const devices = dynamixelController.getAllDevices();
      return {
        success: true,
        status,
        deviceCount: devices.length,
        devices: devices.map(d => ({
          id: d.id,
          modelName: d.getModelName(),
          ...d.getDeviceInfo()
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Clean up DYNAMIXEL connection
  if (dynamixelController) {
    try {
      await dynamixelController.disconnect();
    } catch (error) {
      console.error('Error disconnecting DYNAMIXEL:', error);
    }
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app termination
process.on('SIGINT', async () => {
  if (dynamixelController) {
    await dynamixelController.disconnect();
  }
  app.quit();
});

console.log('🚀 Electron main process started with DYNAMIXEL support');
console.log('📦 Using CommonJS build from dist/cjs/');
console.log('🔌 SerialPort connection available in main process');
console.log('🌐 Web Serial API available in renderer process');
