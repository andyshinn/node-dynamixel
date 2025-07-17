#!/usr/bin/env node

import { DynamixelController } from '../src/DynamixelController.js';

/**
 * Example demonstrating SerialPort buffer configuration
 * 
 * The highWaterMark option controls the internal buffer size of the SerialPort stream.
 * Lower values can reduce memory usage but may cause flow control issues.
 * Higher values provide better buffering but use more memory.
 */

async function demonstrateBufferOptions() {
  console.log('🔧 SerialPort Buffer Configuration Example');
  console.log('==========================================');

  // Example 1: Default buffer size (64KB)
  console.log('\n1. Default buffer size (64KB):');
  const controllerDefault = new DynamixelController({
    connectionType: 'serial',
    // highWaterMark: 65536 (default)
  });

  console.log('   Buffer size:', controllerDefault.connection.highWaterMark, 'bytes');

  // Example 2: Smaller buffer for memory-constrained environments
  console.log('\n2. Smaller buffer (16KB):');
  const controllerSmall = new DynamixelController({
    connectionType: 'serial',
    highWaterMark: 16384 // 16KB
  });

  console.log('   Buffer size:', controllerSmall.connection.highWaterMark, 'bytes');

  // Example 3: Larger buffer for high-throughput applications
  console.log('\n3. Larger buffer (256KB):');
  const controllerLarge = new DynamixelController({
    connectionType: 'serial',
    highWaterMark: 262144 // 256KB
  });

  console.log('   Buffer size:', controllerLarge.connection.highWaterMark, 'bytes');

  // Example 4: Direct SerialConnection usage
  console.log('\n4. Direct SerialConnection usage:');
  const { SerialConnection } = await import('../src/transport/SerialConnection.js');
  
  const directConnection = new SerialConnection({
    baudRate: 1000000,
    highWaterMark: 8192 // 8KB for minimal memory usage
  });

  console.log('   Buffer size:', directConnection.highWaterMark, 'bytes');

  console.log('\n📋 Buffer size recommendations:');
  console.log('   • Default (64KB): Good for most applications');
  console.log('   • Small (8-16KB): Memory-constrained embedded systems');
  console.log('   • Large (128-256KB): High-throughput bulk operations');
  console.log('   • Consider your read/write patterns and available memory');

  console.log('\n✅ Example completed - no connections were made');
}

// Run the example
demonstrateBufferOptions().catch(console.error);