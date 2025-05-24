"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { organizationsApi } from "../services/api"
import { useForm } from "react-hook-form"
import { Building, Settings, Palette, Users, Save } from "lucide-react"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"

interface Organization {
  _id: string
  name: string
  slug: string
  description?: string
  settings: {
    theme: "light" | "dark" | "auto"
    allowMemberInvites: boolean
    taskCategories: Array<{ name: string; color: string }>
    taskPriorities: Array<{ name: string; level: number; color: string }>
  }
  subscription: {
    plan: "free" | "pro" | "enterprise"
    maxUsers: number
    maxTasks: number
  }
  createdAt: string
}

interface OrganizationForm {
  name: string
  description: string
  theme: "light" | "dark" | "auto"
  allowMemberInvites: boolean
}

const OrganizationPage = () => {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OrganizationForm>()

  useEffect(() => {
    fetchOrganization()
  }, [])

  const fetchOrganization = async () => {
    try {
      const response = await organizationsApi.getCurrent()
      const orgData = response.data.organization
      setOrganization(orgData)

      // Set form values
      setValue("name", orgData.name)
      setValue("description", orgData.description || "")
      setValue("theme", orgData.settings.theme)
      setValue("allowMemberInvites", orgData.settings.allowMemberInvites)
    } catch (error) {
      toast.error("Failed to fetch organization details")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: OrganizationForm) => {
    try {
      setSaving(true)
      const response = await organizationsApi.update({
        name: data.name,
        description: data.description,
        settings: {
          theme: data.theme,
          allowMemberInvites: data.allowMemberInvites,
        },
      })

      setOrganization(response.data.organization)
      toast.success("Organization updated successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "bg-purple-100 text-purple-800"
      case "pro":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isAdmin = user?.role === "admin"

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Organization not found</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building className="h-6 w-6 mr-2" />
            Organization Settings
          </h1>
          <p className="text-sm text-gray-600">Manage your organization's settings and preferences</p>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPlanBadgeColor(organization.subscription.plan)}`}
        >
          {organization.subscription.plan.charAt(0).toUpperCase() + organization.subscription.plan.slice(1)} Plan
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "general"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "preferences"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Palette className="h-4 w-4 inline mr-2" />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "subscription"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Subscription
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {activeTab === "general" && (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Information</h3>

              <div className="grid grid-cols-1 gap-6">
                {/* Organization Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Organization Name
                  </label>
                  <input
                    {...register("name", { required: "Organization name is required" })}
                    type="text"
                    disabled={!isAdmin}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                {/* Organization Slug */}
                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    value={organization.slug}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">The organization slug cannot be changed</p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    disabled={!isAdmin}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Describe your organization..."
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving && <LoadingSpinner size="sm" className="mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === "preferences" && (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Preferences</h3>

              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                    Theme
                  </label>
                  <select
                    {...register("theme")}
                    disabled={!isAdmin}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>

                {/* Member Invites */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      {...register("allowMemberInvites")}
                      type="checkbox"
                      disabled={!isAdmin}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="allowMemberInvites" className="font-medium text-gray-700">
                      Allow members to send invites
                    </label>
                    <p className="text-gray-500">When enabled, members can invite new users to the organization</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Categories */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Task Categories</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {organization.settings.taskCategories.map((category, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Priorities */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Task Priorities</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {organization.settings.taskPriorities.map((priority, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: priority.color }} />
                    <span className="text-sm text-gray-700">{priority.name}</span>
                    <span className="text-xs text-gray-500">({priority.level})</span>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving && <LoadingSpinner size="sm" className="mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === "subscription" && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Plan</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{organization.subscription.plan}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Max Users</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.subscription.maxUsers}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Max Tasks</dt>
                  <dd className="mt-1 text-sm text-gray-900">{organization.subscription.maxTasks}</dd>
                </div>
              </dl>
            </div>

            {organization.subscription.plan === "free" && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Upgrade Your Plan</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Unlock more features with our Pro or Enterprise plans. Get unlimited users, tasks, and advanced
                        features.
                      </p>
                    </div>
                    <div className="mt-4">
                      <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
                        View Plans
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizationPage
