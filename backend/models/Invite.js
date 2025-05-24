const mongoose = require("mongoose")
const { v4: uuidv4 } = require("uuid")

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "member"],
      default: "member",
    },
    token: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    acceptedAt: {
      type: Date,
    },
    message: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
)

// Index for cleanup and queries
inviteSchema.index({ organization: 1, email: 1 })
inviteSchema.index({ token: 1 })
inviteSchema.index({ expiresAt: 1 })

// Check if invite is expired
inviteSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date()
})

module.exports = mongoose.model("Invite", inviteSchema)
