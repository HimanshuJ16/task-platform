"use client"

import { useState } from "react"
import { Menu, Bell, LogOut, UserIcon } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import NotificationDropdown from "./NotificationDropdown"

const Header = () => {
  const { user, logout } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const unreadNotifications = user?.notifications?.filter((n) => !n.read).length || 0

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <button type="button" className="p-2 rounded-md text-gray-400 hover:text-gray-500 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 ml-2">Welcome back, {user?.firstName}!</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-6 w-6" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                  {unreadNotifications}
                </span>
              )}
            </button>
            {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center p-2 rounded-md text-gray-400 hover:text-gray-500"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName.charAt(0)}
                  {user?.lastName.charAt(0)}
                </span>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <div className="px-4 py-2 text-sm text-gray-700 border-b">
                  <div className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-gray-500">{user?.email}</div>
                </div>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <UserIcon className="mr-3 h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={logout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
