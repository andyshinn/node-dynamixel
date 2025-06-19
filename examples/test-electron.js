#!/usr/bin/env node

/**
 * Minimal Electron app to test dynamixel package compatibility
 * Run with: node test-electron-dynamixel.js
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

const createWindow = async () => {
  console.log('Creating test window...');

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load a simple HTML page
  mainWindow.loadFile('test.html');

  // Test the dynamixel package
  await testDynamixelPackage();
};

const testDynamixelPackage = async () => {
  try {
    console.log('Testing dynamixel package import...');

    // Test the import
    const { DynamixelController } = await import('dynamixel');
    console.log('✅ Successfully imported DynamixelController');

    // Test basic instantiation
    const controller = new DynamixelController({
      timeout: 1000,
      debug: false
    });
    console.log('✅ Successfully created DynamixelController instance');

    // Test USB device listing (should work without hardware)
    const usbDevices = DynamixelController.listUSBDevices();
    console.log(`✅ USB device listing works: Found ${usbDevices.length} devices`);

    // Test event listeners
    controller.on('connected', () => console.log('Controller connected'));
    controller.on('error', (error) => console.log('Controller error:', error.message));
    console.log('✅ Event listeners attached successfully');

    console.log('🎉 All dynamixel package tests passed!');

    // Show success in the window
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = \`
        <h1 style="color: green;">✅ DYNAMIXEL Package Test Successful!</h1>
        <p>The dynamixel package imported and initialized correctly in Electron.</p>
        <ul>
          <li>✅ Import successful</li>
          <li>✅ Controller instantiation successful</li>
          <li>✅ USB device listing works</li>
          <li>✅ Event listeners work</li>
        </ul>
        <p style="color: blue;">Found \${${usbDevices.length}} USB devices</p>
      \`;
    `);

  } catch (error) {
    console.error('❌ DYNAMIXEL package test failed:', error);

    // Show error in the window
    mainWindow.webContents.executeJavaScript(`
      document.body.innerHTML = \`
        <h1 style="color: red;">❌ DYNAMIXEL Package Test Failed</h1>
        <p>Error: \${${JSON.stringify(error.message)}}</p>
        <pre style="background: #f5f5f5; padding: 10px;">\${${JSON.stringify(error.stack)}}</pre>
      \`;
    `);
  }
};

// App event handlers
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

console.log('Starting Electron test app...');
