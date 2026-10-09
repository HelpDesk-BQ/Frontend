import { describe, test, expect } from '@jest/globals';
import { normalizeEmail, isValidEmail, validateLoginInput } from '../js/utils/validators.js';

describe('validators', () => {
  test('normalizes email with trim + lowercase', () => {
    expect(normalizeEmail('  Lia@Exemplo.Local ')).toBe('lia@exemplo.local');
  });

  test('accepts valid email, rejects invalid', () => {
    expect(isValidEmail('lia@exemplo.local')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('validateLoginInput returns field errors', () => {
    const bad = validateLoginInput({ email: 'not-an-email', password: '' });
    expect(bad.ok).toBe(false);
    expect(bad.errors.email).toBeDefined();
    expect(bad.errors.password).toBeDefined();
  });

  test('validateLoginInput ok with normalized email', () => {
    const good = validateLoginInput({ email: '  LIA@exemplo.local ', password: 'x' });
    expect(good.ok).toBe(true);
    expect(good.normalizedEmail).toBe('lia@exemplo.local');
  });

  test('rejects password over 128 chars (backend limit)', () => {
    const res = validateLoginInput({ email: 'a@b.co', password: 'x'.repeat(129) });
    expect(res.ok).toBe(false);
  });
});
