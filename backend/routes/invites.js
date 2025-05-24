const express = require("express")
const { body, validationResult } = require("express-validator")
const nodemailer = require("nodemailer")
const Invite = require("../models/Invite")
const User = require("../models/User")
const Organization = require("../models/Organization")
const { auth, authorize } = require("../middleware/auth")

const router = express.Router()

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Send invitation email
const sendInviteEmail = async (invite, organization, invitedBy) => {
  try {
    const transporter = createTransporter()
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/${invite.token}`

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: invite.email,
      subject: `Invitation to join ${organization.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited to join ${organization.name}</h2>
          <p>Hello!</p>
          <p>${invitedBy.firstName} ${invitedBy.lastName} has invited you to join <strong>${organization.name}</strong> as a ${invite.role}.</p>
          
          ${invite.message ? `<p><em>"${invite.message}"</em></p>` : ""}
          
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This invitation will expire in 7 days. If you don't want to join this organization, you can safely ignore this email.
          </p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error("Email sending error:", error)
    throw new Error("Failed to send invitation email")
  }
}

// Create and send invitation
router.post(
  "/",
  auth,
  authorize("admin", "manager"),
  [
    body("email").isEmail().normalizeEmail(),
    body("role").isIn(["admin", "manager", "member"]),
    body("message").optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, role, message } = req.body

      // Check if user already exists in the organization
      const existingUser = await User.findOne({
        email,
        organization: req.user.organization._id,
      })

      if (existingUser) {
        return res.status(400).json({
          message: "User is already a member of this organization",
        })
      }

      // Check if there's already a pending invite
      const existingInvite = await Invite.findOne({
        email,
        organization: req.user.organization._id,
        status: "pending",
      })

      if (existingInvite) {
        return res.status(400).json({
          message: "An invitation has already been sent to this email",
        })
      }

      // Check organization member limits
      const organization = await Organization.findById(req.user.organization._id)
      const memberCount = await User.countDocuments({
        organization: req.user.organization._id,
        isActive: true,
      })

      if (memberCount >= organization.subscription.maxUsers) {
        return res.status(400).json({
          message: "Organization has reached its member limit",
        })
      }

      // Create invitation
      const invite = new Invite({
        email,
        organization: req.user.organization._id,
        invitedBy: req.user._id,
        role,
        message,
      })

      await invite.save()

      // Send invitation email
      if (process.env.EMAIL_HOST) {
        try {
          await sendInviteEmail(invite, organization, req.user)
        } catch (emailError) {
          console.error("Failed to send email:", emailError)
          // Don't fail the request if email fails
        }
      }

      res.status(201).json({
        message: "Invitation sent successfully",
        invite: {
          _id: invite._id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
        },
      })
    } catch (error) {
      console.error("Create invite error:", error)
      res.status(500).json({ message: "Server error while creating invitation" })
    }
  },
)

// Get organization invitations
router.get("/", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const { status = "pending" } = req.query

    const invites = await Invite.find({
      organization: req.user.organization._id,
      ...(status && { status }),
    })
      .populate("invitedBy", "firstName lastName email")
      .sort({ createdAt: -1 })

    res.json({ invites })
  } catch (error) {
    console.error("Get invites error:", error)
    res.status(500).json({ message: "Server error while fetching invitations" })
  }
})

// Get invitation by token (public route)
router.get("/:token", async (req, res) => {
  try {
    const { token } = req.params

    const invite = await Invite.findOne({ token })
      .populate("organization", "name description")
      .populate("invitedBy", "firstName lastName")

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" })
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        message: "This invitation is no longer valid",
        status: invite.status,
      })
    }

    if (invite.isExpired) {
      invite.status = "expired"
      await invite.save()
      return res.status(400).json({
        message: "This invitation has expired",
        status: "expired",
      })
    }

    res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        message: invite.message,
        organization: invite.organization,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error("Get invite by token error:", error)
    res.status(500).json({ message: "Server error while fetching invitation" })
  }
})

// Cancel invitation
router.delete("/:inviteId", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const { inviteId } = req.params

    const invite = await Invite.findOne({
      _id: inviteId,
      organization: req.user.organization._id,
    })

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" })
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Cannot cancel this invitation" })
    }

    invite.status = "cancelled"
    await invite.save()

    res.json({ message: "Invitation cancelled successfully" })
  } catch (error) {
    console.error("Cancel invite error:", error)
    res.status(500).json({ message: "Server error while cancelling invitation" })
  }
})

// Resend invitation
router.post("/:inviteId/resend", auth, authorize("admin", "manager"), async (req, res) => {
  try {
    const { inviteId } = req.params

    const invite = await Invite.findOne({
      _id: inviteId,
      organization: req.user.organization._id,
    })

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" })
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Cannot resend this invitation" })
    }

    if (invite.isExpired) {
      // Extend expiration date
      invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await invite.save()
    }

    // Resend email
    if (process.env.EMAIL_HOST) {
      try {
        const organization = await Organization.findById(req.user.organization._id)
        await sendInviteEmail(invite, organization, req.user)
      } catch (emailError) {
        console.error("Failed to resend email:", emailError)
        return res.status(500).json({ message: "Failed to resend invitation email" })
      }
    }

    res.json({ message: "Invitation resent successfully" })
  } catch (error) {
    console.error("Resend invite error:", error)
    res.status(500).json({ message: "Server error while resending invitation" })
  }
})

// Cleanup expired invitations (internal route)
router.post("/cleanup", auth, authorize("admin"), async (req, res) => {
  try {
    const result = await Invite.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: "expired" },
      },
    )

    res.json({
      message: "Cleanup completed",
      expiredCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Cleanup invites error:", error)
    res.status(500).json({ message: "Server error during cleanup" })
  }
})

module.exports = router
