"use client"

import { useState, useEffect } from "react"
import { Plus, Mail, Shield, User, Crown } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { organizationsApi, invitesApi } from "../services/api"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"

interface Member {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: "admin" | "manager" | "member"
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

interface Invite {
  _id: string
  email: string
  role: string
  status: string
  createdAt: string
  expiresAt: string
  invitedBy: {
    firstName: string
    lastName: string
  }
}

interface InviteForm {
  email: string
  role: "admin" | "manager" | "member"
  message: string
}

const MembersPage = () => {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [activeTab, setActiveTab] = useState("members")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>()

  useEffect(() => {
    fetchMembers()
    fetchInvites()
  }, [])

  const fetchMembers = async () => {
    try {
      const response = await organizationsApi.getMembers()
      setMembers(response.data.members)
    } catch (error) {
      toast.error("Failed to fetch members")
    } finally {
      setLoading(false)
    }
  }

  const fetchInvites = async () => {
    try {
      const response = await invitesApi.getAll()
      setInvites(response.data.invites)
    } catch (error) {
      console.error("Failed to fetch invites:", error)
    }
  }

  const handleInvite = async (data: InviteForm) => {
    try {
      setInviting(true)
      await invitesApi.create(data)
      toast.success("Invitation sent successfully!")
      setShowInviteModal(false)
      reset()
      fetchInvites()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleUpdate = async (memberId: string, newRole: string) => {
    try {
      await organizationsApi.updateMemberRole(memberId, newRole)
      setMembers(members.map((member) => (member._id === memberId ? { ...member, role: newRole as any } : member)))
      toast.success("Member role updated successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update member role")
    }
  }

  const handleDeactivateMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this member?")) return

    try {
      await organizationsApi.deactivateMember(memberId)
      setMembers(members.map((member) => (member._id === memberId ? { ...member, isActive: false } : member)))
      toast.success("Member deactivated successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to deactivate member")
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await invitesApi.cancel(inviteId)
      setInvites(invites.filter((invite) => invite._id !== inviteId))
      toast.success("Invitation cancelled successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel invitation")
    }
  }

  const handleResendInvite = async (inviteId: string) => {
    try {
      await invitesApi.resend(inviteId)
      toast.success("Invitation resent successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend invitation")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-purple-600" />
      case "manager":
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-green-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-purple-600 bg-purple-100"
      case "manager":
        return "text-blue-600 bg-blue-100"
      default:
        return "text-green-600 bg-green-100"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-100"
      case "accepted":
        return "text-green-600 bg-green-100"
      case "expired":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const isAdmin = user?.role === "admin"
  const canInvite = isAdmin || (user?.role === "manager" && user?.organization?.settings?.allowMemberInvites)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-600">Manage your organization's team members and invitations</p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("members")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "members"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Members ({members.filter((m) => m.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab("invites")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "invites"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Pending Invites ({invites.filter((i) => i.status === "pending").length})
          </button>
        </nav>
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members
                  .filter((member) => member.isActive)
                  .map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {member.firstName.charAt(0)}
                              {member.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRoleIcon(member.role)}
                          <span
                            className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}
                          >
                            {member.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.lastLogin ? format(new Date(member.lastLogin), "MMM d, yyyy") : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(member.createdAt), "MMM d, yyyy")}
                      </td>
                      {isAdmin && member._id !== user?._id && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleUpdate(member._id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="member">Member</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleDeactivateMember(member._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Deactivate
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {members.filter((member) => member.isActive).length === 0 && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active members</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by inviting team members.</p>
            </div>
          )}
        </div>
      )}

      {/* Invites Tab */}
      {activeTab === "invites" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  {canInvite && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => (
                  <tr key={invite._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRoleIcon(invite.role)}
                        <span
                          className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invite.role)}`}
                        >
                          {invite.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invite.status)}`}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                    </td>
                    {canInvite && invite.status === "pending" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleResendInvite(invite._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleCancelInvite(invite._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invites.length === 0 && (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending invitations</h3>
              <p className="mt-1 text-sm text-gray-500">Invite team members to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(handleInvite)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="colleague@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  {...register("role", { required: "Role is required" })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  {isAdmin && <option value="admin">Admin</option>}
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  Personal Message (Optional)
                </label>
                <textarea
                  {...register("message")}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Welcome to our team!"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviting && <LoadingSpinner size="sm" className="mr-2" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembersPage
