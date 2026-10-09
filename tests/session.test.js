import { describe, test, expect } from '@jest/globals';
import { generateCorrelationId, isValidCorrelationId } from '../js/utils/correlation.js';
import { createSessionStore } from '../js/utils/storage.js';

describe('correlation', () => {
  test('generates uuid v4 and validates', () => {
    const id = generateCorrelationId();
    expect(isValidCorrelationId(id)).toBe(true);
    expect(isValidCorrelationId('not-valid')).toBe(false);
  });
});

describe('session store', () => {
  function mem() {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k)
    };
  }

  test('write/read roundtrip, clear empties', () => {
    const s = createSessionStore(mem());
    expect(s.read()).toBeNull();
    s.write({ token: 't', user: { id: '1', email: 'a@b.co' } });
    expect(s.read().token).toBe('t');
    s.clear();
    expect(s.read()).toBeNull();
  });
});
