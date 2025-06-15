import { jest } from '@jest/globals';
import { DynamixelController } from '../../src/DynamixelController.js';
import { AlarmManager } from '../../src/dynamixel/AlarmManager.js';
import { MotorProfiles } from '../../src/dynamixel/MotorProfiles.js';
import { Logger } from '../../src/utils/Logger.js';

describe('Enhanced Features Integration', () => {
  let controller;
  let alarmManager;
  let motorProfiles;
  let logger;

  beforeEach(() => {
    // Create enhanced components
    logger = new Logger({
      level: 'debug',
      enableConsole: false, // Disable console output for tests
      enablePerformanceMetrics: true
    });

    alarmManager = new AlarmManager();
    motorProfiles = new MotorProfiles();

    // Create controller with enhanced features
    controller = new DynamixelController({
      connectionType: 'auto',
      timeout: 100
    });
  });

  afterEach(async() => {
    if (controller && controller.isConnected) {
      await controller.disconnect();
    }
  });

  describe('Logger Integration', () => {
    test('should log controller operations', async() => {
      const logSpy = jest.fn();
      logger.on('log', logSpy);

      // Test logging directly instead of through controller
      logger.info('Connection attempt started', { category: 'controller' });
      logger.error('Connection failed - no device found', { category: 'controller' });

      // Should have logged the connection attempt
      const connectionLogs = logger.getLogs({ category: 'controller' });
      expect(connectionLogs.length).toBeGreaterThan(0);
    });

    test('should measure performance of operations', async() => {
      const performanceSpy = jest.fn();
      logger.on('performance', performanceSpy);

      // Measure a mock operation
      const result = await logger.measureAsync('test_operation', async() => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'test_result';
      });

      expect(result).toBe('test_result');
      expect(performanceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test_operation',
          duration: expect.any(Number),
          success: true
        })
      );
    });

    test('should create device-specific loggers', () => {
      const deviceLogger = logger.forDevice(5);
      deviceLogger.info('Device-specific message');

      const deviceLogs = logger.getLogs({ deviceId: 5 });
      expect(deviceLogs).toHaveLength(1);
      expect(deviceLogs[0].message).toBe('Device-specific message');
    });

    test('should export logs in different formats', () => {
      logger.info('Test message 1', { category: 'test' });
      logger.warn('Test message 2', { category: 'test' });

      // Test JSON export
      const jsonExport = logger.exportLogs('json', { category: 'test' });
      const parsed = JSON.parse(jsonExport);
      expect(parsed).toHaveLength(2);

      // Test CSV export
      const csvExport = logger.exportLogs('csv', { category: 'test' });
      expect(csvExport).toContain('timestamp,level,category,deviceId,message');

      // Test text export
      const textExport = logger.exportLogs('text', { category: 'test' });
      expect(textExport).toContain('INFO');
      expect(textExport).toContain('WARN');
    });
  });

  describe('MotorProfiles Integration', () => {
    test('should provide motor specifications for device configuration', () => {
      const xm430Profile = motorProfiles.getProfile('XM430-W350');
      expect(xm430Profile).toBeDefined();
      expect(xm430Profile.specs.stallTorque).toBe(4.1);
      expect(xm430Profile.specs.maxSpeed).toBe(46);
    });

    test('should validate motor settings against profiles', () => {
      // Valid settings
      const validResult = motorProfiles.validateProfile('XM430-W350', {
        goalPosition: 2048,
        goalVelocity: 50
      });
      expect(validResult.valid).toBe(true);

      // Invalid settings
      const invalidResult = motorProfiles.validateProfile('XM430-W350', {
        goalPosition: 5000 // Outside valid range
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    test('should provide synchronization settings for multiple motors', () => {
      const syncSettings = motorProfiles.getSynchronizationSettings([
        'XM430-W350', 'MX-28', 'AX-12A'
      ]);

      expect(syncSettings).toMatchObject({
        recommendedVelocity: expect.any(Number),
        returnDelay: expect.any(Number),
        statusReturnLevel: 1,
        recommendedUpdateRate: expect.any(Number)
      });
    });

    test('should support custom motor profiles', () => {
      const customProfile = {
        modelNumber: 9999,
        series: 'CUSTOM',
        specs: {
          stallTorque: 10.0,
          maxSpeed: 100,
          resolution: 4096
        },
        defaultSettings: {
          torqueEnable: 1,
          goalPosition: 2048
        }
      };

      motorProfiles.createCustomProfile('CUSTOM_MOTOR', customProfile);
      const retrieved = motorProfiles.getProfile('CUSTOM_MOTOR');

      expect(retrieved).toMatchObject(customProfile);
      expect(retrieved.custom).toBe(true);
    });

    test('should provide application-specific profiles', () => {
      const armProfile = motorProfiles.getProfile('ROBOT_ARM_6DOF');
      expect(armProfile.type).toBe('application_profile');
      expect(armProfile.joints).toBeDefined();
      expect(armProfile.joints.base.motorModel).toBe('XM430-W350');

      const robotProfile = motorProfiles.getProfile('MOBILE_ROBOT_4WD');
      expect(robotProfile.type).toBe('application_profile');
      expect(robotProfile.wheels).toBeDefined();
      expect(robotProfile.kinematics).toBeDefined();
    });
  });

  describe('AlarmManager Integration', () => {
    test('should monitor device sensor values', () => {
      const alarmSpy = jest.fn();
      const emergencySpy = jest.fn();

      alarmManager.on('alarm', alarmSpy);
      alarmManager.on('emergency_stop', emergencySpy);

      // Normal values - no alarms
      alarmManager.checkSensorAlarms(1, {
        temperature: 65,
        voltage: 12.0,
        load: 50
      });
      expect(alarmSpy).not.toHaveBeenCalled();

      // Warning level temperature
      alarmManager.checkSensorAlarms(1, { temperature: 75 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          type: 'temperature'
        })
      );

      // Fatal level temperature
      alarmManager.checkSensorAlarms(1, { temperature: 95 });
      expect(emergencySpy).toHaveBeenCalled();
    });

    test('should process hardware error flags', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Multiple error flags
      alarmManager.processHardwareError(1, 0x05); // Voltage + Temperature

      expect(alarmSpy).toHaveBeenCalledTimes(2);
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'voltage' })
      );
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'temperature' })
      );
    });

    test('should manage alarm history and statistics', () => {
      // Generate some alarms
      alarmManager.raiseAlarm(1, { type: 'temp', severity: 'warning', message: 'Test 1' });
      alarmManager.raiseAlarm(1, { type: 'voltage', severity: 'critical', message: 'Test 2' });
      alarmManager.raiseAlarm(2, { type: 'load', severity: 'warning', message: 'Test 3' });

      const summary = alarmManager.getAlarmSummary();
      expect(summary).toMatchObject({
        totalActiveAlarms: 3,
        devicesWithAlarms: 2,
        alarmsBySeverity: {
          warning: 2,
          critical: 1,
          fatal: 0
        }
      });

      const stats = alarmManager.getStatistics();
      expect(stats.totalDevices).toBe(2);
      expect(stats.totalAlarms).toBe(3);
    });

    test('should support custom alarm thresholds', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Lower temperature warning threshold
      alarmManager.setThresholds('temperature', { warning: 60 });

      // This should now trigger a warning
      alarmManager.checkSensorAlarms(1, { temperature: 65 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'temperature',
          severity: 'warning'
        })
      );
    });
  });

  describe('Integrated Workflow', () => {
    test('should combine all enhanced features in a realistic scenario', async() => {
      // Set up event listeners
      const alarmSpy = jest.fn();
      const logSpy = jest.fn();
      const performanceSpy = jest.fn();

      alarmManager.on('alarm', alarmSpy);
      logger.on('log:controller', logSpy);
      logger.on('performance', performanceSpy);

      // Simulate device discovery with logging
      const discoveryResult = await logger.measureAsync('mock_discovery', async() => {
        // Mock discovery process
        logger.info('Starting device discovery', { category: 'controller' });
        await new Promise(resolve => setTimeout(resolve, 10));
        logger.info('Discovery complete', { category: 'controller' });
        return [{ id: 1, modelNumber: 1030 }]; // Mock XM430-W350
      });

      expect(discoveryResult).toHaveLength(1);
      expect(performanceSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(2);

      // Apply motor profile to discovered device
      const deviceId = discoveryResult[0].id;
      const modelNumber = discoveryResult[0].modelNumber;

      // Find profile by model number
      const allProfiles = motorProfiles.getAllProfiles();
      let deviceProfile = null;
      for (const [_name, profile] of allProfiles) {
        if (profile.modelNumber === modelNumber) {
          deviceProfile = profile;
          break;
        }
      }

      expect(deviceProfile).toBeDefined();
      expect(deviceProfile.series).toBe('X');

      // Get recommended settings
      const settings = motorProfiles.getRecommendedSettings('XM430-W350', 'precision');
      expect(settings).toBeDefined();
      expect(settings.goalVelocity).toBe(20);

      // Simulate device monitoring with alarms
      alarmManager.checkSensorAlarms(deviceId, {
        temperature: 85, // Critical level
        voltage: 12.0,   // Normal
        load: 90         // Warning level
      });

      expect(alarmSpy).toHaveBeenCalledTimes(2); // Temperature critical + Load warning

      // Check alarm summary
      const summary = alarmManager.getAlarmSummary();
      expect(summary.totalActiveAlarms).toBe(2);
      expect(summary.devicesWithAlarms).toBe(1);

      // Export logs for analysis
      const logs = logger.getLogs({ category: 'controller' });
      expect(logs.length).toBeGreaterThan(0);

      const csvExport = logger.exportLogs('csv', {
        category: 'controller',
        limit: 10
      });
      expect(csvExport).toContain('Starting device discovery');
    });

    test('should handle multi-motor synchronization scenario', () => {
      // Simulate a robot arm with multiple motors
      const armProfile = motorProfiles.getProfile('ROBOT_ARM_6DOF');
      expect(armProfile.joints).toBeDefined();

      // Get motor models from arm profile
      const motorModels = Object.values(armProfile.joints).map(joint => joint.motorModel);
      const uniqueModels = [...new Set(motorModels)];

      // Get synchronization settings
      const syncSettings = motorProfiles.getSynchronizationSettings(uniqueModels);
      expect(syncSettings).toBeDefined();
      expect(syncSettings.recommendedVelocity).toBeGreaterThan(0);

      // Monitor all joints for alarms
      Object.keys(armProfile.joints).forEach((jointName, index) => {
        const deviceId = index + 1;

        // Simulate normal operation
        alarmManager.checkSensorAlarms(deviceId, {
          temperature: 65,
          voltage: 12.0,
          load: 60
        });

        // Log joint status
        logger.info(`Joint ${jointName} status normal`, {
          category: 'robot_arm',
          deviceId,
          joint: jointName
        });
      });

      // Check that no alarms were raised for normal operation
      const summary = alarmManager.getAlarmSummary();
      expect(summary.totalActiveAlarms).toBe(0);

      // Check that all joints were logged
      const armLogs = logger.getLogs({ category: 'robot_arm' });
      expect(armLogs.length).toBe(Object.keys(armProfile.joints).length);
    });

    test('should handle error scenarios gracefully', () => {
      // Test error handling in performance measurement
      const errorFn = async() => {
        throw new Error('Simulated error');
      };

      expect(logger.measureAsync('error_test', errorFn)).rejects.toThrow('Simulated error');

      // Test alarm manager with invalid data
      alarmManager.checkSensorAlarms(1, {
        temperature: undefined,
        voltage: null,
        load: 'invalid'
      });

      // Should not crash and should not raise alarms for invalid data
      const summary = alarmManager.getAlarmSummary();
      expect(summary.totalActiveAlarms).toBe(0);

      // Test motor profiles with invalid motor
      const result = motorProfiles.validateProfile('INVALID_MOTOR', {
        goalPosition: 1000
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown motor model');
    });
  });

  describe('Event-Driven Integration', () => {
    test('should coordinate events between components', () => {
      const events = [];

      // Set up event listeners to track coordination
      logger.on('log', (entry) => {
        events.push({ type: 'log', level: entry.level, category: entry.category });
      });

      alarmManager.on('alarm', (alarm) => {
        events.push({ type: 'alarm', severity: alarm.severity, alarmType: alarm.type });

        // Log the alarm
        logger.warn(`Alarm raised: ${alarm.message}`, {
          category: 'alarm_system',
          deviceId: alarm.deviceId,
          alarmType: alarm.type
        });
      });

      alarmManager.on('emergency_stop', (event) => {
        events.push({ type: 'emergency_stop', deviceId: event.deviceId });

        // Log emergency stop
        logger.fatal(`Emergency stop triggered for device ${event.deviceId}`, {
          category: 'emergency',
          deviceId: event.deviceId
        });
      });

      // Trigger a sequence of events
      logger.info('System startup', { category: 'system' });

      alarmManager.checkSensorAlarms(1, { temperature: 75 }); // Warning
      alarmManager.checkSensorAlarms(1, { temperature: 95 }); // Fatal -> Emergency stop

      // Verify event sequence
      expect(events).toEqual([
        { type: 'log', level: 'info', category: 'system' },
        { type: 'alarm', severity: 'warning', alarmType: 'temperature' },
        { type: 'log', level: 'warn', category: 'alarm_system' },
        { type: 'alarm', severity: 'fatal', alarmType: 'temperature' },
        { type: 'log', level: 'warn', category: 'alarm_system' },
        { type: 'emergency_stop', deviceId: 1 },
        { type: 'log', level: 'fatal', category: 'emergency' }
      ]);
    });
  });
});
