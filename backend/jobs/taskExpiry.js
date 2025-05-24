const cron = require("node-cron")
const Task = require("../models/Task")
const User = require("../models/User")

class TaskExpiryJob {
  constructor() {
    this.job = null
  }

  start() {
    // Run every hour to check for expired tasks
    this.job = cron.schedule(
      "0 * * * *",
      async () => {
        try {
          console.log("Running task expiry job...")
          await this.expireTasks()
          await this.notifyOverdueTasks()
        } catch (error) {
          console.error("Task expiry job error:", error)
        }
      },
      {
        scheduled: false,
      },
    )

    this.job.start()
    console.log("Task expiry job started")
  }

  stop() {
    if (this.job) {
      this.job.stop()
      console.log("Task expiry job stopped")
    }
  }

  async expireTasks() {
    try {
      const now = new Date()

      // Find tasks that are past due date and not completed
      const expiredTasks = await Task.updateMany(
        {
          dueDate: { $lt: now },
          status: { $in: ["todo", "in_progress"] },
        },
        {
          $set: { status: "expired" },
        },
      )

      if (expiredTasks.modifiedCount > 0) {
        console.log(`Expired ${expiredTasks.modifiedCount} tasks`)
      }

      return expiredTasks.modifiedCount
    } catch (error) {
      console.error("Error expiring tasks:", error)
      throw error
    }
  }

  async notifyOverdueTasks() {
    try {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Find tasks that became overdue in the last day
      const overdueTasks = await Task.find({
        dueDate: {
          $gte: oneDayAgo,
          $lt: now,
        },
        status: { $in: ["todo", "in_progress"] },
        assignedTo: { $exists: true },
      }).populate("assignedTo")

      for (const task of overdueTasks) {
        if (task.assignedTo) {
          // Check if notification already sent
          const existingNotification = task.assignedTo.notifications.find(
            (notif) =>
              notif.type === "task_overdue" && notif.message.includes(task.title) && notif.createdAt > oneDayAgo,
          )

          if (!existingNotification) {
            await User.findByIdAndUpdate(task.assignedTo._id, {
              $push: {
                notifications: {
                  message: `Task "${task.title}" is overdue`,
                  type: "task_overdue",
                },
              },
            })
          }
        }
      }

      if (overdueTasks.length > 0) {
        console.log(`Sent overdue notifications for ${overdueTasks.length} tasks`)
      }

      return overdueTasks.length
    } catch (error) {
      console.error("Error sending overdue notifications:", error)
      throw error
    }
  }

  // Manual trigger for testing
  async runNow() {
    try {
      const expiredCount = await this.expireTasks()
      const notificationCount = await this.notifyOverdueTasks()

      return {
        expiredTasks: expiredCount,
        notifications: notificationCount,
      }
    } catch (error) {
      console.error("Manual job run error:", error)
      throw error
    }
  }
}

module.exports = new TaskExpiryJob()
