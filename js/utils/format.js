import { PRIORITY_LABELS, STATUS_LABELS } from '../config.js';

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] || priority;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

const HISTORY_LABELS = {
  'status.changed': 'Estado alterado',
  'priority.changed': 'Prioridade alterada',
  'assignee.changed': 'Responsável alterado',
  'comment.added': 'Comentário adicionado',
  deleted: 'Chamado excluído'
};

export function historyLabel(event) {
  return HISTORY_LABELS[event] || event;
}

export function historyDetail(entry) {
  const before = entry.before ?? '—';
  const after = entry.after ?? '—';
  if (entry.event === 'comment.added') return after;
  if (entry.event === 'deleted') return `Motivo: ${after}`;
  return `${before} → ${after}`;
}

export function totalPages(total, limit) {
  const per = Number(limit) > 0 ? Number(limit) : 20;
  return Math.max(1, Math.ceil(Number(total || 0) / per));
}
