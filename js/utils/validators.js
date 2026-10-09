import { PRIORITIES, STATUSES } from '../config.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length >= 1 && normalized.length <= 255 && EMAIL_PATTERN.test(normalized);
}

export function validateLoginInput({ email, password }) {
  const errors = {};
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(email)) {
    errors.email = 'Informe um e-mail válido.';
  }
  if (typeof password !== 'string' || password.length < 1) {
    errors.password = 'Informe sua senha.';
  } else if (password.length > 128) {
    errors.password = 'A senha excede o limite de 128 caracteres.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    normalizedEmail
  };
}

export function validateTicketInput({ title, description, priority }) {
  const errors = {};
  const t = String(title ?? '').trim();
  const d = String(description ?? '').trim();

  if (t.length < 10) {
    errors.title = 'O título precisa de ao menos 10 caracteres.';
  } else if (t.length > 100) {
    errors.title = 'O título excede o limite de 100 caracteres.';
  }
  if (d.length < 30) {
    errors.description = 'A descrição precisa de ao menos 30 caracteres.';
  } else if (d.length > 5000) {
    errors.description = 'A descrição excede o limite de 5000 caracteres.';
  }
  if (!PRIORITIES.includes(priority)) {
    errors.priority = 'Escolha uma prioridade válida.';
  }

  return { ok: Object.keys(errors).length === 0, errors, title: t, description: d };
}

export function validateCommentInput({ body }) {
  const text = String(body ?? '').trim();
  if (text.length < 1) return { ok: false, errors: { body: 'Escreva o comentário.' }, body: text };
  if (text.length > 1000) {
    return { ok: false, errors: { body: 'O comentário excede o limite de 1000 caracteres.' }, body: text };
  }
  return { ok: true, errors: {}, body: text };
}

export function validateJustificationInput({ justification }) {
  const text = String(justification ?? '').trim();
  if (text.length < 1) {
    return { ok: false, errors: { justification: 'Informe a justificativa.' }, justification: text };
  }
  if (text.length > 1000) {
    return {
      ok: false,
      errors: { justification: 'A justificativa excede o limite de 1000 caracteres.' },
      justification: text
    };
  }
  return { ok: true, errors: {}, justification: text };
}

export function validateStatusInput({ status, comment }) {
  const errors = {};
  if (!STATUSES.includes(status)) {
    errors.status = 'Escolha um estado válido.';
  }
  const text = String(comment ?? '').trim();
  if (status === 'closed' && text.length < 1) {
    errors.comment = 'Encerrar exige um comentário de resolução.';
  } else if (text.length > 1000) {
    errors.comment = 'O comentário excede o limite de 1000 caracteres.';
  }
  return { ok: Object.keys(errors).length === 0, errors, comment: text };
}
