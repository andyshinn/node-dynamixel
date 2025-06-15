import { jest } from '@jest/globals';
import { AlarmManager } from '../../src/dynamixel/AlarmManager.js';

describe('AlarmManager', () => {
  let alarmManager;

  beforeEach(() => {
    alarmManager = new AlarmManager();
  });

  describe('Constructor', () => {
    test('should initialize with default thresholds', () => {
      expect(alarmManager.alarmThresholds.size).toBeGreaterThan(0);
      expect(alarmManager.alarmHistory.size).toBe(0);
      expect(alarmManager.activeAlarms.size).toBe(0);
    });

    test('should have temperature thresholds', () => {
      const tempThresholds = alarmManager.alarmThresholds.get('temperature');
      expect(tempThresholds).toMatchObject({
        warning: 70,
        critical: 80,
        fatal: 90
      });
    });

    test('should have voltage thresholds', () => {
      const voltageThresholds = alarmManager.alarmThresholds.get('voltage');
      expect(voltageThresholds).toMatchObject({
        low_warning: 10.0,
        low_critical: 9.5,
        high_warning: 14.0,
        high_critical: 15.0
      });
    });

    test('should have load thresholds', () => {
      const loadThresholds = alarmManager.alarmThresholds.get('load');
      expect(loadThresholds).toMatchObject({
        warning: 80,
        critical: 95
      });
    });
  });

  describe('Hardware Error Processing', () => {
    test('should process voltage error flag', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.processHardwareError(1, 0x01); // Voltage error

      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 1,
          type: 'voltage',
          severity: 'critical',
          message: 'Input voltage error'
        })
      );
    });

    test('should process multiple error flags', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.processHardwareError(2, 0x05); // Voltage (0x01) + Temperature (0x04)

      expect(alarmSpy).toHaveBeenCalledTimes(2);
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'voltage', severity: 'critical' })
      );
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'temperature', severity: 'critical' })
      );
    });

    test('should process all hardware error types', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Test all error flags
      const errorFlags = [
        { flag: 0x01, type: 'voltage', message: 'Input voltage error' },
        { flag: 0x02, type: 'angle', message: 'Angle limit error' },
        { flag: 0x04, type: 'temperature', message: 'Overheating error' },
        { flag: 0x08, type: 'range', message: 'Range error' },
        { flag: 0x10, type: 'checksum', message: 'Checksum error' },
        { flag: 0x20, type: 'overload', message: 'Overload error' },
        { flag: 0x40, type: 'instruction', message: 'Instruction error' }
      ];

      errorFlags.forEach(({ flag, type, message }, index) => {
        alarmManager.processHardwareError(index + 1, flag);
        expect(alarmSpy).toHaveBeenCalledWith(
          expect.objectContaining({ type, message })
        );
      });
    });
  });

  describe('Sensor Alarm Checking', () => {
    test('should detect temperature warnings', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.checkSensorAlarms(1, { temperature: 75 }); // Warning level

      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 1,
          type: 'temperature',
          severity: 'warning',
          message: 'Temperature elevated: 75°C',
          value: 75
        })
      );
    });

    test('should detect temperature critical alarms', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.checkSensorAlarms(1, { temperature: 85 }); // Critical level

      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          message: 'Temperature high: 85°C'
        })
      );
    });

    test('should detect temperature fatal alarms', () => {
      const alarmSpy = jest.fn();
      const emergencySpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);
      alarmManager.on('emergency_stop', emergencySpy);

      alarmManager.checkSensorAlarms(1, { temperature: 95 }); // Fatal level

      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'fatal',
          message: 'Temperature critical: 95°C'
        })
      );
      expect(emergencySpy).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 1 })
      );
    });

    test('should detect voltage alarms', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Low voltage critical
      alarmManager.checkSensorAlarms(1, { voltage: 9.0 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'voltage',
          severity: 'critical',
          message: 'Voltage critically low: 9V'
        })
      );

      // High voltage critical
      alarmManager.checkSensorAlarms(2, { voltage: 15.5 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'voltage',
          severity: 'critical',
          message: 'Voltage critically high: 15.5V'
        })
      );
    });

    test('should detect load alarms', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Warning level
      alarmManager.checkSensorAlarms(1, { load: 85 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'load',
          severity: 'warning',
          message: 'Load elevated: 85%'
        })
      );

      // Critical level
      alarmManager.checkSensorAlarms(2, { load: 98 });
      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'load',
          severity: 'critical',
          message: 'Load critically high: 98%'
        })
      );
    });

    test('should handle negative load values', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.checkSensorAlarms(1, { load: -90 }); // Negative load

      expect(alarmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'load',
          severity: 'warning',
          message: 'Load elevated: 90%',
          value: 90
        })
      );
    });

    test('should not alarm for normal sensor values', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      alarmManager.checkSensorAlarms(1, {
        temperature: 65, // Below warning
        voltage: 12.0,   // Normal
        load: 50         // Normal
      });

      expect(alarmSpy).not.toHaveBeenCalled();
    });
  });

  describe('Alarm Management', () => {
    test('should raise alarm with correct structure', () => {
      const alarm = {
        type: 'test',
        severity: 'warning',
        message: 'Test alarm'
      };

      alarmManager.raiseAlarm(1, alarm);

      const activeAlarms = alarmManager.getActiveAlarms(1);
      expect(activeAlarms).toHaveLength(1);
      expect(activeAlarms[0]).toMatchObject({
        ...alarm,
        deviceId: 1,
        timestamp: expect.any(Number),
        id: expect.stringMatching(/1_test_\d+/)
      });
    });

    test('should add alarm to history', () => {
      const alarm = { type: 'test', severity: 'info', message: 'Test' };
      alarmManager.raiseAlarm(1, alarm);

      const history = alarmManager.getAlarmHistory(1);
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject(alarm);
    });

    test('should maintain alarm history limit', () => {
      // Add more than 100 alarms to test history limit
      for (let i = 0; i < 105; i++) {
        alarmManager.raiseAlarm(1, {
          type: 'test',
          severity: 'info',
          message: `Test alarm ${i}`
        });
      }

      const fullHistory = alarmManager.getAlarmHistory(1, 200); // Get full history
      expect(fullHistory).toHaveLength(100); // Should be limited to 100
      expect(fullHistory[0].message).toBe('Test alarm 5'); // First 5 should be removed
    });

    test('should emit alarm events', () => {
      const alarmSpy = jest.fn();
      const severitySpy = jest.fn();
      const typeSpy = jest.fn();

      alarmManager.on('alarm', alarmSpy);
      alarmManager.on('alarm:warning', severitySpy);
      alarmManager.on('alarm:test', typeSpy);

      const alarm = { type: 'test', severity: 'warning', message: 'Test' };
      alarmManager.raiseAlarm(1, alarm);

      expect(alarmSpy).toHaveBeenCalled();
      expect(severitySpy).toHaveBeenCalled();
      expect(typeSpy).toHaveBeenCalled();
    });

    test('should clear specific alarm', () => {
      const clearSpy = jest.fn();
      alarmManager.on('alarm_cleared', clearSpy);

      // Raise alarm
      alarmManager.raiseAlarm(1, { type: 'test', severity: 'warning', message: 'Test' });
      expect(alarmManager.getActiveAlarms(1)).toHaveLength(1);

      // Clear alarm
      alarmManager.clearAlarm(1, 'test');
      expect(alarmManager.getActiveAlarms(1)).toHaveLength(0);
      expect(clearSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          clearedAt: expect.any(Number)
        })
      );
    });

    test('should handle clearing non-existent alarm', () => {
      const clearSpy = jest.fn();
      alarmManager.on('alarm_cleared', clearSpy);

      alarmManager.clearAlarm(1, 'non_existent');
      expect(clearSpy).not.toHaveBeenCalled();
    });

    test('should reset all alarms for device', () => {
      const resetSpy = jest.fn();
      alarmManager.on('alarms_reset', resetSpy);

      // Add multiple alarms
      alarmManager.raiseAlarm(1, { type: 'test1', severity: 'warning', message: 'Test 1' });
      alarmManager.raiseAlarm(1, { type: 'test2', severity: 'error', message: 'Test 2' });
      expect(alarmManager.getActiveAlarms(1)).toHaveLength(2);

      // Reset alarms
      alarmManager.resetAlarms(1);
      expect(alarmManager.getActiveAlarms(1)).toHaveLength(0);
      expect(resetSpy).toHaveBeenCalledWith({ deviceId: 1 });
    });
  });

  describe('Alarm Retrieval', () => {
    beforeEach(() => {
      // Set up test alarms
      alarmManager.raiseAlarm(1, { type: 'temp', severity: 'warning', message: 'Temp warning' });
      alarmManager.raiseAlarm(1, { type: 'voltage', severity: 'critical', message: 'Voltage critical' });
      alarmManager.raiseAlarm(2, { type: 'load', severity: 'warning', message: 'Load warning' });
    });

    test('should get active alarms for device', () => {
      const device1Alarms = alarmManager.getActiveAlarms(1);
      const device2Alarms = alarmManager.getActiveAlarms(2);

      expect(device1Alarms).toHaveLength(2);
      expect(device2Alarms).toHaveLength(1);
      expect(device1Alarms[0].type).toBe('temp');
      expect(device2Alarms[0].type).toBe('load');
    });

    test('should return empty array for device with no alarms', () => {
      const noAlarms = alarmManager.getActiveAlarms(999);
      expect(noAlarms).toEqual([]);
    });

    test('should get alarm history with limit', () => {
      // Add more alarms
      for (let i = 0; i < 25; i++) {
        alarmManager.raiseAlarm(1, { type: 'test', severity: 'info', message: `Test ${i}` });
      }

      const limitedHistory = alarmManager.getAlarmHistory(1, 10);
      expect(limitedHistory).toHaveLength(10);

      const fullHistory = alarmManager.getAlarmHistory(1);
      expect(fullHistory).toHaveLength(20); // Default limit
    });
  });

  describe('Alarm Summary and Statistics', () => {
    beforeEach(() => {
      alarmManager.raiseAlarm(1, { type: 'temperature', severity: 'warning', message: 'Temp 1' });
      alarmManager.raiseAlarm(1, { type: 'voltage', severity: 'critical', message: 'Voltage 1' });
      alarmManager.raiseAlarm(2, { type: 'temperature', severity: 'critical', message: 'Temp 2' });
      alarmManager.raiseAlarm(3, { type: 'load', severity: 'warning', message: 'Load 1' });
    });

    test('should provide comprehensive alarm summary', () => {
      const summary = alarmManager.getAlarmSummary();

      expect(summary).toMatchObject({
        totalActiveAlarms: 4,
        alarmsByType: {
          temperature: 2,
          voltage: 1,
          load: 1
        },
        alarmsBySeverity: {
          warning: 2,
          critical: 2,
          fatal: 0
        },
        devicesWithAlarms: 3
      });
    });

    test('should provide alarm statistics', () => {
      const stats = alarmManager.getStatistics();

      expect(stats).toMatchObject({
        totalDevices: 3,
        totalAlarms: 4,
        averageAlarmsPerDevice: expect.closeTo(1.33, 2),
        alarmTypes: {
          temperature: 2,
          voltage: 1,
          load: 1
        },
        activeSummary: expect.any(Object)
      });
    });

    test('should handle empty alarm state', () => {
      const emptyManager = new AlarmManager();
      const summary = emptyManager.getAlarmSummary();
      const stats = emptyManager.getStatistics();

      expect(summary.totalActiveAlarms).toBe(0);
      expect(summary.devicesWithAlarms).toBe(0);
      expect(stats.totalDevices).toBe(0);
      expect(stats.averageAlarmsPerDevice).toBe(0);
    });
  });

  describe('Threshold Management', () => {
    test('should update alarm thresholds', () => {
      const thresholdSpy = jest.fn();
      alarmManager.on('thresholds_updated', thresholdSpy);

      const newThresholds = { warning: 60, critical: 70 };
      alarmManager.setThresholds('temperature', newThresholds);

      const updatedThresholds = alarmManager.alarmThresholds.get('temperature');
      expect(updatedThresholds.warning).toBe(60);
      expect(updatedThresholds.critical).toBe(70);
      expect(updatedThresholds.fatal).toBe(90); // Should preserve existing values

      expect(thresholdSpy).toHaveBeenCalledWith({
        type: 'temperature',
        thresholds: newThresholds
      });
    });

    test('should use updated thresholds for alarm checking', () => {
      const alarmSpy = jest.fn();
      alarmManager.on('alarm', alarmSpy);

      // Lower the warning threshold
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

  describe('Emergency Stop', () => {
    test('should trigger emergency stop for fatal alarms', () => {
      const emergencySpy = jest.fn();
      alarmManager.on('emergency_stop', emergencySpy);

      alarmManager.raiseAlarm(1, {
        type: 'temperature',
        severity: 'fatal',
        message: 'Critical overheating'
      });

      expect(emergencySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 1,
          alarm: expect.objectContaining({
            severity: 'fatal',
            message: 'Critical overheating'
          })
        })
      );
    });

    test('should not trigger emergency stop for non-fatal alarms', () => {
      const emergencySpy = jest.fn();
      alarmManager.on('emergency_stop', emergencySpy);

      alarmManager.raiseAlarm(1, {
        type: 'temperature',
        severity: 'critical',
        message: 'High temperature'
      });

      expect(emergencySpy).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Device Management', () => {
    test('should handle alarms from multiple devices independently', () => {
      alarmManager.raiseAlarm(1, { type: 'temp', severity: 'warning', message: 'Device 1 temp' });
      alarmManager.raiseAlarm(2, { type: 'temp', severity: 'critical', message: 'Device 2 temp' });
      alarmManager.raiseAlarm(3, { type: 'voltage', severity: 'warning', message: 'Device 3 voltage' });

      expect(alarmManager.getActiveAlarms(1)).toHaveLength(1);
      expect(alarmManager.getActiveAlarms(2)).toHaveLength(1);
      expect(alarmManager.getActiveAlarms(3)).toHaveLength(1);

      const summary = alarmManager.getAlarmSummary();
      expect(summary.devicesWithAlarms).toBe(3);
      expect(summary.totalActiveAlarms).toBe(3);
    });

    test('should clear alarms for specific device only', () => {
      alarmManager.raiseAlarm(1, { type: 'temp', severity: 'warning', message: 'Device 1' });
      alarmManager.raiseAlarm(2, { type: 'temp', severity: 'warning', message: 'Device 2' });

      alarmManager.resetAlarms(1);

      expect(alarmManager.getActiveAlarms(1)).toHaveLength(0);
      expect(alarmManager.getActiveAlarms(2)).toHaveLength(1);
    });
  });

  describe('Alarm Persistence', () => {
    test('should maintain alarm history after clearing active alarms', () => {
      alarmManager.raiseAlarm(1, { type: 'test', severity: 'warning', message: 'Test alarm' });

      expect(alarmManager.getActiveAlarms(1)).toHaveLength(1);
      expect(alarmManager.getAlarmHistory(1)).toHaveLength(1);

      alarmManager.clearAlarm(1, 'test');

      expect(alarmManager.getActiveAlarms(1)).toHaveLength(0);
      expect(alarmManager.getAlarmHistory(1)).toHaveLength(1); // History preserved
    });

    test('should maintain alarm history after device reset', () => {
      alarmManager.raiseAlarm(1, { type: 'test1', severity: 'warning', message: 'Test 1' });
      alarmManager.raiseAlarm(1, { type: 'test2', severity: 'error', message: 'Test 2' });

      expect(alarmManager.getAlarmHistory(1)).toHaveLength(2);

      alarmManager.resetAlarms(1);

      expect(alarmManager.getActiveAlarms(1)).toHaveLength(0);
      expect(alarmManager.getAlarmHistory(1)).toHaveLength(2); // History preserved
    });
  });
});
