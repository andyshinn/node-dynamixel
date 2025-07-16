#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * Example: Real-time Motor Position and Health Monitoring
 * This example sets the first discovered motor to non-torque mode and streams
 * real-time position and health information while you manually turn the motor.
 */

const REFRESH_RATE = 50; // milliseconds (20 Hz)
const CLEAR_SCREEN = '\x1Bc'; // Clear terminal screen
const MOVE_CURSOR_UP = '\x1B[H'; // Move cursor to top

let monitoringActive = false;
let device = null;

function formatHealth(health) {
  const status = [];
  
  // Temperature status
  if (health.temperature > 70) {
    status.push(`🔥 TEMP: ${health.temperature}°C (HIGH)`);
  } else if (health.temperature > 50) {
    status.push(`🟡 TEMP: ${health.temperature}°C (WARM)`);
  } else {
    status.push(`🟢 TEMP: ${health.temperature}°C`);
  }
  
  // Voltage status
  const voltage = health.voltage * 0.1;
  if (voltage < 11.0) {
    status.push(`🔋 VOLT: ${voltage.toFixed(1)}V (LOW)`);
  } else if (voltage > 14.0) {
    status.push(`⚡ VOLT: ${voltage.toFixed(1)}V (HIGH)`);
  } else {
    status.push(`🟢 VOLT: ${voltage.toFixed(1)}V`);
  }
  
  // Hardware error status
  if (health.hardwareError > 0) {
    status.push(`❌ HW ERROR: 0x${health.hardwareError.toString(16).padStart(2, '0')}`);
  } else {
    status.push(`✅ HW STATUS: OK`);
  }
  
  return status;
}

function formatPosition(position, velocity) {
  const degrees = ((position / 4095) * 360).toFixed(1);
  const rpm = (velocity * 0.229).toFixed(1);
  
  // Create a simple ASCII gauge for position (0-360 degrees)
  const gaugeWidth = 40;
  const gaugePosition = Math.round((position / 4095) * gaugeWidth);
  const gauge = '█'.repeat(gaugePosition) + '░'.repeat(gaugeWidth - gaugePosition);
  
  return {
    degrees,
    rpm,
    gauge,
    rawPosition: position,
    rawVelocity: velocity
  };
}

async function monitorDevice() {
  if (!device || !monitoringActive) return;
  
  try {
    // Read all sensor data in parallel for better performance
    const [position, velocity, temperature, voltage, hardwareError, moving] = await Promise.all([
      device.getPresentPosition(),
      device.getPresentVelocity(),
      device.getPresentTemperature(),
      device.getPresentVoltage(),
      device.readByte(70), // HARDWARE_ERROR_STATUS
      device.isMoving()
    ]);
    
    const health = {
      temperature,
      voltage,
      hardwareError,
      moving
    };
    
    const pos = formatPosition(position, velocity);
    const healthStatus = formatHealth(health);
    
    // Clear screen and display real-time data
    console.log(MOVE_CURSOR_UP);
    console.log('🔄 DYNAMIXEL REAL-TIME MONITOR');
    console.log('═'.repeat(60));
    console.log(`📍 Motor ID: ${device.id} (${device.modelName || 'Unknown Model'})`);
    console.log(`🔧 Torque: DISABLED (Manual Mode)`);
    console.log('');
    
    // Position display
    console.log('📐 POSITION & MOVEMENT:');
    console.log(`   Position: ${pos.degrees}° (${pos.rawPosition}/4095)`);
    console.log(`   Velocity: ${pos.rpm} RPM (${pos.rawVelocity})`);
    console.log(`   Gauge:    |${pos.gauge}|`);
    console.log(`             0°                    180°                  360°`);
    console.log(`   Moving:   ${health.moving ? '🟢 YES' : '⚪ NO'}`);
    console.log('');
    
    // Health display
    console.log('🏥 HEALTH STATUS:');
    healthStatus.forEach(status => console.log(`   ${status}`));
    console.log('');
    
    console.log('💡 Instructions:');
    console.log('   • Manually turn the motor to see position changes');
    console.log('   • Press Ctrl+C to stop monitoring');
    console.log('');
    console.log(`🕐 Last update: ${new Date().toLocaleTimeString()}`);
    
  } catch (error) {
    console.error('❌ Error reading sensor data:', error.message);
  }
}

async function startMonitoring() {
  console.log(CLEAR_SCREEN);
  console.log('🚀 Starting real-time monitoring...\n');
  
  monitoringActive = true;
  
  // Start monitoring loop
  const monitorInterval = setInterval(monitorDevice, REFRESH_RATE);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping monitor...');
    monitoringActive = false;
    clearInterval(monitorInterval);
    
    try {
      if (device) {
        console.log('🔧 Re-enabling torque...');
        await device.setTorqueEnable(true);
        console.log('✅ Torque re-enabled');
      }
    } catch (error) {
      console.error('⚠️  Warning: Could not re-enable torque:', error.message);
    }
    
    process.exit(0);
  });
}

async function main() {
  console.log('🎯 DYNAMIXEL Real-time Position & Health Monitor');
  console.log('═'.repeat(60));
  console.log('This example will disable torque on the first discovered motor');
  console.log('and stream real-time position and health data.\n');
  
  // Create controller
  const controller = new DynamixelController({
    timeout: 1000,
    debug: false
  });
  
  // Set up event listeners
  controller.on('connected', () => {
    console.log('✅ Connected to U2D2 device');
  });
  
  controller.on('error', (error) => {
    console.error('❌ Controller error:', error.message);
  });
  
  try {
    // Connect to U2D2
    console.log('🔌 Connecting to U2D2...');
    await controller.connect();
    
    // Discover devices
    console.log('🔍 Discovering DYNAMIXEL devices...');
    const devices = await controller.quickDiscovery();
    
    if (devices.length === 0) {
      console.log('❌ No DYNAMIXEL devices found!');
      console.log('\nTroubleshooting:');
      console.log('• Check power supply to motors');
      console.log('• Verify correct baud rate (57600)');
      console.log('• Ensure proper wiring');
      console.log('• Try running: npm run diagnostics');
      process.exit(1);
    }
    
    // Use first discovered device
    const deviceInfo = devices[0];
    device = controller.getDevice(deviceInfo.id);
    
    console.log(`✅ Found ${devices.length} device(s)`);
    console.log(`🎯 Using device ID ${device.id}: ${device.modelName || 'Unknown Model'}`);
    
    // Test device communication
    console.log('📡 Testing device communication...');
    await device.ping();
    console.log('✅ Device communication OK');
    
    // Check current torque status
    const currentTorque = await device.getTorqueEnable();
    console.log(`🔧 Current torque status: ${currentTorque ? 'ENABLED' : 'DISABLED'}`);
    
    // Disable torque for manual operation
    console.log('🔧 Disabling torque for manual operation...');
    await device.setTorqueEnable(false);
    
    // Verify torque is disabled
    const torqueDisabled = !(await device.getTorqueEnable());
    if (!torqueDisabled) {
      throw new Error('Failed to disable torque');
    }
    
    console.log('✅ Torque disabled - motor can now be turned manually');
    console.log('⏰ Starting monitoring in 2 seconds...\n');
    
    // Brief pause before starting monitor
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start real-time monitoring
    await startMonitoring();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main().catch(console.error);