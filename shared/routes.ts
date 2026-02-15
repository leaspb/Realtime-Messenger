import { z } from 'zod';

export const api = {
  // No REST API needed for this app as it's primarily WebSocket based
  // But we'll keep the structure for health check or future expansion
  health: {
    check: {
      method: 'GET' as const,
      path: '/api/health' as const,
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
  },
};

// Required buildUrl helper
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
