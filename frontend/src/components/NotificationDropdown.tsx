"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { X, Check } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { usersApi } from "../services/api"
import toast from "react-hot-toast"

interface NotificationDropdownProps {
  onClose: () => void
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const { user, updateUser } = useAuth()
  const [notifications, setNotifications] = useState(user?.notifications || [])

  useEffect(() => {
    setNotifications(user?.notifications || [])
  }, [user?.notifications])

  const markAsRead = async (notificationId: string) => {
    try {
      await usersApi.markNotificationRead(notificationId)

      const updatedNotifications = notifications.map((notif) =>
        notif._id === notificationId ? { ...notif, read: true } : notif,
      )

      setNotifications(updatedNotifications)
      updateUser({
        notifications: updatedNotifications,
      })

      toast.success("Notification marked as read")
    } catch (error) {
      toast.error("Failed to mark notification as read")
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return "📋"
      case "task_overdue":
        return "⚠️"
      case "invite":
        return "📨"
      default:
        return "📢"
    }
  }

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <div
              key={notification._id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getNotificationIcon(notification.type)}</span>
                    <p className="text-sm text-gray-900">{notification.message}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>

                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 10 && (
        <div className="p-2 border-t border-gray-200 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800">View all notifications</button>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
