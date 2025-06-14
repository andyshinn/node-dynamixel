/**
 * Electron Renderer Process Example
 * Demonstrates using the DYNAMIXEL library with Web Serial API in Electron renderer
 *
 * This file should be loaded in your Electron renderer process (web page).
 * Make sure to enable Web Serial API in your Electron main process.
 */

import { DynamixelController, WebSerialConnection } from '../index.js';

// Environment detection
function detectEnvironment() {
  const isElectron = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';
  const isWebSerialSupported = WebSerialConnection.isSupported();
  const userAgent = navigator.userAgent;

  return {
    isElectron,
    isWebSerialSupported,
    isChrome: userAgent.includes('Chrome'),
    userAgent
  };
}

// Main application class for Electron renderer
class ElectronDynamixelApp {
  constructor() {
    this.controller = null;
    this.devices = [];
    this.isConnected = false;

    // UI elements (assuming you have these in your HTML)
    this.setupUI();
  }

  setupUI() {
    // Create UI elements programmatically or reference existing ones
    this.createStatusPanel();
    this.createControlPanel();
    this.createDeviceList();
    this.createConsoleOutput();
  }

  createStatusPanel() {
    const statusPanel = document.createElement('div');
    statusPanel.id = 'status-panel';
    statusPanel.innerHTML = `
      <h2>🔌 Connection Status</h2>
      <div id="connection-status">Disconnected</div>
      <div id="environment-info"></div>
      <button id="connect-btn">Connect to DYNAMIXEL</button>
      <button id="disconnect-btn" disabled>Disconnect</button>
    `;
    document.body.appendChild(statusPanel);

    // Event listeners
    document.getElementById('connect-btn').addEventListener('click', () => this.connect());
    document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());

