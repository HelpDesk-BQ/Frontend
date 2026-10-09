import { describe, test, expect } from '@jest/globals';
import {
  validateTicketInput,
  validateCommentInput,
  validateJustificationInput,
  validateStatusInput
} from '../js/utils/validators.js';
import { statusLabel, priorityLabel, formatDateTime, formatDate, historyLabel, historyDetail, totalPages } from '../js/utils/format.js';
import { ALLOWED_TRANSITIONS } from '../js/config.js';

describe('ticket validators', () => {
  test('exige título ≥10 e descrição ≥30', () => {
    const res = validateTicketInput({ title: 'curto', description: 'pequena', priority: 'high' });
    expect(res.ok).toBe(false);
    expect(res.errors.title).toBeDefined();
    expect(res.errors.description).toBeDefined();
  });

  test('rejeita prioridade e limites superiores', () => {
    const res = validateTicketInput({ title: 'x'.repeat(101), description: 'y'.repeat(5001), priority: 'urgent' });
    expect(res.errors.title).toBeDefined();
    expect(res.errors.description).toBeDefined();
    expect(res.errors.priority).toBeDefined();
  });

  test('aceita entrada válida aparando texto', () => {
    const res = validateTicketInput({ title: '  Título válido aqui ', description: ` ${'d'.repeat(30)} `, priority: 'low' });
    expect(res.ok).toBe(true);
    expect(res.title).toBe('Título válido aqui');
  });

  test('comentário e justificativa: vazio falha, longo falha', () => {
    expect(validateCommentInput({ body: '  ' }).ok).toBe(false);
    expect(validateCommentInput({ body: 'x'.repeat(1001) }).ok).toBe(false);
    expect(validateCommentInput({ body: 'ok' }).body).toBe('ok');
    expect(validateJustificationInput({ justification: '' }).ok).toBe(false);
    expect(validateJustificationInput({ justification: 'motivo' }).ok).toBe(true);
  });

  test('fechar sem comentário falha; estado inválido falha', () => {
    expect(validateStatusInput({ status: 'closed', comment: ' ' }).ok).toBe(false);
    expect(validateStatusInput({ status: 'done', comment: '' }).ok).toBe(false);
    expect(validateStatusInput({ status: 'closed', comment: 'resolvido' }).ok).toBe(true);
    expect(validateStatusInput({ status: 'analysis', comment: '' }).ok).toBe(true);
  });
});

describe('format', () => {
  test('rótulos PT-BR com fallback', () => {
    expect(statusLabel('open')).toBe('Aberto');
    expect(statusLabel('in_progress')).toBe('Em atendimento');
    expect(priorityLabel('critical')).toBe('Crítica');
    expect(statusLabel('x')).toBe('x');
  });

  test('datas inválidas viram travessão', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('invalida')).toBe('—');
    expect(formatDate('2026-10-01T00:00:00Z')).not.toBe('—');
    expect(formatDateTime('2026-10-01T12:00:00Z')).not.toBe('—');
  });

  test('histórico descreve eventos', () => {
    expect(historyLabel('status.changed')).toBe('Estado alterado');
    expect(historyLabel('x')).toBe('x');
    expect(historyDetail({ event: 'comment.added', before: null, after: 'oi' })).toBe('oi');
    expect(historyDetail({ event: 'deleted', before: 'open', after: 'dup' })).toMatch(/dup/);
    expect(historyDetail({ event: 'status.changed', before: 'open', after: 'analysis' })).toBe('open → analysis');
  });

  test('totalPages arredonda para cima, mínimo 1', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
    expect(totalPages(20, 20)).toBe(1);
  });

  test('transições espelham o backend', () => {
    expect(ALLOWED_TRANSITIONS.open).toEqual(['analysis']);
    expect(ALLOWED_TRANSITIONS.resolved).toEqual(['closed', 'in_progress']);
    expect(ALLOWED_TRANSITIONS.closed).toEqual([]);
  });
});
