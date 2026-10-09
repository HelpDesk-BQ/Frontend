const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidCorrelationId(value) {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

export function generateCorrelationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback determinístico apenas para ambientes sem crypto (ex.: testes antigos).
  const hex = '0123456789abcdef';
  const pick = () => hex[Math.floor(Math.random() * 16)];
  let out = '';
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += '89ab'[Math.floor(Math.random() * 4)];
    } else {
      out += pick();
    }
  }
  return out;
}
