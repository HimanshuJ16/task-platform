"use client"

import { NavLink } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { LayoutDashboard, CheckSquare, Building, Users, User } from "lucide-react"
import { cn } from "../utils/cn"

const Sidebar = () => {
  const { user } = useAuth()

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Organization", href: "/organization", icon: Building },
    {
      name: "Members",
      href: "/members",
      icon: Users,
      requiredRoles: ["admin", "manager"],
    },
    { name: "Profile", href: "/profile", icon: User },
  ]

  const filteredNavigation = navigation.filter(
    (item) => !item.requiredRoles || item.requiredRoles.includes(user?.role || ""),
  )

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <div className="flex items-center">
          <CheckSquare className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">TaskPlatform</span>
        </div>
      </div>

      <nav className="mt-6">
        <div className="px-3">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors",
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Organization info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Organization</div>
        <div className="mt-1 text-sm font-medium text-gray-900 truncate">{user?.organization.name}</div>
        <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
      </div>
    </div>
  )
}

export default Sidebar
