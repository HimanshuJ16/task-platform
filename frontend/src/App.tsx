"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./contexts/AuthContext"
import Layout from "./components/Layout"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import InvitePage from "./pages/InvitePage"
import DashboardPage from "./pages/DashboardPage"
import TasksPage from "./pages/TasksPage"
import TaskDetailsPage from "./pages/TaskDetailsPage"
import OrganizationPage from "./pages/OrganizationPage"
import MembersPage from "./pages/MembersPage"
import ProfilePage from "./pages/ProfilePage"
import LoadingSpinner from "./components/LoadingSpinner"

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" replace />} />
      <Route path="/invite/:token" element={!user ? <InvitePage /> : <Navigate to="/dashboard" replace />} />

      {/* Protected routes */}
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailsPage />} />
        <Route path="organization" element={<OrganizationPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
