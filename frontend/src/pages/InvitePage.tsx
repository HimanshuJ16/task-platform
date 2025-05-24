"use client"

import { useState, useEffect } from "react"
import { useParams, Navigate } from "react-router-dom"
import { CheckSquare, Users, Calendar, AlertCircle } from "lucide-react"
import { invitesApi } from "../services/api"
import { format } from "date-fns"
import LoadingSpinner from "../components/LoadingSpinner"

interface InviteData {
  email: string
  role: string
  message?: string
  organization: {
    name: string
    description?: string
  }
  invitedBy: {
    firstName: string
    lastName: string
  }
  expiresAt: string
}

const InvitePage = () => {
  const { token } = useParams<{ token: string }>()
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchInvite()
    }
  }, [token])

  const fetchInvite = async () => {
    try {
      const response = await invitesApi.getByToken(token!)
      setInvite(response.data.invite)
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to load invitation")
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-purple-600 bg-purple-100"
      case "manager":
        return "text-blue-600 bg-blue-100"
      case "member":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <a
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">You're Invited!</h2>
          <p className="mt-2 text-sm text-gray-600">Join your team and start collaborating</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            {/* Organization Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                {invite.organization.name}
              </h3>
              {invite.organization.description && (
                <p className="mt-1 text-sm text-gray-600">{invite.organization.description}</p>
              )}
            </div>

            {/* Invitation Details */}
            <div className="border-t border-gray-200 pt-4">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Invited by</dt>
                  <dd className="text-sm text-gray-900">
                    {invite.invitedBy.firstName} {invite.invitedBy.lastName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Role</dt>
                  <dd>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(invite.role)}`}
                    >
                      {invite.role}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-sm text-gray-900">{invite.email}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Expires
                  </dt>
                  <dd className="text-sm text-gray-900">{format(new Date(invite.expiresAt), "PPP 'at' p")}</dd>
                </div>

                {invite.message && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Message</dt>
                    <dd className="text-sm text-gray-900 italic">"{invite.message}"</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <a
                href={`/register?token=${token}`}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Accept Invitation
              </a>

              <p className="text-xs text-gray-500 text-center">
                By accepting this invitation, you'll create an account and join {invite.organization.name} as a{" "}
                {invite.role}.
              </p>

              <div className="text-center">
                <a href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                  Already have an account? Sign in
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Security Notice</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This invitation was sent to <strong>{invite.email}</strong>. If this is not your email address, please
                  do not proceed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvitePage
