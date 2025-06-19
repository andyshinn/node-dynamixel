import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const external = ['serialport', '@serialport/bindings-cpp', 'usb', 'events', 'util'];

export default [
  // ES Module build - uses .esm.js files
  {
    input: 'index.esm.js',
    external,
    output: {
      file: 'dist/esm/index.js',
      format: 'es',
      exports: 'named'
    },
    plugins: [
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs()
    ]
  },
  // CommonJS build - uses .cjs.js files directly
  {
    input: 'index.cjs.js',
    external,
    output: {
      file: 'dist/cjs/index.js',
      format: 'cjs',
      exports: 'auto',
      esModule: false
    },
    plugins: [
      {
        name: 'create-cjs-package-json',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'package.json',
            source: '{\n  "type": "commonjs"\n}\n'
          });
        }
      },
      resolve({
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs()
    ]
  }
];
