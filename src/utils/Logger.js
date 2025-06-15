import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Enhanced Logger for DYNAMIXEL library
 * Inspired by DynaNode's Logger architecture
 * Provides structured logging with performance metrics and filtering
 */
export class Logger extends EventEmitter {
    constructor(options = {}) {
        super();

        this.level = options.level || 'info';
        this.enableConsole = options.enableConsole !== false;
        this.enableFile = options.enableFile || false;
        this.maxLogEntries = options.maxLogEntries || 1000;
        this.enablePerformanceMetrics = options.enablePerformanceMetrics || false;

        this.logLevels = {
            trace: 0,
            debug: 1,
            info: 2,
            warn: 3,
            error: 4,
            fatal: 5
        };

        this.logs = [];
        this.performanceMetrics = new Map();
        this.logCount = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };

        this.setupFormatters();
    }

    setupFormatters() {
        this.formatters = {
            console: (entry) => {
                const timestamp = new Date(entry.timestamp).toISOString();
                const level = entry.level.toUpperCase().padEnd(5);
                const device = entry.deviceId ? `[ID:${entry.deviceId}]` : '';
                const category = entry.category ? `[${entry.category}]` : '';
                return `${timestamp} ${level} ${device}${category} ${entry.message}`;
            },

            json: (entry) => JSON.stringify(entry),

            structured: (entry) => ({
                timestamp: entry.timestamp,
                level: entry.level,
                message: entry.message,
                deviceId: entry.deviceId,
                category: entry.category,
                data: entry.data,
                performance: entry.performance
            })
        };
    }

    /**
     * Check if a log level should be output
     */
    shouldLog(level) {
        return this.logLevels[level] >= this.logLevels[this.level];
    }

    /**
     * Core logging method
     */
    log(level, message, data = {}) {
        if (!this.shouldLog(level)) return;

        const entry = {
            timestamp: Date.now(),
            level,
            message,
            deviceId: data.deviceId,
            category: data.category || 'general',
            data: { ...data },
            performance: data.performance
        };

        // Remove meta fields from data
        delete entry.data.deviceId;
        delete entry.data.category;
        delete entry.data.performance;

        this.logCount[level]++;
        this.logs.push(entry);

        // Maintain log size limit
        if (this.logs.length > this.maxLogEntries) {
            this.logs.shift();
        }

        // Output to console
        if (this.enableConsole) {
            this.outputToConsole(entry);
        }

        // Emit log event
        this.emit('log', entry);
        this.emit(`log:${level}`, entry);

        if (entry.category) {
            this.emit(`log:${entry.category}`, entry);
        }
    }

    outputToConsole(entry) {
        const formatted = this.formatters.console(entry);

        switch (entry.level) {
            case 'trace':
            case 'debug':
                console.debug(formatted);
                break;
            case 'info':
                console.info(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'error':
            case 'fatal':
                console.error(formatted);
                break;
        }

        // Log additional data if present
        if (Object.keys(entry.data).length > 0) {
            console.log('  Data:', entry.data);
        }

        if (entry.performance) {
            console.log('  Performance:', entry.performance);
        }
    }

    // Convenience methods
    trace(message, data) { this.log('trace', message, data); }
    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
    fatal(message, data) { this.log('fatal', message, data); }

    /**
     * Protocol-specific logging methods
     */
    logProtocol(direction, deviceId, packet, timing) {
        if (!this.shouldLog('debug')) return;

        this.debug(`Protocol ${direction}`, {
            category: 'protocol',
            deviceId,
            packet: {
                instruction: packet.instruction,
                parameters: Array.from(packet.parameters || []),
                length: packet.data?.length || 0
            },
            timing
        });
    }

    logPacketSent(deviceId, instruction, parameters, timing) {
        this.logProtocol('TX', deviceId, { instruction, parameters }, timing);
    }

    logPacketReceived(deviceId, packet, timing) {
        this.logProtocol('RX', deviceId, packet, timing);
    }

    /**
     * Connection logging
     */
    logConnection(event, connectionType, details = {}) {
        const level = event === 'error' ? 'error' : 'info';
        this.log(level, `Connection ${event}`, {
            category: 'connection',
            connectionType,
            ...details
        });
    }

    /**
     * Device discovery logging
     */
    logDiscovery(event, details = {}) {
        this.info(`Discovery ${event}`, {
            category: 'discovery',
            ...details
        });
    }

    /**
     * Performance tracking
     */
    startPerformanceTimer(operation, context = {}) {
        const timerId = `${operation}_${Date.now()}_${Math.random()}`;
        this.performanceMetrics.set(timerId, {
            operation,
            context,
            startTime: performance.now(),
            startTimestamp: Date.now()
        });
        return timerId;
    }

    endPerformanceTimer(timerId, additionalData = {}) {
        const metric = this.performanceMetrics.get(timerId);
        if (!metric) return null;

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        const performanceData = {
            operation: metric.operation,
            duration: Math.round(duration * 100) / 100, // Round to 2 decimal places
            context: metric.context,
            ...additionalData
        };

        this.performanceMetrics.delete(timerId);

        if (this.enablePerformanceMetrics) {
            this.debug(`Performance: ${metric.operation}`, {
                category: 'performance',
                performance: performanceData
            });
        }

        this.emit('performance', performanceData);
        return performanceData;
    }

    /**
     * Measure function execution time
     */
    async measureAsync(operation, fn, context = {}) {
        const timerId = this.startPerformanceTimer(operation, context);
        try {
            const result = await fn();
            this.endPerformanceTimer(timerId, { success: true });
            return result;
        } catch (error) {
            this.endPerformanceTimer(timerId, { success: false, error: error.message });
            throw error;
        }
    }

    measure(operation, fn, context = {}) {
        const timerId = this.startPerformanceTimer(operation, context);
        try {
            const result = fn();
            this.endPerformanceTimer(timerId, { success: true });
            return result;
        } catch (error) {
            this.endPerformanceTimer(timerId, { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Get filtered logs
     */
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        if (filters.level) {
            const minLevel = this.logLevels[filters.level];
            filteredLogs = filteredLogs.filter(log => this.logLevels[log.level] >= minLevel);
        }

        if (filters.category) {
            filteredLogs = filteredLogs.filter(log => log.category === filters.category);
        }

        if (filters.deviceId) {
            filteredLogs = filteredLogs.filter(log => log.deviceId === filters.deviceId);
        }

        if (filters.since) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since);
        }

        if (filters.limit) {
            filteredLogs = filteredLogs.slice(-filters.limit);
        }

        return filteredLogs;
    }

    /**
     * Get log statistics
     */
    getStatistics() {
        const categories = {};
        const devices = {};
        const errors = [];

        for (const log of this.logs) {
            // Count by category
            categories[log.category] = (categories[log.category] || 0) + 1;

            // Count by device
            if (log.deviceId) {
                devices[log.deviceId] = (devices[log.deviceId] || 0) + 1;
            }

            // Collect errors
            if (log.level === 'error' || log.level === 'fatal') {
                errors.push(log);
            }
        }

        return {
            totalLogs: this.logs.length,
            logCounts: { ...this.logCount },
            categories,
            devices,
            recentErrors: errors.slice(-10),
            timeSpan: this.logs.length > 0 ? {
                start: this.logs[0].timestamp,
                end: this.logs[this.logs.length - 1].timestamp
            } : null
        };
    }

    /**
     * Export logs
     */
    exportLogs(format = 'json', filters = {}) {
        const logs = this.getLogs(filters);

        switch (format) {
            case 'json':
                return JSON.stringify(logs, null, 2);

            case 'csv':
                if (logs.length === 0) return '';
                const headers = ['timestamp', 'level', 'category', 'deviceId', 'message'];
                const csvLines = [headers.join(',')];

                for (const log of logs) {
                    const row = [
                        new Date(log.timestamp).toISOString(),
                        log.level,
                        log.category || '',
                        log.deviceId || '',
                        `"${log.message.replace(/"/g, '""')}"`
                    ];
                    csvLines.push(row.join(','));
                }

                return csvLines.join('\n');

            case 'text':
                return logs.map(log => this.formatters.console(log)).join('\n');

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
        this.logCount = { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 };
        this.emit('logs_cleared');
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (!(level in this.logLevels)) {
            throw new Error(`Invalid log level: ${level}`);
        }
        this.level = level;
        this.emit('level_changed', level);
    }

    /**
     * Create a child logger with context
     */
    child(context = {}) {
        const childLogger = Object.create(this);
        childLogger.defaultContext = { ...this.defaultContext, ...context };

        // Override log method to include default context
        childLogger.log = (level, message, data = {}) => {
            const mergedData = { ...childLogger.defaultContext, ...data };
            return this.log(level, message, mergedData);
        };

        return childLogger;
    }

    /**
     * Device-specific logger
     */
    forDevice(deviceId) {
        return this.child({ deviceId });
    }

    /**
     * Category-specific logger
     */
    forCategory(category) {
        return this.child({ category });
    }
}

// Global logger instance
export const logger = new Logger({
    level: process.env.DYNAMIXEL_LOG_LEVEL || 'info',
    enablePerformanceMetrics: process.env.DYNAMIXEL_PERFORMANCE_LOGGING === 'true'
});

// Export convenience methods
export const trace = logger.trace.bind(logger);
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);
