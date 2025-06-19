/**
 * Transport Layer Index (CommonJS)
 * Exports all connection/transport classes with CommonJS versions
 */

const { U2D2Connection } = require('./U2D2Connection.cjs.js');
const { SerialConnection } = require('./SerialConnection.cjs.js');
const { WebSerialConnection } = require('./WebSerialConnection.js');

module.exports = {
  U2D2Connection,
  SerialConnection,
  WebSerialConnection
};
