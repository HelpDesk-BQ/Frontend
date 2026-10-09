import { ERROR_MESSAGES } from '../config.js';

export class ApiError extends Error {
  constructor(status, code, message, correlationId = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

export function toUserMessage(code, fallback) {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return fallback || ERROR_MESSAGES.INTERNAL_ERROR;
}

export function buildApiError({ status = 0, code = 'INTERNAL_ERROR', message, correlationId = null }) {
  return new ApiError(status, code, message || toUserMessage(code), correlationId);
}
