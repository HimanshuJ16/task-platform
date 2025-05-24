"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Calendar, Tag, Clock, Edit, Trash2 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { tasksApi } from "../services/api"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"
import LoadingSpinner from "../components/LoadingSpinner"

interface Task {
  _id: string
  title: string
  description?: string
  status: "todo" | "in_progress" | "completed" | "expired"
  priority: "low" | "medium" | "high" | "critical"
  category: string
  dueDate: string
  assignedTo?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  createdBy: {
    firstName: string
    lastName: string
  }
  tags: string[]
  estimatedHours?: number
  actualHours?: number
  comments: Array<{
    _id: string
    user: {
      firstName: string
      lastName: string
    }
    content: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

interface CommentForm {
  content: string
}

const TaskDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [addingComment, setAddingComment] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentForm>()

  useEffect(() => {
    if (id) {
      fetchTask()
    }
  }, [id])

  const fetchTask = async () => {
    try {
      const response = await tasksApi.getById(id!)
      setTask(response.data.task)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch task")
      navigate("/tasks")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task) return

    try {
      setUpdating(true)
      const response = await tasksApi.update(task._id, { status: newStatus })
      setTask(response.data.task)
      toast.success("Task status updated successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update task status")
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async (data: CommentForm) => {
    if (!task) return

    try {
      setAddingComment(true)
      const response = await tasksApi.addComment(task._id, data)

      // Add the new comment to the task
      setTask({
        ...task,
        comments: [...task.comments, response.data.comment],
      })

      reset()
      toast.success("Comment added successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add comment")
    } finally {
      setAddingComment(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return

    if (!window.confirm("Are you sure you want to delete this task?")) return

    try {
      await tasksApi.delete(task._id)
      toast.success("Task deleted successfully!")
      navigate("/tasks")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete task")
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-red-600 bg-red-100"
      case "high":
        return "text-orange-600 bg-orange-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      case "low":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100"
      case "in_progress":
        return "text-blue-600 bg-blue-100"
      case "expired":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const canEdit = user?.role === "admin" || user?.role === "manager"
  const canUpdateStatus = canEdit || task?.assignedTo?._id === user?._id

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Task not found</h3>
        <Link to="/tasks" className="mt-2 text-blue-600 hover:text-blue-500">
          Back to tasks
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/tasks" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to tasks
          </Link>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            <button
              onClick={() => navigate(`/tasks/${task._id}/edit`)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDeleteTask}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Task Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}
                >
                  {task.status.replace("_", " ")}
                </span>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </span>
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  {task.category}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {task.description && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Status Update */}
              {canUpdateStatus && task.status !== "completed" && task.status !== "expired" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Update Status</h3>
                  <div className="flex space-x-2">
                    {task.status === "todo" && (
                      <button
                        onClick={() => handleStatusUpdate("in_progress")}
                        disabled={updating}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updating && <LoadingSpinner size="sm" className="mr-2" />}
                        Start Progress
                      </button>
                    )}
                    {task.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusUpdate("completed")}
                        disabled={updating}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {updating && <LoadingSpinner size="sm" className="mr-2" />}
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Comments ({task.comments.length})</h3>

                {/* Add Comment Form */}
                <form onSubmit={handleSubmit(handleAddComment)} className="mb-6">
                  <div>
                    <textarea
                      {...register("content", { required: "Comment is required" })}
                      rows={3}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a comment..."
                    />
                    {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={addingComment}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {addingComment && <LoadingSpinner size="sm" className="mr-2" />}
                      Add Comment
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {task.comments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No comments yet.</p>
                  ) : (
                    task.comments.map((comment) => (
                      <div key={comment._id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {comment.user.firstName.charAt(0)}
                              {comment.user.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {comment.user.firstName} {comment.user.lastName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Task Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Task Information</h4>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</dt>
                    <dd className="mt-1">
                      {task.assignedTo ? (
                        <div className="flex items-center">
                          <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                            <span className="text-xs font-medium text-white">
                              {task.assignedTo.firstName.charAt(0)}
                              {task.assignedTo.lastName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {task.assignedTo.firstName} {task.assignedTo.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unassigned</span>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{format(new Date(task.dueDate), "PPP")}</dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created By</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {task.createdBy.firstName} {task.createdBy.lastName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">{format(new Date(task.createdAt), "PPP 'at' p")}</dd>
                  </div>

                  {task.estimatedHours && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Estimated Hours
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">{task.estimatedHours}h</dd>
                    </div>
                  )}

                  {task.actualHours && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actual Hours</dt>
                      <dd className="mt-1 text-sm text-gray-900">{task.actualHours}h</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetailsPage
