export const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export function resolveApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__HELPDESK_API_BASE__) {
    return String(window.__HELPDESK_API_BASE__).replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env && process.env.HELPDESK_API_BASE_URL) {
    return String(process.env.HELPDESK_API_BASE_URL).replace(/\/$/, '');
  }
  return DEFAULT_API_BASE_URL;
}

export const STATUSES = ['open', 'analysis', 'in_progress', 'resolved', 'closed'];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export const STATUS_LABELS = {
  open: 'Aberto',
  analysis: 'Em análise',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
  closed: 'Encerrado'
};

export const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
};

// Espelho de ALLOWED_TRANSITIONS do backend (src/services/transition.js).
// O backend é a autoridade; isto serve só para guiar a UI.
export const ALLOWED_TRANSITIONS = {
  open: ['analysis'],
  analysis: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: []
};

export const SESSION_STORAGE_KEY = 'helpdesk.session';

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciais inválidas.',
  ACCOUNT_LOCKED: 'Acesso temporariamente indisponível. Tente novamente em alguns minutos.',
  VALIDATION_ERROR: 'Revise os campos destacados.',
  UNAUTHORIZED: 'Autenticação necessária. Entre novamente.',
  FORBIDDEN: 'Ação não autorizada para o seu perfil.',
  NOT_FOUND: 'Recurso não encontrado.',
  INVALID_STATE: 'Transição não permitida para o estado atual.',
  RESOLUTION_COMMENT_REQUIRED: 'Encerrar exige um comentário de resolução.',
  INVALID_JSON: 'Requisição inválida.',
  PAYLOAD_TOO_LARGE: 'Dados excedem o limite permitido.',
  INTERNAL_ERROR: 'Algo inesperado aconteceu. Tente novamente.',
  NETWORK_ERROR: 'Não foi possível alcançar o servidor. Verifique sua conexão.',
  TIMEOUT: 'O servidor demorou a responder. Tente novamente.'
};