    this.updateEnvironmentInfo();
  }

  createControlPanel() {
    const controlPanel = document.createElement('div');
    controlPanel.id = 'control-panel';
    controlPanel.innerHTML = `
      <h2>🎮 Device Control</h2>
      <div id="discovery-section">
        <button id="quick-discovery-btn" disabled>Quick Discovery (IDs 1-20)</button>
        <button id="full-discovery-btn" disabled>Full Discovery (IDs 1-252)</button>
        <div id="discovery-progress"></div>
      </div>
      <div id="device-control">
        <label for="device-select">Select Device:</label>
        <select id="device-select" disabled>
          <option value="">No devices found</option>
        </select>
        <div id="device-actions">
          <button id="ping-device-btn" disabled>Ping Device</button>
          <button id="led-on-btn" disabled>LED On</button>
          <button id="led-off-btn" disabled>LED Off</button>
          <button id="read-status-btn" disabled>Read Status</button>
        </div>
      </div>
    `;
    document.body.appendChild(controlPanel);

    // Event listeners
    document.getElementById('quick-discovery-btn').addEventListener('click', () => this.quickDiscovery());
    document.getElementById('full-discovery-btn').addEventListener('click', () => this.fullDiscovery());
    document.getElementById('ping-device-btn').addEventListener('click', () => this.pingSelectedDevice());
    document.getElementById('led-on-btn').addEventListener('click', () => this.setLED(true));
    document.getElementById('led-off-btn').addEventListener('click', () => this.setLED(false));
    document.getElementById('read-status-btn').addEventListener('click', () => this.readDeviceStatus());
  }

  createDeviceList() {
    const deviceList = document.createElement('div');
    deviceList.id = 'device-list';
    deviceList.innerHTML = `
      <h2>📋 Discovered Devices</h2>
      <div id="devices-container">No devices discovered yet</div>
    `;
    document.body.appendChild(deviceList);
  }

  createConsoleOutput() {
    const consoleOutput = document.createElement('div');
    consoleOutput.id = 'console-output';
    consoleOutput.innerHTML = `
      <h2>📜 Console Output</h2>
      <div id="console-content" style="height: 200px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; font-family: monospace; font-size: 12px;"></div>
      <button id="clear-console-btn">Clear Console</button>
    `;
    document.body.appendChild(consoleOutput);

    document.getElementById('clear-console-btn').addEventListener('click', () => this.clearConsole());

    // Redirect console.log to our console output
    this.setupConsoleRedirect();
  }

  setupConsoleRedirect() {
    const originalLog = console.log;
    const originalError = console.error;
    const consoleContent = document.getElementById('console-content');

    console.log = (...args) => {
      originalLog(...args);
      this.addToConsole('info', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      this.addToConsole('error', args.join(' '));
    };
  }

  addToConsole(type, message) {
    const consoleContent = document.getElementById('console-content');
    const timestamp = new Date().toLocaleTimeString();
    const color = type === 'error' ? 'red' : 'black';

    consoleContent.innerHTML += `<div style="color: ${color};">[${timestamp}] ${message}</div>`;
    consoleContent.scrollTop = consoleContent.scrollHeight;
  }

  clearConsole() {
    document.getElementById('console-content').innerHTML = '';
  }

  updateEnvironmentInfo() {
    const env = detectEnvironment();
    const envInfo = document.getElementById('environment-info');

    let statusHtml = `
      <div><strong>Environment:</strong> ${env.isElectron ? 'Electron Renderer' : 'Web Browser'}</div>
      <div><strong>Web Serial Support:</strong> ${env.isWebSerialSupported ? '✅ Available' : '❌ Not Available'}</div>
      <div><strong>Chrome-based:</strong> ${env.isChrome ? 'Yes' : 'No'}</div>
    `;

    if (!env.isWebSerialSupported) {
      statusHtml += `<div style="color: red;"><strong>⚠️ Web Serial API not supported!</strong></div>`;
    }

    envInfo.innerHTML = statusHtml;
  }

  async connect() {
    try {
      console.log('🔌 Attempting to connect...');

      // Force Web Serial connection in renderer process
      this.controller = new DynamixelController({
        connectionType: 'webserial',
        timeout: 1000
      });

      // Set up event listeners
      this.setupControllerEvents();

      // Connect (this will trigger the browser's serial port selection dialog)
      const success = await this.controller.connect();

      if (success) {
        console.log('✅ Connected successfully!');
        this.isConnected = true;
        this.updateConnectionStatus();
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.error('❌ Connection failed:', error.message);

      if (error.message.includes('user cancelled')) {
        console.log('ℹ️ User cancelled port selection');
      } else if (error.message.includes('SecurityError')) {
        console.error('🔒 Security error - check browser permissions for Web Serial API');
      } else if (error.message.includes('NotFoundError')) {
        console.error('🔍 No compatible devices found');
      }
    }
  }

  async disconnect() {
    if (this.controller) {
      await this.controller.disconnect();
      this.controller = null;
      this.isConnected = false;
      this.devices = [];
      this.updateConnectionStatus();
      this.updateDeviceList();
    }
  }

  setupControllerEvents() {
    this.controller.on('connected', () => {
      console.log('🎉 Controller connected!');
      this.updateConnectionStatus();
    });

    this.controller.on('disconnected', () => {
      console.log('📱 Controller disconnected');
      this.isConnected = false;
      this.updateConnectionStatus();
    });

    this.controller.on('deviceFound', (deviceInfo) => {
      console.log(`🔍 Found device: ID ${deviceInfo.id}, Model: ${deviceInfo.modelNumber}`);
    });

    this.controller.on('discoveryComplete', (devices) => {
      console.log(`✅ Discovery complete! Found ${devices.length} device(s)`);
      this.devices = devices;
      this.updateDeviceList();
    });

    this.controller.on('error', (error) => {
      console.error('❌ Controller error:', error.message);
    });
  }

  updateConnectionStatus() {
    const statusDiv = document.getElementById('connection-status');
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const discoveryBtns = document.querySelectorAll('#discovery-section button');
    const deviceSelect = document.getElementById('device-select');
    const deviceBtns = document.querySelectorAll('#device-actions button');

    if (this.isConnected) {
      statusDiv.innerHTML = '✅ Connected';
      statusDiv.style.color = 'green';
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      discoveryBtns.forEach(btn => btn.disabled = false);
    } else {
      statusDiv.innerHTML = '❌ Disconnected';
      statusDiv.style.color = 'red';
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      discoveryBtns.forEach(btn => btn.disabled = true);
      deviceSelect.disabled = true;
      deviceBtns.forEach(btn => btn.disabled = true);
    }
  }

  async quickDiscovery() {
    this.updateDiscoveryProgress('Starting quick discovery...');

    try {
      const devices = await this.controller.quickDiscovery((current, total, id) => {
        this.updateDiscoveryProgress(`Scanning ID ${id}... (${current}/${total})`);
      });

      this.updateDiscoveryProgress(`Quick discovery complete: ${devices.length} devices found`);
    } catch (error) {
      console.error('❌ Discovery failed:', error.message);
      this.updateDiscoveryProgress('Discovery failed');
    }
  }

  async fullDiscovery() {
    this.updateDiscoveryProgress('Starting full discovery (this may take a while)...');

    try {
      const devices = await this.controller.fullDiscovery((current, total, id) => {
        if (current % 10 === 0) {
          this.updateDiscoveryProgress(`Scanning... (${current}/${total})`);
        }
      });

      this.updateDiscoveryProgress(`Full discovery complete: ${devices.length} devices found`);
    } catch (error) {
      console.error('❌ Discovery failed:', error.message);
      this.updateDiscoveryProgress('Discovery failed');
    }
  }

  updateDiscoveryProgress(message) {
    document.getElementById('discovery-progress').innerHTML = message;
  }

  updateDeviceList() {
    const container = document.getElementById('devices-container');
    const deviceSelect = document.getElementById('device-select');
    const deviceBtns = document.querySelectorAll('#device-actions button');

    if (this.devices.length === 0) {
      container.innerHTML = 'No devices discovered yet';
      deviceSelect.innerHTML = '<option value="">No devices found</option>';
      deviceSelect.disabled = true;
      deviceBtns.forEach(btn => btn.disabled = true);
      return;
    }

    // Update device list display
    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<tr><th>ID</th><th>Model</th><th>Firmware</th></tr>';

    this.devices.forEach(device => {
      const modelName = DynamixelController.getModelName(device.modelNumber);
      html += `<tr>
        <td style="border: 1px solid #ccc; padding: 5px;">${device.id}</td>
        <td style="border: 1px solid #ccc; padding: 5px;">${modelName}</td>
        <td style="border: 1px solid #ccc; padding: 5px;">${device.firmwareVersion}</td>
      </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;

    // Update device select dropdown
    deviceSelect.innerHTML = this.devices.map(device =>
      `<option value="${device.id}">ID ${device.id} - ${DynamixelController.getModelName(device.modelNumber)}</option>`
    ).join('');
    deviceSelect.disabled = false;
    deviceBtns.forEach(btn => btn.disabled = false);
  }

  getSelectedDevice() {
    const deviceSelect = document.getElementById('device-select');
    const selectedId = parseInt(deviceSelect.value);
    return this.controller.getDevice(selectedId);
  }

  async pingSelectedDevice() {
    const device = this.getSelectedDevice();
    if (!device) return;

    try {
      console.log(`📡 Pinging device ${device.id}...`);
      const result = await device.ping();
      console.log(`✅ Ping successful: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error(`❌ Ping failed: ${error.message}`);
    }
  }

  async setLED(on) {
    const device = this.getSelectedDevice();
    if (!device) return;

    try {
      console.log(`💡 Setting LED ${on ? 'ON' : 'OFF'} for device ${device.id}...`);
      await device.setLED(on);
      console.log(`✅ LED ${on ? 'ON' : 'OFF'} successful`);
    } catch (error) {
      console.error(`❌ LED control failed: ${error.message}`);
    }
  }

  async readDeviceStatus() {
    const device = this.getSelectedDevice();
    if (!device) return;

    try {
      console.log(`📊 Reading status from device ${device.id}...`);

      const [temperature, voltage, position, torqueEnabled] = await Promise.all([
        device.getPresentTemperature(),
        device.getPresentVoltage(),
        device.getPresentPosition(),
        device.getTorqueEnable()
      ]);

      const status = {
        temperature: `${temperature}°C`,
        voltage: `${device.voltageToVolts(voltage).toFixed(1)}V`,
        position: `${position} (${device.positionToDegrees(position).toFixed(1)}°)`,
        torqueEnabled: torqueEnabled ? 'Enabled' : 'Disabled'
      };

      console.log(`✅ Device status:`, status);

      // Show status in a nice format
      alert(`Device ${device.id} Status:\n\n` +
            `Temperature: ${status.temperature}\n` +
            `Voltage: ${status.voltage}\n` +
            `Position: ${status.position}\n` +
            `Torque: ${status.torqueEnabled}`);

    } catch (error) {
      console.error(`❌ Status read failed: ${error.message}`);
    }
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Electron DYNAMIXEL app...');

  // Add some basic styling
  document.head.innerHTML += `
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h2 { color: #333; margin-bottom: 10px; }
      button { margin: 5px; padding: 8px 16px; }
      button:disabled { opacity: 0.5; }
      select { margin: 5px; padding: 5px; }
      div[id$="-panel"], div[id$="-list"], div[id$="-output"] {
        border: 1px solid #ddd;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
      }
      table { border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      th { background-color: #f5f5f5; }
    </style>
  `;

  const app = new ElectronDynamixelApp();

  // Make app globally available for debugging
  window.dynamixelApp = app;

  console.log('✅ App initialized. Click "Connect to DYNAMIXEL" to begin.');
});
