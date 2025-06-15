import { EventEmitter } from 'events';

/**
 * Enhanced alarm management for DYNAMIXEL devices
 * Inspired by DynaNode's alarm system architecture
 */
export class AlarmManager extends EventEmitter {
    constructor() {
        super();
        this.alarmHistory = new Map(); // deviceId -> alarm history
        this.activeAlarms = new Map(); // deviceId -> active alarms
        this.alarmThresholds = new Map(); // alarm type -> threshold config

        this.setupDefaultThresholds();
    }

    setupDefaultThresholds() {
        // Temperature thresholds
        this.alarmThresholds.set('temperature', {
            warning: 70,  // Celsius
            critical: 80,
            fatal: 90
        });

        // Voltage thresholds
        this.alarmThresholds.set('voltage', {
            low_warning: 10.0,   // Volts
            low_critical: 9.5,
            high_warning: 14.0,
            high_critical: 15.0
        });

        // Load thresholds
        this.alarmThresholds.set('load', {
            warning: 80,  // Percentage
            critical: 95
        });

        // Communication error thresholds
        this.alarmThresholds.set('communication', {
            timeout_count: 5,
            consecutive_errors: 3
        });
    }

    /**
     * Process hardware error flags from DYNAMIXEL device
     */
    processHardwareError(deviceId, errorFlags) {
        const alarms = [];

        if (errorFlags & 0x01) alarms.push({ type: 'voltage', severity: 'critical', message: 'Input voltage error' });
        if (errorFlags & 0x02) alarms.push({ type: 'angle', severity: 'critical', message: 'Angle limit error' });
        if (errorFlags & 0x04) alarms.push({ type: 'temperature', severity: 'critical', message: 'Overheating error' });
        if (errorFlags & 0x08) alarms.push({ type: 'range', severity: 'warning', message: 'Range error' });
        if (errorFlags & 0x10) alarms.push({ type: 'checksum', severity: 'warning', message: 'Checksum error' });
        if (errorFlags & 0x20) alarms.push({ type: 'overload', severity: 'critical', message: 'Overload error' });
        if (errorFlags & 0x40) alarms.push({ type: 'instruction', severity: 'warning', message: 'Instruction error' });

        for (const alarm of alarms) {
            this.raiseAlarm(deviceId, alarm);
        }
    }

    /**
     * Check sensor values against thresholds
     */
    checkSensorAlarms(deviceId, sensorData) {
        // Temperature check
        if (sensorData.temperature !== undefined && typeof sensorData.temperature === 'number' && !isNaN(sensorData.temperature)) {
            const tempThresholds = this.alarmThresholds.get('temperature');
            if (sensorData.temperature >= tempThresholds.fatal) {
                this.raiseAlarm(deviceId, {
                    type: 'temperature',
                    severity: 'fatal',
                    message: `Temperature critical: ${sensorData.temperature}°C`,
                    value: sensorData.temperature
                });
            } else if (sensorData.temperature >= tempThresholds.critical) {
                this.raiseAlarm(deviceId, {
                    type: 'temperature',
                    severity: 'critical',
                    message: `Temperature high: ${sensorData.temperature}°C`,
                    value: sensorData.temperature
                });
            } else if (sensorData.temperature >= tempThresholds.warning) {
                this.raiseAlarm(deviceId, {
                    type: 'temperature',
                    severity: 'warning',
                    message: `Temperature elevated: ${sensorData.temperature}°C`,
                    value: sensorData.temperature
                });
            }
        }

        // Voltage check
        if (sensorData.voltage !== undefined && typeof sensorData.voltage === 'number' && !isNaN(sensorData.voltage)) {
            const voltThresholds = this.alarmThresholds.get('voltage');
            if (sensorData.voltage <= voltThresholds.low_critical) {
                this.raiseAlarm(deviceId, {
                    type: 'voltage',
                    severity: 'critical',
                    message: `Voltage critically low: ${sensorData.voltage}V`,
                    value: sensorData.voltage
                });
            } else if (sensorData.voltage >= voltThresholds.high_critical) {
                this.raiseAlarm(deviceId, {
                    type: 'voltage',
                    severity: 'critical',
                    message: `Voltage critically high: ${sensorData.voltage}V`,
                    value: sensorData.voltage
                });
            }
        }

        // Load check
        if (sensorData.load !== undefined && typeof sensorData.load === 'number' && !isNaN(sensorData.load)) {
            const loadThresholds = this.alarmThresholds.get('load');
            const loadPercent = Math.abs(sensorData.load);
            if (loadPercent >= loadThresholds.critical) {
                this.raiseAlarm(deviceId, {
                    type: 'load',
                    severity: 'critical',
                    message: `Load critically high: ${loadPercent}%`,
                    value: loadPercent
                });
            } else if (loadPercent >= loadThresholds.warning) {
                this.raiseAlarm(deviceId, {
                    type: 'load',
                    severity: 'warning',
                    message: `Load elevated: ${loadPercent}%`,
                    value: loadPercent
                });
            }
        }
    }

