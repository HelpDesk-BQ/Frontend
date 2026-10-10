// Espelho cliente do mapa do backend (Passo 29/A8). O servidor continua
// sendo a autoridade; aqui o select só oferece transições válidas.

export const ALLOWED_TRANSITIONS = {
  open: ['analysis'],
  analysis: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

export function nextStates(from) {
  return [...(ALLOWED_TRANSITIONS[from] || [])];
}
