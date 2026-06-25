/**
 * API 封装 — 前端统一请求层
 * 使用 NEXT_PUBLIC_HELLE_API_KEY 环境变量
 */

const HELLE_API_KEY = process.env.NEXT_PUBLIC_HELLE_API_KEY || '';

async function request(path, { method = 'GET', body } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${HELLE_API_KEY}`,
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

// ── 房间 ──────────────────────────────────────────────────────
export const api = {
  // 房间
  getRooms: () => request('/api/rooms'),
  getRoom: (key) => request(`/api/rooms/${key}`),
  updateRoom: (key, description) =>
    request(`/api/rooms/${key}`, { method: 'PUT', body: { description } }),
  getRoomHistory: (key) => request(`/api/rooms/${key}/history`),

  // 留言
  getMessages: (page = 1, limit = 30) =>
    request(`/api/messages?page=${page}&limit=${limit}`),
  postMessage: (content) =>
    request('/api/messages', { method: 'POST', body: { content } }),
  deleteMessage: (id) =>
    request(`/api/messages/${id}`, { method: 'DELETE' }),

  // 记忆
  getMemories: (params = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return request(`/api/memories?${sp}`);
  },
  getMemory: (id) => request(`/api/memories/${id}`),
  addMemory: (body) =>
    request('/api/memories', { method: 'POST', body }),
  editMemory: (id, body) =>
    request(`/api/memories/${id}`, { method: 'PUT', body }),
  deleteMemory: (id) =>
    request(`/api/memories/${id}`, { method: 'DELETE' }),

  // 活动流
  getActivity: (limit = 10) =>
    request(`/api/activity?limit=${limit}`),

  // 导出
  exportData: () => request('/api/export'),
};
