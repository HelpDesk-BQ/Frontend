import {
  validateLogin,
  validateTicket,
  validateComment,
  validateJustification,
  validateStatusChange,
} from '../../public/js/validators.js';

describe('validateLogin', () => {
  test('accepts valid credentials', () => {
    expect(validateLogin({ email: 'lia@exemplo.local', password: 'x' })).toEqual({});
  });

  test('flags bad email and empty password', () => {
    const errors = validateLogin({ email: 'nao-email', password: '' });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  test('flags missing values', () => {
    expect(validateLogin({})).toEqual({ email: expect.any(String), password: expect.any(String) });
    expect(validateTicket({})).toMatchObject({ title: expect.any(String), description: expect.any(String), priority: expect.any(String) });
  });
});

describe('validateTicket (espelho do Zod)', () => {
  const good = {
    title: 'Impressora do setor fiscal parou',
    description: 'A impressora parou de responder após a última atualização do sistema operacional.',
    priority: 'high',
  };

  test('accepts valid ticket', () => {
    expect(validateTicket(good)).toEqual({});
  });

  test.each([
    ['title curto', { ...good, title: 'curto' }, 'title'],
    ['title longo', { ...good, title: 'x'.repeat(101) }, 'title'],
    ['descrição curta', { ...good, description: 'curta' }, 'description'],
    ['prioridade inválida', { ...good, priority: 'urgent' }, 'priority'],
  ])('rejects %s', (_label, input, field) => {
    expect(validateTicket(input)[field]).toBeDefined();
  });

  test('trims antes de medir', () => {
    expect(validateTicket({ ...good, title: '   curto   ' }).title).toBeDefined();
  });
});

describe('validateComment / validateJustification', () => {
  test('comment exige 1–1000 após trim', () => {
    expect(validateComment({ body: 'ok' })).toEqual({});
    expect(validateComment({ body: '   ' }).body).toBeDefined();
    expect(validateComment({ body: 'x'.repeat(1001) }).body).toBeDefined();
  });

  test('justification exige 1–1000 após trim', () => {
    expect(validateJustification({ justification: 'Duplicado.' })).toEqual({});
    expect(validateJustification({ justification: '' }).justification).toBeDefined();
  });
});

describe('validateStatusChange', () => {
  test('accepts status válido com comentário opcional', () => {
    expect(validateStatusChange({ status: 'analysis' })).toEqual({});
    expect(validateStatusChange({ status: 'closed', comment: '' })).toEqual({});
    expect(validateStatusChange({ status: 'closed', comment: 'ok' })).toEqual({});
  });

  test('rejects status desconhecido e comentário longo', () => {
    expect(validateStatusChange({ status: 'banana' }).status).toBeDefined();
    expect(validateStatusChange({ status: 'analysis', comment: 'x'.repeat(1001) }).comment).toBeDefined();
  });
});
