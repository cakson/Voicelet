import type { FastifyReply } from 'fastify';

type ErrorCode =
  'validation_error' | 'duplicate_guild' | 'not_found' | 'conflict' | 'service_unavailable';

const messages: Record<ErrorCode, string> = {
  validation_error: 'Check the highlighted values and try again.',
  duplicate_guild: 'This guild is already registered.',
  not_found: 'The requested guild or configuration no longer exists.',
  conflict: 'The saved configuration changed. Refresh and try again.',
  service_unavailable: 'Voicelet could not save this change. Try again shortly.',
};

export function adminError(
  reply: FastifyReply,
  statusCode: number,
  code: ErrorCode,
  fields?: Record<string, string>,
) {
  return reply
    .code(statusCode)
    .send({ error: { code, message: messages[code], ...(fields ? { fields } : {}) } });
}
