import client from './client';

export { client };

// Auth APIs
export const authApi = {
  login: (credentials) => client.post('/auth/login', credentials),
  register: (userData) => client.post('/auth/register', userData),
  me: () => client.get('/auth/me'),
};

// Project APIs
export const projectApi = {
  list: (params) => client.get('/projects', { params }),
  getById: (id) => client.get(`/projects/${id}`),
  create: (data) => client.post('/projects', data),
  update: (id, data) => client.put(`/projects/${id}`, data),
  assignEngineer: (projectId, data) => client.post(`/projects/${projectId}/assign-engineer`, data),
  removeEngineer: (projectId, engineerId) => client.delete(`/projects/${projectId}/assign-engineer/${engineerId}`),
  getEngineers: (projectId) => client.get(`/projects/${projectId}/engineers`),
  getAvailableEngineers: () => client.get('/projects/available-engineers'),
};

// Task APIs
export const taskApi = {
  listByProject: (projectId, params) => client.get(`/tasks/project/${projectId}`, { params }),
  create: (data) => client.post('/tasks', data),
  updateStatus: (taskId, data) => client.patch(`/tasks/${taskId}/status`, data),
};

// Workforce & Attendance APIs
export const workforceApi = {
  listWorkers: (params) => client.get('/workforce', { params }),
  registerWorker: (data) => client.post('/workforce', data),
  recordAttendance: (data) => client.post('/workforce/attendance', data),
  getAttendance: (projectId, params) => client.get(`/workforce/attendance/${projectId}`, { params }),
};

// Materials APIs
export const materialApi = {
  listByProject: (projectId) => client.get(`/materials/project/${projectId}`),
  getById: (id) => client.get(`/materials/${id}`),
  create: (data) => client.post('/materials', data),
  updateStock: (id, data) => client.patch(`/materials/${id}/stock`, data),
  getBurnRate: (projectId) => client.get(`/materials/project/${projectId}/burn-rate`),
  logTransaction: (materialId, data) => client.post(`/materials/${materialId}/transactions`, data),
  getQR: (id) => client.get(`/materials/${id}/qr`),
};

// Equipment APIs
export const equipmentApi = {
  listByProject: (projectId, params) => client.get(`/equipment/project/${projectId}`, { params }),
  getById: (id) => client.get(`/equipment/${id}`),
  create: (data) => client.post('/equipment', data),
  update: (id, data) => client.patch(`/equipment/${id}`, data),
  toggleCheckout: (id, data) => client.post(`/equipment/${id}/toggle-checkout`, data),
  getQR: (id) => client.get(`/equipment/${id}/qr`),
};

// Quick QR Action Scanning
export const scanApi = {
  executeAction: (data) => client.post('/scan/action', data),
};

// Historical Analytics & Depletion Forecasts
export const analyticsApi = {
  getMaterialConsumption: (projectId, days = 30) =>
    client.get(`/analytics/materials/${projectId}`, { params: { days } }),
  getProgress: (projectId) =>
    client.get(`/analytics/progress/${projectId}`),
};

// Daily Reports APIs
export const reportApi = {
  listByProject: (projectId, params) => client.get(`/reports/project/${projectId}`, { params }),
  create: (data) => client.post('/reports', data),
};

// Issues APIs
export const issueApi = {
  listByProject: (projectId, params) => client.get(`/issues/project/${projectId}`, { params }),
  create: (data) => client.post('/issues', data),
  updateStatus: (id, data) => client.patch(`/issues/${id}/status`, data),
};

// Safety & Quality APIs
export const safetyApi = {
  listByProject: (projectId, params) => client.get(`/safety/project/${projectId}`, { params }),
  create: (data) => client.post('/safety', data),
};

// Aggregation & Alerts
export const dashboardApi = {
  get: (projectId) => client.get(`/dashboard/${projectId}`),
};

export const notificationApi = {
  getByProject: (projectId) => client.get(`/notifications/project/${projectId}`),
};

export const clientSummaryApi = {
  get: (projectId) => client.get(`/client/summary/${projectId}`),
};
