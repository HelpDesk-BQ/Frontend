// Espelho cliente das regras do backend (Zod Passo 30 + RF04/RF05/RF10).
// O servidor continua sendo a autoridade; aqui é feedback imediato junto ao campo.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['open', 'analysis', 'in_progress', 'resolved', 'closed'];

function length(value, min, max) {
  const text = String(value ?? '').trim();
  if (text.length < min) return `mínimo de ${min} caracteres`;
  if (max !== undefined && text.length > max) return `máximo de ${max} caracteres`;
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL_RE.test(String(email ?? '').trim())) errors.email = 'Informe um e-mail válido.';
  if (!String(password ?? '')) errors.password = 'Informe a senha.';
  return errors;
}

export function validateTicket({ title, description, priority }) {
  const errors = {};
  const titleError = length(title, 10, 100);
  if (titleError) errors.title = `Título com ${titleError}.`;
  const descError = length(description, 30, 5000);
  if (descError) errors.description = `Descrição com ${descError}.`;
  if (!PRIORITIES.includes(priority)) errors.priority = 'Escolha uma prioridade válida.';
  return errors;
}

export function validateComment({ body }) {
  const errors = {};
  const error = length(body, 1, 1000);
  if (error) errors.body = `Comentário com ${error}.`;
  return errors;
}

export function validateJustification({ justification }) {
  const errors = {};
  const error = length(justification, 1, 1000);
  if (error) errors.justification = `Justificativa com ${error}.`;
  return errors;
}

export function validateStatusChange({ status, comment }) {
  const errors = {};
  if (!STATUSES.includes(status)) errors.status = 'Escolha um estado válido.';
  if (comment !== undefined && comment !== null && String(comment).trim() !== '') {
    const error = length(comment, 1, 1000);
    if (error) errors.comment = `Comentário com ${error}.`;
  }
  return errors;
}
