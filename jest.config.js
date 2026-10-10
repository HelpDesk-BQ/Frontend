export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  // pages/* são fiação fina verificada pelo roteiro manual (tests/e2e/roteiro.md).
  collectCoverageFrom: ['public/js/api.js', 'public/js/auth.js', 'public/js/ui.js', 'public/js/validators.js'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
