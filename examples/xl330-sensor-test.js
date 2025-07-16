#!/usr/bin/env node

import { DynamixelController } from '../index.js';

/**
 * XL330 Sensor Test - Diagnostic Tool
 * Tests individual sensor reads to identify timeout issues
 */

async function testSensorRead(device, sensorName, readFunction, timeout = 2000) {
  console.log(`Testing ${sensorName}...`);
  try {
    const startTime = Date.now();
    const value = await readFunction();
    const duration = Date.now() - startTime;
    console.log(`✅ ${sensorName}: ${value} (${duration}ms)`);
    return { success: true, value, duration };
  } catch (error) {
    console.log(`❌ ${sensorName} FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testDirectRead(device, address, length, description) {
  console.log(`Testing direct read ${description} (addr ${address}, len ${length})...`);
  try {
    const startTime = Date.now();
    const data = await device.read(address, length, 2000); // 2 second timeout
    const duration = Date.now() - startTime;
    console.log(`✅ ${description}: [${Array.from(data).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}] (${duration}ms)`);
    return { success: true, data, duration };
  } catch (error) {
    console.log(`❌ ${description} FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 XL330-M288-T Sensor Diagnostic Tool');
  console.log('═'.repeat(50));
  
  const controller = new DynamixelController({
    timeout: 2000, // Longer timeout for testing
    debug: false
  });
  
  controller.on('connected', () => {
    console.log('✅ Connected to U2D2 device');
  });
  
  try {
    // Connect
    console.log('🔌 Connecting to U2D2...');
    await controller.connect();
    
    // Find device
    console.log('🔍 Finding device ID 1...');
    await controller.ping(1, 2000);
    const device = controller.getDevice(1);
    
    if (!device) {
      throw new Error('Device ID 1 not found');
    }
    
    console.log(`📍 Device: ${device.modelName} (Model ${device.modelNumber})`);
    console.log('');
    
    // Test basic communication first
    console.log('🔍 BASIC COMMUNICATION TESTS:');
    console.log('─'.repeat(40));
    
    await testSensorRead(device, 'Torque Enable', () => device.getTorqueEnable());
    await testSensorRead(device, 'LED Status', () => device.getLED());
    
    console.log('');
    console.log('🔍 POSITION & MOVEMENT TESTS:');
    console.log('─'.repeat(40));
    
    await testSensorRead(device, 'Present Position', () => device.getPresentPosition());
    await testSensorRead(device, 'Present Velocity', () => device.getPresentVelocity());
    await testSensorRead(device, 'Is Moving', () => device.isMoving());
    
    console.log('');
    console.log('🔍 HEALTH SENSOR TESTS:');
    console.log('─'.repeat(40));
    
    await testSensorRead(device, 'Present Temperature', () => device.getPresentTemperature());
    await testSensorRead(device, 'Present Voltage', () => device.getPresentVoltage());
    
    console.log('');
    console.log('🔍 DIRECT CONTROL TABLE READS:');
    console.log('─'.repeat(40));
    
    // Test individual control table reads
    await testDirectRead(device, 132, 4, 'Present Position (132, 4 bytes)');
    await testDirectRead(device, 128, 4, 'Present Velocity (128, 4 bytes)');
    await testDirectRead(device, 146, 1, 'Present Temperature (146, 1 byte)');
    await testDirectRead(device, 144, 2, 'Present Input Voltage (144, 2 bytes)');
    await testDirectRead(device, 70, 1, 'Hardware Error Status (70, 1 byte)');
    await testDirectRead(device, 122, 1, 'Moving Status (122, 1 byte)');
    
    console.log('');
    console.log('🔍 PARALLEL READ TEST (simulating monitoring):');
    console.log('─'.repeat(40));
    
    try {
      const startTime = Date.now();
      const [position, velocity, temperature, voltage, hardwareError, moving] = await Promise.all([
        device.getPresentPosition(),
        device.getPresentVelocity(),
        device.getPresentTemperature(),
        device.getPresentVoltage(),
        device.readByte(70), // Hardware Error Status
        device.isMoving()
      ]);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Parallel read SUCCESS (${duration}ms):`);
      console.log(`   Position: ${position} (${device.positionToDegrees(position).toFixed(1)}°)`);
      console.log(`   Velocity: ${velocity} (${device.velocityToRPM(velocity).toFixed(1)} RPM)`);
      console.log(`   Temperature: ${temperature}°C`);
      console.log(`   Voltage: ${(voltage * 0.1).toFixed(1)}V`);
      console.log(`   Hardware Error: 0x${hardwareError.toString(16).padStart(2, '0')}`);
      console.log(`   Moving: ${moving}`);
      
    } catch (error) {
      console.log(`❌ Parallel read FAILED: ${error.message}`);
      
      // Try sequential reads as fallback
      console.log('');
      console.log('🔄 Trying sequential reads...');
      
      const readings = {};
      const readSequentially = async (name, readFunc) => {
        try {
          const value = await readFunc();
          console.log(`   ✅ ${name}: ${value}`);
          readings[name] = value;
        } catch (error) {
          console.log(`   ❌ ${name}: ${error.message}`);
          readings[name] = null;
        }
      };
      
      await readSequentially('Position', () => device.getPresentPosition());
      await readSequentially('Velocity', () => device.getPresentVelocity());
      await readSequentially('Temperature', () => device.getPresentTemperature());
      await readSequentially('Voltage', () => device.getPresentVoltage());
      await readSequentially('Hardware Error', () => device.readByte(70));
      await readSequentially('Moving', () => device.isMoving());
    }
    
    console.log('');
    console.log('🏁 Diagnostic complete');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   • If all tests pass, the monitoring should work');
    console.log('   • If some tests fail, we need to adjust timeouts or addresses');
    console.log('   • If parallel reads fail but sequential reads work, we need to reduce load');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    try {
      await controller.disconnect();
    } catch (disconnectError) {
      console.error('Warning: Disconnect error:', disconnectError.message);
    }
  }
}

main().catch(console.error);