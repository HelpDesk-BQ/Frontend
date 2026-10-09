import { apiGet } from './client.js';
import { authRequest } from './auth.js';

// GET /api/reports/summary?status=&priority= → { total, byStatus, byPriority }
export async function getSummary({ status, priority } = {}, options = {}) {
  const { store, onUnauthorized, fetchImpl, baseUrl } = options;
  return authRequest(
    (token) =>
      apiGet('/api/reports/summary', {
        params: { status, priority },
        token,
        fetchImpl,
        baseUrl
      }).then((res) => res.data?.data ?? { total: 0, byStatus: {}, byPriority: {} }),
    { store, onUnauthorized }
  );
}
