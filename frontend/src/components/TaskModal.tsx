"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { X, Calendar, User, Tag } from "lucide-react"
import { tasksApi } from "../services/api"
import { format } from "date-fns"
import toast from "react-hot-toast"
import LoadingSpinner from "./LoadingSpinner"

interface TaskModalProps {
  task?: any
  members: any[]
  onClose: () => void
  onTaskCreated: (task: any) => void
  onTaskUpdated: (task: any) => void
}

interface TaskForm {
  title: string
  description: string
  priority: "low" | "medium" | "high" | "critical"
  category: "bug" | "feature" | "improvement" | "documentation"
  assignedTo: string
  dueDate: string
  tags: string
  estimatedHours: number
}

const TaskModal: React.FC<TaskModalProps> = ({ task, members, onClose, onTaskCreated, onTaskUpdated }) => {
  const [loading, setLoading] = useState(false)
  const isEditing = !!task

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<TaskForm>()

  useEffect(() => {
    if (task) {
      setValue("title", task.title)
      setValue("description", task.description || "")
      setValue("priority", task.priority)
      setValue("category", task.category)
      setValue("assignedTo", task.assignedTo?._id || "")
      setValue("dueDate", format(new Date(task.dueDate), "yyyy-MM-dd"))
      setValue("tags", task.tags.join(", "))
      setValue("estimatedHours", task.estimatedHours || 0)
    }
  }, [task, setValue])

  const onSubmit = async (data: TaskForm) => {
    try {
      setLoading(true)

      const taskData = {
        ...data,
        tags: data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        assignedTo: data.assignedTo || undefined,
        estimatedHours: data.estimatedHours || undefined,
      }

      if (isEditing) {
        const response = await tasksApi.update(task._id, taskData)
        onTaskUpdated(response.data.task)
      } else {
        const response = await tasksApi.create(taskData)
        onTaskCreated(response.data.task)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${isEditing ? "update" : "create"} task`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">{isEditing ? "Edit Task" : "Create New Task"}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              {...register("title", { required: "Title is required" })}
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task title"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority *
              </label>
              <select
                {...register("priority", { required: "Priority is required" })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category *
              </label>
              <select
                {...register("category", { required: "Category is required" })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
                <option value="documentation">Documentation</option>
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assigned To */}
            <div>
              <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">
                <User className="inline h-4 w-4 mr-1" />
                Assign To
              </label>
              <select
                {...register("assignedTo")}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                <Calendar className="inline h-4 w-4 mr-1" />
                Due Date *
              </label>
              <input
                {...register("dueDate", { required: "Due date is required" })}
                type="date"
                min={format(new Date(), "yyyy-MM-dd")}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                <Tag className="inline h-4 w-4 mr-1" />
                Tags
              </label>
              <input
                {...register("tags")}
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter tags separated by commas"
              />
              <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas</p>
            </div>

            {/* Estimated Hours */}
            <div>
              <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
                Estimated Hours
              </label>
              <input
                {...register("estimatedHours", { min: 0 })}
                type="number"
                step="0.5"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              {isEditing ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
