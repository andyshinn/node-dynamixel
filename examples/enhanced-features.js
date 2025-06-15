#!/usr/bin/env node

/**
 * Enhanced Features Example
 * Demonstrates the new capabilities inspired by DynaNode architecture:
 * - Advanced alarm management
 * - Motor profiles system
 * - Enhanced logging with performance metrics
 */

import { DynamixelController } from '../index.js';
import { AlarmManager } from '../src/dynamixel/AlarmManager.js';
import { MotorProfiles } from '../src/dynamixel/MotorProfiles.js';
import { Logger } from '../src/utils/Logger.js';

// Create enhanced logger with performance metrics
const logger = new Logger({
    level: 'debug',
    enablePerformanceMetrics: true,
    enableConsole: true
});

// Create motor profiles system
const motorProfiles = new MotorProfiles();

// Create alarm manager
const alarmManager = new AlarmManager();

async function demonstrateEnhancedFeatures() {
    console.log('🚀 DYNAMIXEL Enhanced Features Demo');
    console.log('=====================================\n');

    // 1. Demonstrate Motor Profiles
    console.log('📋 Motor Profiles System:');
    console.log('-------------------------');

    // Get profile for XM430-W350
    const xm430Profile = motorProfiles.getProfile('XM430-W350');
    if (xm430Profile) {
        console.log('XM430-W350 Profile:');
        console.log(`  Series: ${xm430Profile.series}`);
        console.log(`  Max Torque: ${xm430Profile.specs.stallTorque} kg·cm`);
        console.log(`  Max Speed: ${xm430Profile.specs.maxSpeed} RPM`);
        console.log(`  Resolution: ${xm430Profile.specs.resolution}`);

        // Get recommended settings for precision mode
        const precisionSettings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');
        console.log('  Precision Mode Settings:', precisionSettings);
    }

    // Show application profiles
    console.log('\nApplication Profiles:');
    const appProfiles = motorProfiles.getApplicationProfiles();
    for (const profile of appProfiles) {
        console.log(`  - ${profile.name}: ${profile.description}`);
    }

    // 2. Demonstrate Advanced Logging
    console.log('\n📊 Enhanced Logging System:');
    console.log('----------------------------');

    // Create device-specific logger
    const deviceLogger = logger.forDevice(1);
    deviceLogger.info('Device logger created');

    // Performance measurement
    const result = await logger.measureAsync('device_discovery', async () => {
        // Simulate device discovery
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'discovery_complete';
    }, { deviceCount: 5 });

    console.log('Performance measurement result:', result);

    // Protocol logging
    logger.logPacketSent(1, 'PING', [], { duration: 2.5 });
    logger.logPacketReceived(1, { instruction: 'STATUS', parameters: [0x00] }, { duration: 1.8 });

    // 3. Demonstrate Alarm Management
    console.log('\n🚨 Alarm Management System:');
    console.log('----------------------------');

    // Set up alarm listeners
    alarmManager.on('alarm', (alarm) => {
        console.log(`⚠️  ALARM [${alarm.severity.toUpperCase()}]: ${alarm.message}`);
    });

    alarmManager.on('emergency_stop', (event) => {
        console.log(`🛑 EMERGENCY STOP triggered for device ${event.deviceId}`);
    });

    // Simulate some alarms
    alarmManager.checkSensorAlarms(1, {
        temperature: 75, // Warning level
        voltage: 12.0,
        load: 85 // Warning level
    });

    alarmManager.checkSensorAlarms(2, {
        temperature: 85, // Critical level
        voltage: 9.0,    // Critical low
        load: 50
    });

    // Process hardware error
    alarmManager.processHardwareError(3, 0x04); // Overheating error

    // Show alarm statistics
    console.log('\nAlarm Summary:', alarmManager.getAlarmSummary());

    // 4. Demonstrate Real DYNAMIXEL Integration
    console.log('\n🔌 Real Device Integration:');
    console.log('---------------------------');

    try {
        const controller = new DynamixelController({
            connectionType: 'auto',
            logger: deviceLogger
        });

        // Set up enhanced event handling
        controller.on('device_discovered', (device) => {
            logger.info(`Device discovered: ${device.modelName} (ID: ${device.id})`);

            // Apply motor profile if available
            const profile = motorProfiles.getProfile(device.modelName);
            if (profile) {
                logger.info(`Applying profile for ${device.modelName}`);
                const settings = motorProfiles.getRecommendedSettings(device.modelName, 'balanced');
                console.log('  Recommended settings:', settings);

                // You could apply these settings to the device here
                // device.applySettings(settings);
            }
        });

        controller.on('error', (error) => {
            logger.error('Controller error', { error: error.message });
            alarmManager.raiseAlarm('controller', {
                type: 'communication',
                severity: 'error',
                message: error.message
            });
        });

        // Start discovery with enhanced logging
        logger.info('Starting device discovery...');
        const devices = await logger.measureAsync('full_discovery', async () => {
            return await controller.discoverDevices({
                idRange: [1, 10],
                timeout: 100
            });
        });

        if (devices.length > 0) {
            console.log(`\n✅ Found ${devices.length} device(s):`);

            for (const device of devices) {
                console.log(`  - ID ${device.id}: ${device.modelName || 'Unknown Model'}`);

                // Monitor device with alarms
                try {
                    const status = await device.getStatus();
                    alarmManager.checkSensorAlarms(device.id, {
                        temperature: status.temperature,
                        voltage: status.voltage,
                        load: status.load
                    });

                    // Check hardware errors
                    if (status.hardwareError && status.hardwareError > 0) {
                        alarmManager.processHardwareError(device.id, status.hardwareError);
                    }
                } catch (error) {
                    logger.error('Failed to get device status', {
                        deviceId: device.id,
                        error: error.message
                    });
                }
            }
        } else {
            console.log('  No devices found. Make sure devices are connected and powered.');
        }

        await controller.disconnect();

    } catch (error) {
        logger.error('Failed to connect to devices', { error: error.message });
        console.log('  This is normal if no U2D2/USB2Dynamixel adapter is connected.');
    }

    // 5. Demonstrate logging statistics and export
    console.log('\n📈 Logging Statistics:');
    console.log('----------------------');
    const stats = logger.getStatistics();
    console.log('Total logs:', stats.totalLogs);
    console.log('Log counts by level:', stats.logCounts);
    console.log('Categories:', Object.keys(stats.categories));

    if (stats.recentErrors.length > 0) {
        console.log('Recent errors:', stats.recentErrors.length);
    }

    // Export logs as JSON
    const recentLogs = logger.getLogs({ limit: 5 });
    console.log('\nRecent log entries:');
    for (const log of recentLogs) {
        console.log(`  ${new Date(log.timestamp).toISOString()} [${log.level.toUpperCase()}] ${log.message}`);
    }

    // 6. Demonstrate synchronization settings
    console.log('\n🔄 Multi-Motor Synchronization:');
    console.log('-------------------------------');
    const syncSettings = motorProfiles.getSynchronizationSettings(['XM430-W350', 'MX-28', 'AX-12A']);
    if (syncSettings) {
        console.log('Optimal sync settings for mixed motor group:');
        console.log(`  Recommended velocity: ${syncSettings.recommendedVelocity}`);
        console.log(`  Return delay: ${syncSettings.returnDelay}ms`);
        console.log(`  Update rate: ${syncSettings.recommendedUpdateRate}ms`);
    }

    console.log('\n✨ Enhanced features demonstration complete!');
    console.log('\nKey improvements inspired by DynaNode:');
    console.log('  ✓ Advanced alarm management with thresholds');
    console.log('  ✓ Motor profiles for different models and use cases');
    console.log('  ✓ Structured logging with performance metrics');
    console.log('  ✓ Application-specific configurations');
    console.log('  ✓ Enhanced error handling and monitoring');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    process.exit(0);
});

// Run the demonstration
demonstrateEnhancedFeatures().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
});
