import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022
      }
    },
    rules: {
      // Allow console.log for debugging and diagnostics
      'no-console': 'off',

      // Warn about unused variables but allow unused function parameters
      'no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],

      // Allow empty catch blocks for optional dependencies
      'no-empty': ['error', { 'allowEmptyCatch': true }],

      // Prefer const/let over var
      'no-var': 'error',
      'prefer-const': 'warn',

      // Semicolon rules
      'semi': ['error', 'always'],

      // Indentation (2 spaces)
      'indent': ['error', 2, { 'SwitchCase': 1 }],

      // Quote style
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],

      // Trailing comma
      'comma-dangle': ['error', 'never'],

      // Space before function parentheses
      'space-before-function-paren': ['error', 'never'],

      // Object curly spacing
      'object-curly-spacing': ['error', 'always'],

      // Array bracket spacing
      'array-bracket-spacing': ['error', 'never'],

      // No multiple empty lines
      'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],

      // Require space before blocks
      'space-before-blocks': 'error',

      // Require space around keywords
      'keyword-spacing': 'error'
    }
  },
  {
    // Test files configuration
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      // Allow longer test descriptions
      'max-len': 'off',

      // Allow more flexible naming in tests
      'camelcase': 'off',

      // Allow console in tests for debugging
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      '*.min.js'
    ]
  }
];
