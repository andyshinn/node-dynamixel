#!/usr/bin/env node

/**
 * DYNAMIXEL Indirect Addressing Example
 * 
 * This example demonstrates how to use indirect addressing to efficiently 
 * monitor multiple motor parameters with fewer communication packets.
 * 
 * Indirect addressing maps control table addresses to alternate memory 
 * locations, enabling bulk read/write operations for non-contiguous data.
 */

import { DynamixelController } from '../src/DynamixelController.js';
import { CONTROL_TABLE } from '../src/dynamixel/constants.js';

const DEVICE_ID = 1;
const MONITORING_INTERVAL = 100; // ms

async function demonstrateIndirectAddressing() {
  const controller = new DynamixelController();
  
  try {
    console.log('🔌 Connecting to DYNAMIXEL network...');
    await controller.connect();
    
    console.log('🔍 Discovering devices...');
    const devices = await controller.discoverDevices();
    
    if (devices.length === 0) {
      console.log('❌ No DYNAMIXEL devices found');
      return;
    }
    
    const device = devices.find(d => d.id === DEVICE_ID) || devices[0];
    console.log(`📱 Using device ID ${device.id} (${device.modelName})`);
    
    // Disable torque to access indirect addresses (required for most motors)
    console.log('🔧 Disabling torque to setup indirect addressing...');
    await device.setTorqueEnable(false);
    
    // Setup indirect addressing for common monitoring parameters
    console.log('🗺️  Setting up indirect address mappings...');
    
    // Map key parameters to indirect addresses
    // Each indirect data slot can hold 1 byte, so multi-byte values need multiple slots
    await device.setupIndirectAddress(0, CONTROL_TABLE.PRESENT_POSITION);     // Position byte 0
    await device.setupIndirectAddress(1, CONTROL_TABLE.PRESENT_POSITION + 1); // Position byte 1  
    await device.setupIndirectAddress(2, CONTROL_TABLE.PRESENT_POSITION + 2); // Position byte 2
    await device.setupIndirectAddress(3, CONTROL_TABLE.PRESENT_POSITION + 3); // Position byte 3
    
    await device.setupIndirectAddress(4, CONTROL_TABLE.PRESENT_VELOCITY);     // Velocity byte 0
    await device.setupIndirectAddress(5, CONTROL_TABLE.PRESENT_VELOCITY + 1); // Velocity byte 1
    await device.setupIndirectAddress(6, CONTROL_TABLE.PRESENT_VELOCITY + 2); // Velocity byte 2  
    await device.setupIndirectAddress(7, CONTROL_TABLE.PRESENT_VELOCITY + 3); // Velocity byte 3
    
    await device.setupIndirectAddress(8, CONTROL_TABLE.PRESENT_PWM);          // PWM byte 0
    await device.setupIndirectAddress(9, CONTROL_TABLE.PRESENT_PWM + 1);      // PWM byte 1
    
    await device.setupIndirectAddress(10, CONTROL_TABLE.PRESENT_TEMPERATURE); // Temperature
    await device.setupIndirectAddress(11, CONTROL_TABLE.MOVING);              // Moving status
    await device.setupIndirectAddress(12, CONTROL_TABLE.PRESENT_INPUT_VOLTAGE); // Voltage byte 0
    await device.setupIndirectAddress(13, CONTROL_TABLE.PRESENT_INPUT_VOLTAGE + 1); // Voltage byte 1
    
    console.log('✅ Indirect addressing setup complete');
    console.log(`📋 Mapped ${device.getIndirectMappings().size} indirect addresses`);
    
    // Re-enable torque for normal operation
    console.log('⚡ Re-enabling torque...');
    await device.setTorqueEnable(true);
    
    // Demonstrate bulk reading through indirect addressing
    console.log('\n📊 Starting real-time monitoring using indirect addressing...');
    console.log('   Press Ctrl+C to stop\n');
    
    let count = 0;
    const startTime = Date.now();
    
    const monitoringLoop = setInterval(async () => {
      try {
        // Read all mapped values in one efficient bulk operation
        const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        const data = await device.bulkReadIndirect(indices);
        
        // Reconstruct multi-byte values from individual bytes
        const position = (data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)) >>> 0;
        const velocity = (data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)) >>> 0;
        const pwm = data[8] | (data[9] << 8);
        const temperature = data[10];
        const moving = data[11];
        const voltage = data[12] | (data[13] << 8);
        
        // Convert raw values to meaningful units
        const positionDegrees = device.positionToDegrees(position);
        const velocityRPM = device.velocityToRPM(velocity);
        const voltageVolts = device.voltageToVolts(voltage);
        
        // Display monitoring data
        process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear line
        process.stdout.write(
          `[${(count++).toString().padStart(4, ' ')}] ` +
          `Pos: ${positionDegrees.toFixed(1)}° | ` +
          `Vel: ${velocityRPM.toFixed(1)} RPM | ` +
          `PWM: ${pwm} | ` +
          `Temp: ${temperature}°C | ` +
          `${moving ? '🔄' : '⏸️ '} | ` +
          `${voltageVolts.toFixed(1)}V`
        );
        
        // Demonstrate writing through indirect addressing
        // Toggle LED every 2 seconds using indirect addressing
        if (count % 20 === 0) {
          // First map LED control to an indirect address
          await device.setupIndirectAddress(15, CONTROL_TABLE.LED);
          // Then write through indirect addressing
          await device.writeIndirectData(15, count % 40 === 0 ? 1 : 0);
        }
        
      } catch (error) {
        console.error('\n❌ Monitoring error:', error.message);
      }
    }, MONITORING_INTERVAL);
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      clearInterval(monitoringLoop);
      console.log('\n\n🧹 Cleaning up...');
      
      try {
        // Clear all indirect mappings
        await device.clearAllIndirectMappings();
        console.log('✅ Indirect mappings cleared');
        
        // Turn off LED
        await device.setLED(false);
        
        await controller.disconnect();
        console.log('✅ Disconnected from DYNAMIXEL network');
      } catch (error) {
        console.error('❌ Cleanup error:', error.message);
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await controller.disconnect();
    } catch (disconnectError) {
      console.error('❌ Disconnect error:', disconnectError.message);
    }
  }
}

