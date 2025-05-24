const mongoose = require("mongoose")

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    settings: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      taskCategories: [
        {
          name: String,
          color: String,
        },
      ],
      taskPriorities: [
        {
          name: String,
          level: Number,
          color: String,
        },
      ],
    },
    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free",
      },
      maxUsers: {
        type: Number,
        default: 10,
      },
      maxTasks: {
        type: Number,
        default: 100,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

// Default categories and priorities
organizationSchema.pre("save", function (next) {
  if (this.isNew) {
    // Default task categories
    if (!this.settings.taskCategories || this.settings.taskCategories.length === 0) {
      this.settings.taskCategories = [
        { name: "Bug", color: "#ef4444" },
        { name: "Feature", color: "#3b82f6" },
        { name: "Improvement", color: "#10b981" },
        { name: "Documentation", color: "#f59e0b" },
      ]
    }

    // Default task priorities
    if (!this.settings.taskPriorities || this.settings.taskPriorities.length === 0) {
      this.settings.taskPriorities = [
        { name: "Low", level: 1, color: "#10b981" },
        { name: "Medium", level: 2, color: "#f59e0b" },
        { name: "High", level: 3, color: "#ef4444" },
        { name: "Critical", level: 4, color: "#dc2626" },
      ]
    }
  }
  next()
})

module.exports = mongoose.model("Organization", organizationSchema)