    /**
     * Raise an alarm
     */
    raiseAlarm(deviceId, alarm) {
        const timestamp = Date.now();
        const alarmRecord = {
            ...alarm,
            deviceId,
            timestamp,
            id: `${deviceId}_${alarm.type}_${timestamp}`
        };

        // Add to active alarms
        if (!this.activeAlarms.has(deviceId)) {
            this.activeAlarms.set(deviceId, new Map());
        }
        this.activeAlarms.get(deviceId).set(alarm.type, alarmRecord);

        // Add to history
        if (!this.alarmHistory.has(deviceId)) {
            this.alarmHistory.set(deviceId, []);
        }
        const history = this.alarmHistory.get(deviceId);
        history.push(alarmRecord);

        // Keep history manageable (last 100 alarms per device)
        if (history.length > 100) {
            history.shift();
        }

        // Emit alarm event
        this.emit('alarm', alarmRecord);
        this.emit(`alarm:${alarm.severity}`, alarmRecord);
        this.emit(`alarm:${alarm.type}`, alarmRecord);

        // Auto-shutdown for fatal alarms
        if (alarm.severity === 'fatal') {
            this.emit('emergency_stop', { deviceId, alarm: alarmRecord });
        }
    }

    /**
     * Clear an alarm
     */
    clearAlarm(deviceId, alarmType) {
        const deviceAlarms = this.activeAlarms.get(deviceId);
        if (deviceAlarms && deviceAlarms.has(alarmType)) {
            const clearedAlarm = deviceAlarms.get(alarmType);
            deviceAlarms.delete(alarmType);

            this.emit('alarm_cleared', {
                ...clearedAlarm,
                clearedAt: Date.now()
            });
        }
    }

    /**
     * Get active alarms for a device
     */
    getActiveAlarms(deviceId) {
        const deviceAlarms = this.activeAlarms.get(deviceId);
        return deviceAlarms ? Array.from(deviceAlarms.values()) : [];
    }

    /**
     * Get alarm history for a device
     */
    getAlarmHistory(deviceId, limit = 20) {
        const history = this.alarmHistory.get(deviceId) || [];
        return history.slice(-limit);
    }

    /**
     * Get system-wide alarm summary
     */
    getAlarmSummary() {
        const summary = {
            totalActiveAlarms: 0,
            alarmsByType: {},
            alarmsBySeverity: { warning: 0, critical: 0, fatal: 0 },
            devicesWithAlarms: 0
        };

        for (const [deviceId, deviceAlarms] of this.activeAlarms) {
            if (deviceAlarms.size > 0) {
                summary.devicesWithAlarms++;
                summary.totalActiveAlarms += deviceAlarms.size;

                for (const alarm of deviceAlarms.values()) {
                    summary.alarmsByType[alarm.type] = (summary.alarmsByType[alarm.type] || 0) + 1;
                    summary.alarmsBySeverity[alarm.severity]++;
                }
            }
        }

        return summary;
    }

    /**
     * Update alarm thresholds
     */
    setThresholds(type, thresholds) {
        this.alarmThresholds.set(type, { ...this.alarmThresholds.get(type), ...thresholds });
        this.emit('thresholds_updated', { type, thresholds });
    }

    /**
     * Reset all alarms for a device
     */
    resetAlarms(deviceId) {
        this.activeAlarms.delete(deviceId);
        this.emit('alarms_reset', { deviceId });
    }

    /**
     * Get alarm statistics
     */
    getStatistics() {
        let totalAlarms = 0;
        let totalDevices = this.alarmHistory.size;
        const alarmTypes = {};

        for (const history of this.alarmHistory.values()) {
            totalAlarms += history.length;
            for (const alarm of history) {
                alarmTypes[alarm.type] = (alarmTypes[alarm.type] || 0) + 1;
            }
        }

        return {
            totalDevices,
            totalAlarms,
            averageAlarmsPerDevice: totalDevices > 0 ? totalAlarms / totalDevices : 0,
            alarmTypes,
            activeSummary: this.getAlarmSummary()
        };
    }
}
