const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getToken() {
  return localStorage.getItem('lawbridge_token');
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth && getToken()) headers['Authorization'] = 'Bearer ' + getToken();
  return headers;
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(options.auth !== false), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  auth: {
    register: (body) => api.post('/auth/register', body),
    login: (body) => api.post('/auth/login', body),
    me: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    updateWallet: (body) => api.post('/auth/update-wallet', body),
  },
  lawyers: {
    list: (params) => api.get('/lawyers' + (params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '')),
    get: (id) => api.get('/lawyers/' + id),
    me: () => api.get('/lawyers/me'),
    updateMe: (body) => api.patch('/lawyers/me', body),
  },
  cases: {
    list: () => api.get('/cases'),
    create: (body) => api.post('/cases', body),
    decide: (id, approve, note) => api.post('/cases/' + id + '/decision', { approve, note }),
    addPayment: (id, amount, note) => api.post('/cases/' + id + '/payments', { amount, note }),
    decideInstallment: (caseId, requestId, approve) => api.post('/cases/' + caseId + '/payments/' + requestId + '/decision', { approve }),
    requestClose: (id, note) => api.post('/cases/' + id + '/close-request', { note }),
    decideClose: (id, approve) => api.post('/cases/' + id + '/close-request/decision', { approve }),
    update: (id, body) => api.patch('/cases/' + id, body),
  },
  consultations: {
    list: () => api.get('/consultations'),
    book: (body) => api.post('/consultations', body),
    respond: (id, accept, note) => api.post('/consultations/' + id + '/respond', { accept, note }),
    update: (id, body) => api.patch('/consultations/' + id, body),
    cancel: (id) => api.del('/consultations/' + id),
  },
  clients: {
    list: () => api.get('/clients'),
    create: (body) => api.post('/clients', body),
    get: (id) => api.get('/clients/' + id),
    update: (id, body) => api.patch('/clients/' + id, body),
    delete: (id) => api.del('/clients/' + id),
  },
  notes: {
    list: (caseId) => api.get('/notes' + (caseId ? '?caseId=' + encodeURIComponent(caseId) : '')),
    create: (body) => api.post('/notes', body),
    update: (id, body) => api.patch('/notes/' + id, body),
    delete: (id) => api.del('/notes/' + id),
  },
  calendar: {
    list: () => api.get('/calendar'),
    create: (body) => api.post('/calendar', body),
    update: (id, body) => api.patch('/calendar/' + id, body),
    delete: (id) => api.del('/calendar/' + id),
  },
  documents: {
    list: (caseId) => api.get('/documents' + (caseId ? '?caseId=' + encodeURIComponent(caseId) : '')),
    upload: async ({ file, caseId, category }) => {
      const params = new URLSearchParams();
      if (caseId) params.set('caseId', caseId);
      if (category) params.set('category', category);
      const url = BASE + '/documents/upload' + (params.toString() ? '?' + params.toString() : '');
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + getToken() },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || 'Upload failed');
      return data;
    },
    downloadUrl: (id) => BASE + '/documents/' + id + '/download',
    delete: (id) => api.del('/documents/' + id),
  },
  messages: {
    conversations: () => api.get('/messages/conversations'),
    createConversation: (clientId) => api.post('/messages/conversations', { clientId }),
    conversationForCase: (caseId) => api.get('/messages/conversation-for-case/' + caseId),
    thread: (conversationId) => api.get('/messages/threads/' + conversationId),
    send: (conversationId, body) => api.post('/messages/threads/' + conversationId, { body }),
    markRead: (conversationId) => api.post('/messages/threads/' + conversationId + '/mark-read', {}),
    clientConversations: () => api.get('/messages/client/conversations'),
    clientConversationForLawyer: (lawyerId) => api.get('/messages/client/conversation-for-lawyer/' + lawyerId),
    clientConversationForCase: (caseId) => api.get('/messages/client/conversation-for-case/' + caseId),
    clientThread: (conversationId) => api.get('/messages/client/threads/' + conversationId),
    clientSend: (conversationId, body) => api.post('/messages/client/threads/' + conversationId, { body }),
  },
  billing: {
    invoices: (status) => api.get('/billing/invoices' + (status ? '?status=' + encodeURIComponent(status) : '')),
    createInvoice: (body) => api.post('/billing/invoices', body),
    updateInvoice: (id, body) => api.patch('/billing/invoices/' + id, body),
    deleteInvoice: (id) => api.del('/billing/invoices/' + id),
  },
  payments: {
    initiate: (caseId, amount) => api.post('/payments/initiate', { caseId, amount }),
    complete: (caseId, transactionId, paymentProof) => api.post('/payments/complete', { caseId, transactionId, paymentProof }),
    transactions: (caseId) => api.get('/payments/transactions' + (caseId ? '?case_id=' + caseId : '')),
    adminDashboard: () => api.get('/payments/admin/dashboard'),
    escrowBalance: () => api.get('/payments/escrow/balance'),
    adminTransfer: (caseId, lawyerId, amount, reason) => api.post('/payments/admin/transfer', { caseId, lawyerId, amount, reason }),
  },
  notifications: {
    list: () => api.get('/notifications'),
    markAllRead: () => api.post('/notifications/mark-read', {}),
    markOneRead: (id) => api.post('/notifications/' + id + '/read', {}),
  },
  support: {
    thread: () => api.get('/support/thread'),
    send: (body) => api.post('/support/thread', { body }),
    adminThreads: () => api.get('/support/admin/threads'),
    adminThreadForUser: (userId) => api.get('/support/admin/thread/' + userId),
    adminReplyToUser: (userId, body) => api.post('/support/admin/thread/' + userId, { body }),
  },
  admin: {
    users: (role) => api.get('/admin/users' + (role ? '?role=' + role : '')),
    deleteUser: (userId) => api.del('/admin/users/' + userId),
    stats: () => api.get('/admin/stats'),
    pendingLawyers: () => api.get('/admin/lawyers/pending'),
    verifyLawyer: (lawyerId, verified) => api.post('/admin/lawyers/' + lawyerId + '/verify?verified=' + verified),
    deleteLawyer: (lawyerId) => api.del('/admin/lawyers/' + lawyerId),
    cases: () => api.get('/admin/cases'),
  },
  legalHub: {
    sections: () => api.get('/legalhub/sections'),
    articles: (params) => api.get('/legalhub/articles' + (params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '')),
    caseFiles: (params) => api.get('/legalhub/case-files' + (params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '')),
    caseFileDetails: (docId) => api.get('/legalhub/case-files/' + docId),
  },
};

export { api, getToken, BASE };
