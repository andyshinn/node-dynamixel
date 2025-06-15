import { jest } from '@jest/globals';
import { Logger } from '../../src/utils/Logger.js';

describe('Logger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
        logger = new Logger({
            level: 'debug',
            enableConsole: true,
            enablePerformanceMetrics: true,
            maxLogEntries: 100
        });

        // Spy on console methods
        consoleSpy = {
            debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
            info: jest.spyOn(console, 'info').mockImplementation(() => {}),
            warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
            error: jest.spyOn(console, 'error').mockImplementation(() => {}),
            log: jest.spyOn(console, 'log').mockImplementation(() => {})
        };
    });

    afterEach(() => {
        // Restore console methods
        Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    describe('Constructor', () => {
        test('should initialize with default options', () => {
            const defaultLogger = new Logger();
            expect(defaultLogger.level).toBe('info');
            expect(defaultLogger.enableConsole).toBe(true);
            expect(defaultLogger.maxLogEntries).toBe(1000);
        });

        test('should initialize with custom options', () => {
            const customLogger = new Logger({
                level: 'warn',
                enableConsole: false,
                maxLogEntries: 50
            });
            expect(customLogger.level).toBe('warn');
            expect(customLogger.enableConsole).toBe(false);
            expect(customLogger.maxLogEntries).toBe(50);
        });
    });

    describe('Log Level Management', () => {
        test('should respect log levels', () => {
            logger.setLevel('warn');

            logger.debug('debug message');
            logger.info('info message');
            logger.warn('warn message');
            logger.error('error message');

            expect(logger.logs).toHaveLength(2); // Only warn and error
            expect(logger.logs[0].level).toBe('warn');
            expect(logger.logs[1].level).toBe('error');
        });

        test('should validate log level', () => {
            expect(() => logger.setLevel('invalid')).toThrow('Invalid log level: invalid');
        });

        test('should emit level_changed event', () => {
            const levelChangedSpy = jest.fn();
            logger.on('level_changed', levelChangedSpy);

            logger.setLevel('error');

            expect(levelChangedSpy).toHaveBeenCalledWith('error');
        });
    });

    describe('Basic Logging', () => {
        test('should log messages with correct structure', () => {
            logger.info('test message', { deviceId: 1, category: 'test' });

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];

            expect(logEntry.level).toBe('info');
            expect(logEntry.message).toBe('test message');
            expect(logEntry.deviceId).toBe(1);
            expect(logEntry.category).toBe('test');
            expect(typeof logEntry.timestamp).toBe('number');
        });

        test('should increment log counts', () => {
            logger.debug('debug');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');

            expect(logger.logCount.debug).toBe(1);
            expect(logger.logCount.info).toBe(1);
            expect(logger.logCount.warn).toBe(1);
            expect(logger.logCount.error).toBe(1);
        });

        test('should maintain log size limit', () => {
            const smallLogger = new Logger({ maxLogEntries: 3 });

            smallLogger.info('message 1');
            smallLogger.info('message 2');
            smallLogger.info('message 3');
            smallLogger.info('message 4');

            expect(smallLogger.logs).toHaveLength(3);
            expect(smallLogger.logs[0].message).toBe('message 2');
            expect(smallLogger.logs[2].message).toBe('message 4');
        });
    });

    describe('Console Output', () => {
        test('should output to console when enabled', () => {
            logger.info('test message');
            expect(consoleSpy.info).toHaveBeenCalled();
        });

        test('should not output to console when disabled', () => {
            const silentLogger = new Logger({ enableConsole: false });
            silentLogger.info('test message');
            expect(consoleSpy.info).not.toHaveBeenCalled();
        });

        test('should use correct console method for each level', () => {
            logger.debug('debug');
            logger.info('info');
            logger.warn('warn');
            logger.error('error');

            expect(consoleSpy.debug).toHaveBeenCalled();
            expect(consoleSpy.info).toHaveBeenCalled();
            expect(consoleSpy.warn).toHaveBeenCalled();
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    describe('Event Emission', () => {
        test('should emit log events', () => {
            const logSpy = jest.fn();
            const infoSpy = jest.fn();
            const categorySpy = jest.fn();

            logger.on('log', logSpy);
            logger.on('log:info', infoSpy);
            logger.on('log:test', categorySpy);

            logger.info('test message', { category: 'test' });

            expect(logSpy).toHaveBeenCalled();
            expect(infoSpy).toHaveBeenCalled();
            expect(categorySpy).toHaveBeenCalled();
        });
    });

    describe('Protocol Logging', () => {
        test('should log packet sent', () => {
            logger.logPacketSent(1, 'PING', [0x01, 0x02], { duration: 2.5 });

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];

            expect(logEntry.level).toBe('debug');
            expect(logEntry.category).toBe('protocol');
            expect(logEntry.deviceId).toBe(1);
            expect(logEntry.data.packet.instruction).toBe('PING');
            expect(logEntry.data.timing.duration).toBe(2.5);
        });

        test('should log packet received', () => {
            const packet = { instruction: 'STATUS', parameters: [0x00] };
            logger.logPacketReceived(2, packet, { duration: 1.8 });

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];

            expect(logEntry.level).toBe('debug');
            expect(logEntry.category).toBe('protocol');
            expect(logEntry.deviceId).toBe(2);
            expect(logEntry.data.packet.instruction).toBe('STATUS');
        });
    });

    describe('Performance Tracking', () => {
        test('should track performance metrics', () => {
            const timerId = logger.startPerformanceTimer('test_operation', { context: 'test' });
            expect(timerId).toMatch(/test_operation_\d+_/);

            const result = logger.endPerformanceTimer(timerId, { success: true });

            expect(result).toMatchObject({
                operation: 'test_operation',
                duration: expect.any(Number),
                context: { context: 'test' },
                success: true
            });
        });

        test('should handle invalid timer ID', () => {
            const result = logger.endPerformanceTimer('invalid_id');
            expect(result).toBeNull();
        });

        test('should measure synchronous functions', () => {
            const testFn = jest.fn(() => 'result');
            const result = logger.measure('sync_test', testFn, { test: true });

            expect(result).toBe('result');
            expect(testFn).toHaveBeenCalled();
            expect(logger.logs).toHaveLength(1);
            expect(logger.logs[0].category).toBe('performance');
        });

        test('should measure asynchronous functions', async () => {
            const testFn = jest.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 'async_result';
            });

            const result = await logger.measureAsync('async_test', testFn, { test: true });

            expect(result).toBe('async_result');
            expect(testFn).toHaveBeenCalled();
            expect(logger.logs).toHaveLength(1);
            expect(logger.logs[0].category).toBe('performance');
        });

        test('should handle function errors in measurement', async () => {
            const errorFn = jest.fn(() => {
                throw new Error('test error');
            });

            await expect(logger.measureAsync('error_test', errorFn)).rejects.toThrow('test error');
            expect(logger.logs).toHaveLength(1);
            expect(logger.logs[0].performance.success).toBe(false);
        });

        test('should emit performance events', () => {
            const performanceSpy = jest.fn();
            logger.on('performance', performanceSpy);

            const timerId = logger.startPerformanceTimer('perf_test');
            logger.endPerformanceTimer(timerId);

            expect(performanceSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    operation: 'perf_test',
                    duration: expect.any(Number)
                })
            );
        });
    });

    describe('Log Filtering and Retrieval', () => {
        beforeEach(() => {
            logger.info('info message 1', { deviceId: 1, category: 'test' });
            logger.warn('warn message', { deviceId: 2, category: 'warning' });
            logger.error('error message', { deviceId: 1, category: 'error' });
            logger.info('info message 2', { deviceId: 3, category: 'test' });
        });

        test('should filter logs by level', () => {
            const errorLogs = logger.getLogs({ level: 'error' });
            expect(errorLogs).toHaveLength(1);
            expect(errorLogs[0].level).toBe('error');
        });

        test('should filter logs by category', () => {
            const testLogs = logger.getLogs({ category: 'test' });
            expect(testLogs).toHaveLength(2);
            testLogs.forEach(log => expect(log.category).toBe('test'));
        });

        test('should filter logs by device ID', () => {
            const device1Logs = logger.getLogs({ deviceId: 1 });
            expect(device1Logs).toHaveLength(2);
            device1Logs.forEach(log => expect(log.deviceId).toBe(1));
        });

        test('should filter logs by timestamp', () => {
            const now = Date.now();
            const recentLogs = logger.getLogs({ since: now - 1000 });
            expect(recentLogs.length).toBeGreaterThan(0);
        });

        test('should limit log results', () => {
            const limitedLogs = logger.getLogs({ limit: 2 });
            expect(limitedLogs).toHaveLength(2);
        });
    });

    describe('Log Statistics', () => {
        beforeEach(() => {
            logger.info('info 1', { deviceId: 1, category: 'test' });
            logger.warn('warn 1', { deviceId: 2, category: 'warning' });
            logger.error('error 1', { deviceId: 1, category: 'error' });
            logger.info('info 2', { deviceId: 3, category: 'test' });
        });

        test('should provide comprehensive statistics', () => {
            const stats = logger.getStatistics();

            expect(stats.totalLogs).toBe(4);
            expect(stats.logCounts.info).toBe(2);
            expect(stats.logCounts.warn).toBe(1);
            expect(stats.logCounts.error).toBe(1);
            expect(stats.categories.test).toBe(2);
            expect(stats.devices['1']).toBe(2);
            expect(stats.recentErrors).toHaveLength(1);
            expect(stats.timeSpan).toMatchObject({
                start: expect.any(Number),
                end: expect.any(Number)
            });
        });
    });

    describe('Log Export', () => {
        beforeEach(() => {
            logger.info('test message 1', { category: 'test' });
            logger.warn('test message 2', { category: 'test' });
        });

        test('should export logs as JSON', () => {
            const jsonExport = logger.exportLogs('json');
            const parsed = JSON.parse(jsonExport);

            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed).toHaveLength(2);
            expect(parsed[0].message).toBe('test message 1');
        });

        test('should export logs as CSV', () => {
            const csvExport = logger.exportLogs('csv');
            const lines = csvExport.split('\n');

            expect(lines[0]).toBe('timestamp,level,category,deviceId,message');
            expect(lines).toHaveLength(3); // Header + 2 data rows
        });

        test('should export logs as text', () => {
            const textExport = logger.exportLogs('text');
            const lines = textExport.split('\n');

            expect(lines).toHaveLength(2);
            expect(lines[0]).toContain('INFO');
            expect(lines[1]).toContain('WARN');
        });

        test('should throw error for unsupported format', () => {
            expect(() => logger.exportLogs('xml')).toThrow('Unsupported export format: xml');
        });
    });

    describe('Child Loggers', () => {
        test('should create child logger with context', () => {
            const childLogger = logger.child({ deviceId: 5, category: 'child' });
            childLogger.info('child message');

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];
            expect(logEntry.deviceId).toBe(5);
            expect(logEntry.category).toBe('child');
        });

        test('should create device-specific logger', () => {
            const deviceLogger = logger.forDevice(10);
            deviceLogger.warn('device warning');

            expect(logger.logs).toHaveLength(1);
            expect(logger.logs[0].deviceId).toBe(10);
        });

        test('should create category-specific logger', () => {
            const categoryLogger = logger.forCategory('protocol');
            categoryLogger.debug('protocol debug');

            expect(logger.logs).toHaveLength(1);
            expect(logger.logs[0].category).toBe('protocol');
        });
    });

    describe('Log Management', () => {
        test('should clear logs', () => {
            logger.info('message 1');
            logger.info('message 2');

            expect(logger.logs).toHaveLength(2);

            const clearSpy = jest.fn();
            logger.on('logs_cleared', clearSpy);

            logger.clearLogs();

            expect(logger.logs).toHaveLength(0);
            expect(logger.logCount.info).toBe(0);
            expect(clearSpy).toHaveBeenCalled();
        });
    });

    describe('Connection and Discovery Logging', () => {
        test('should log connection events', () => {
            logger.logConnection('connected', 'usb', { port: '/dev/ttyUSB0' });

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];
            expect(logEntry.level).toBe('info');
            expect(logEntry.category).toBe('connection');
            expect(logEntry.data.connectionType).toBe('usb');
            expect(logEntry.data.port).toBe('/dev/ttyUSB0');
        });

        test('should log discovery events', () => {
            logger.logDiscovery('started', { range: [1, 10] });

            expect(logger.logs).toHaveLength(1);
            const logEntry = logger.logs[0];
            expect(logEntry.level).toBe('info');
            expect(logEntry.category).toBe('discovery');
            expect(logEntry.data.range).toEqual([1, 10]);
        });
    });
});
