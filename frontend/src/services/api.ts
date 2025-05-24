import axios from "axios"

const API_URL = process.env.VITE_API_URL || "http://localhost:5000/api"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
}

// Tasks API
export const tasksApi = {
  getAll: (params?: any) => api.get("/tasks", { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post("/tasks", data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  addComment: (id: string, data: { content: string }) => api.post(`/tasks/${id}/comments`, data),
  getStats: () => api.get("/tasks/stats"),
}

// Organizations API
export const organizationsApi = {
  getCurrent: () => api.get("/organizations/me"),
  update: (data: any) => api.put("/organizations/me", data),
  getMembers: () => api.get("/organizations/members"),
  invite: (data: { email: string; role: string; message?: string }) => api.post("/organizations/invite", data),
  updateMemberRole: (userId: string, role: string) => api.put(`/organizations/members/${userId}/role`, { role }),
  deactivateMember: (userId: string) => api.put(`/organizations/members/${userId}/deactivate`),
  getStats: () => api.get("/organizations/stats"),
}

// Users API
export const usersApi = {
  updateProfile: (data: any) => api.put("/users/profile", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put("/users/password", data),
  getNotifications: () => api.get("/users/notifications"),
  markNotificationRead: (id: string) => api.put(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put("/users/notifications/read-all"),
  deleteNotification: (id: string) => api.delete(`/users/notifications/${id}`),
  getStats: () => api.get("/users/stats"),
}

// Invites API
export const invitesApi = {
  getByToken: (token: string) => api.get(`/invites/${token}`),
  accept: (token: string, data: any) => api.post(`/invites/${token}/accept`, data),
  getAll: (params?: any) => api.get("/invites", { params }),
  create: (data: { email: string; role: string; message?: string }) => api.post("/invites", data),
  cancel: (id: string) => api.delete(`/invites/${id}`),
  resend: (id: string) => api.post(`/invites/${id}/resend`),
  cleanup: () => api.post("/invites/cleanup"),
}

export default api
