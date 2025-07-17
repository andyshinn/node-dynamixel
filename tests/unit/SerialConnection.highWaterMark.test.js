import { describe, test, expect } from '@jest/globals';
import { SerialConnection } from '../../src/transport/SerialConnection.js';

describe('SerialConnection highWaterMark', () => {
  test('should use default highWaterMark value', () => {
    const connection = new SerialConnection();
    expect(connection.highWaterMark).toBe(65536); // Default 64KB
  });

  test('should accept custom highWaterMark value', () => {
    const connection = new SerialConnection({ highWaterMark: 8192 });
    expect(connection.highWaterMark).toBe(8192);
  });

  test('should include highWaterMark in connection status', () => {
    const connection = new SerialConnection({ highWaterMark: 16384 });
    const status = connection.getConnectionStatus();
    
    expect(status.highWaterMark).toBe(16384);
    expect(status.type).toBe('serial');
    expect(status.connected).toBe(false);
    expect(status.baudRate).toBe(57600);
  });

  test('should handle zero highWaterMark', () => {
    const connection = new SerialConnection({ highWaterMark: 0 });
    expect(connection.highWaterMark).toBe(0);
  });

  test('should handle large highWaterMark values', () => {
    const connection = new SerialConnection({ highWaterMark: 1048576 }); // 1MB
    expect(connection.highWaterMark).toBe(1048576);
  });
});