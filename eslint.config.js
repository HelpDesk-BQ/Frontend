import globals from 'globals';

export default [
  {
    files: ['public/js/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.jest } },
  },
  { ignores: ['node_modules/', 'coverage/'] },
];
