"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi } from "../services/api"

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "manager" | "member"
  organization: {
    _id: string
    name: string
    slug: string
    settings: {
      theme: string
      allowMemberInvites: boolean
      taskCategories: Array<{ name: string; color: string }>
      taskPriorities: Array<{ name: string; level: number; color: string }>
    }
  }
  notifications: Array<{
    _id: string
    message: string
    type: string
    read: boolean
    createdAt: string
  }>
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  loading: boolean
  updateUser: (userData: Partial<User>) => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName?: string
  inviteToken?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuth = async () => {
    try {
      const response = await authApi.me()
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password })
    const { token, user: userData } = response.data

    localStorage.setItem("token", token)
    setUser(userData)
  }

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data)
    const { token, user: userData } = response.data

    localStorage.setItem("token", token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null))
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