async function demonstrateCommonMappings() {
  console.log('\n🚀 Demonstrating common indirect mappings...\n');
  
  const controller = new DynamixelController();
  
  try {
    await controller.connect();
    const devices = await controller.discoverDevices();
    
    if (devices.length === 0) {
      console.log('❌ No devices found for common mappings demo');
      return;
    }
    
    const device = devices[0];
    console.log(`📱 Using device ID ${device.id} for common mappings demo`);
    
    // Disable torque to setup mappings
    await device.setTorqueEnable(false);
    
    // Use the convenient common mappings setup
    await device.setupCommonIndirectMappings();
    console.log('✅ Common indirect mappings setup complete');
    
    // Re-enable torque
    await device.setTorqueEnable(true);
    
    // Read common status efficiently
    for (let i = 0; i < 5; i++) {
      const status = await device.readCommonStatus();
      console.log(`📊 Common Status ${i + 1}:`, {
        position: status.position,
        velocity: status.velocity,
        pwm: status.pwm,
        temperature: status.temperature,
        moving: Boolean(status.moving)
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await controller.disconnect();
    console.log('✅ Common mappings demo complete');
    
  } catch (error) {
    console.error('❌ Common mappings error:', error.message);
    try {
      await controller.disconnect();
    } catch (disconnectError) {
      console.error('❌ Disconnect error:', disconnectError.message);
    }
  }
}

// Run the demonstrations
async function main() {
  console.log('🎯 DYNAMIXEL Indirect Addressing Example\n');
  
  // First demonstrate detailed indirect addressing
  await demonstrateIndirectAddressing();
  
  // Wait a bit between demos
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Then demonstrate common mappings
  await demonstrateCommonMappings();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { demonstrateIndirectAddressing, demonstrateCommonMappings };