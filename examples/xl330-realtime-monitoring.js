#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * XL330 Real-time Monitoring
 * Optimized for XL330-M288-T with better timeout handling and error recovery
 */

const REFRESH_RATE = 100; // milliseconds (10 Hz - slower for XL330)
const CLEAR_SCREEN = '\x1Bc';
const MOVE_CURSOR_UP = '\x1B[H';
const SENSOR_TIMEOUT = 2000; // 2 second timeout for XL330

let monitoringActive = false;
let device = null;
let consecutiveErrors = 0;
let lastSuccessfulRead = null;

function formatHealth(health) {
  const status = [];
  
  if (health.temperature !== null) {
    if (health.temperature > 70) {
      status.push(`🔥 TEMP: ${health.temperature}°C (HIGH)`);
    } else if (health.temperature > 50) {
      status.push(`🟡 TEMP: ${health.temperature}°C (WARM)`);
    } else {
      status.push(`🟢 TEMP: ${health.temperature}°C`);
    }
  } else {
    status.push(`❓ TEMP: Error reading`);
  }
  
  if (health.voltage !== null) {
    const voltage = health.voltage * 0.1;
    if (voltage < 3.0) {
      status.push(`🔋 VOLT: ${voltage.toFixed(1)}V (LOW)`);
    } else if (voltage > 6.5) {
      status.push(`⚡ VOLT: ${voltage.toFixed(1)}V (HIGH)`);
    } else {
      status.push(`🟢 VOLT: ${voltage.toFixed(1)}V`);
    }
  } else {
    status.push(`❓ VOLT: Error reading`);
  }
  
  if (health.hardwareError !== null) {
    if (health.hardwareError > 0) {
      status.push(`❌ HW ERROR: 0x${health.hardwareError.toString(16).padStart(2, '0')}`);
    } else {
      status.push(`✅ HW STATUS: OK`);
    }
  } else {
    status.push(`❓ HW STATUS: Error reading`);
  }
  
  return status;
}

function formatPosition(position, velocity) {
  if (position === null || velocity === null) {
    return {
      degrees: 'Error',
      rpm: 'Error',
      gauge: '█'.repeat(20) + '░'.repeat(20),
      rawPosition: position || 'Error',
      rawVelocity: velocity || 'Error'
    };
  }
  
  const degrees = ((position / 4095) * 360).toFixed(1);
  const rpm = (velocity * 0.229).toFixed(1);
  
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

async function safeRead(readFunction, fallbackValue = null) {
  try {
    return await readFunction();
  } catch (error) {
    return fallbackValue;
  }
}

async function monitorDevice() {
  if (!device || !monitoringActive) return;
  
  try {
    // Read sensors with individual timeouts and error handling
    console.log(MOVE_CURSOR_UP);
    console.log('🔄 XL330-M288-T REAL-TIME MONITOR');
    console.log('═'.repeat(60));
    console.log(`📍 Motor ID: ${device.id} (${device.modelName || 'XL330-M288-T'})`);
    console.log(`🔧 Torque: DISABLED (Manual Mode)`);
    console.log('');
    
    // Try sequential reads with individual error handling
    const position = await safeRead(() => device.getPresentPosition());
    const velocity = await safeRead(() => device.getPresentVelocity());
    const temperature = await safeRead(() => device.getPresentTemperature());
    const voltage = await safeRead(() => device.getPresentVoltage());
    const hardwareError = await safeRead(() => device.readByte(70));
    const moving = await safeRead(() => device.isMoving(), false);
    
    const health = {
      temperature,
      voltage,
      hardwareError,
      moving
    };
    
    const pos = formatPosition(position, velocity);
    const healthStatus = formatHealth(health);
    
    // Check if we got any successful reads
    const hasValidData = position !== null || velocity !== null || temperature !== null;
    
    if (hasValidData) {
      consecutiveErrors = 0;
      lastSuccessfulRead = Date.now();
    } else {
      consecutiveErrors++;
    }
    
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
    
    // Error status
    if (consecutiveErrors > 0) {
      console.log('⚠️  COMMUNICATION STATUS:');
      console.log(`   Consecutive errors: ${consecutiveErrors}`);
      if (lastSuccessfulRead) {
        const timeSince = Math.round((Date.now() - lastSuccessfulRead) / 1000);
        console.log(`   Last successful read: ${timeSince}s ago`);
      }
      console.log('');
    }
    
    console.log('💡 Instructions:');
    console.log('   • Manually turn the motor to see position changes');
    console.log('   • XL330 series may have slower communication');
    console.log('   • Press Ctrl+C to stop monitoring');
    console.log('');
    console.log(`🕐 Last update: ${new Date().toLocaleTimeString()}`);
    
    // If too many consecutive errors, suggest troubleshooting
    if (consecutiveErrors > 10) {
      console.log('');
      console.log('🚨 TROUBLESHOOTING:');
      console.log('   • Check power supply (3.7V - 6V for XL330)');
      console.log('   • Verify cable connections');
      console.log('   • Try slower refresh rate');
      console.log('   • Run: node examples/xl330-sensor-test.js');
    }
    
  } catch (error) {
    consecutiveErrors++;
    console.log(MOVE_CURSOR_UP);
    console.log('❌ Monitor error:', error.message);
    console.log(`   Consecutive errors: ${consecutiveErrors}`);
    console.log('   Continuing to retry...');
  }
}

async function startMonitoring() {
  console.log(CLEAR_SCREEN);
  console.log('🚀 Starting XL330 real-time monitoring...\n');
  
  monitoringActive = true;
  
  const monitorInterval = setInterval(monitorDevice, REFRESH_RATE);
  
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
  console.log('🎯 XL330-M288-T Real-time Monitor (Optimized)');
  console.log('═'.repeat(60));
  console.log('This version is optimized for XL330 series with better error handling.\n');
  
  const controller = new DynamixelController({
    timeout: SENSOR_TIMEOUT,
    debug: false
  });
  
  controller.on('connected', () => {
    console.log('✅ Connected to U2D2 device');
  });
  
  controller.on('error', (error) => {
    console.error('❌ Controller error:', error.message);
  });
  
  try {
    console.log('🔌 Connecting to U2D2...');
    await controller.connect();
    
    console.log('🔍 Finding device ID 1...');
    await controller.ping(1, SENSOR_TIMEOUT);
    device = controller.getDevice(1);
    
    if (!device) {
      throw new Error('Device ID 1 not found');
    }
    
    console.log(`✅ Found device: ${device.modelName} (Model ${device.modelNumber})`);
    
    // Test basic communication
    console.log('📡 Testing communication...');
    const position = await device.getPresentPosition();
    console.log(`✅ Communication OK - Position: ${position}`);
    
    // Check and disable torque
    const currentTorque = await device.getTorqueEnable();
    console.log(`🔧 Current torque: ${currentTorque ? 'ENABLED' : 'DISABLED'}`);
    
    if (currentTorque) {
      console.log('🔧 Disabling torque for manual operation...');
      await device.setTorqueEnable(false);
      
      const torqueDisabled = !(await device.getTorqueEnable());
      if (!torqueDisabled) {
        throw new Error('Failed to disable torque');
      }
      console.log('✅ Torque disabled');
    }
    
    console.log('⏰ Starting monitoring in 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await startMonitoring();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Try running the diagnostic first:');
    console.log('   node examples/xl330-sensor-test.js');
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

main().catch(console.error);