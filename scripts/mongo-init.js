// MongoDB initialization script
const db = db.getSiblingDB("task_platform")

// Create indexes for better performance
db.users.createIndex({ organization: 1, email: 1 })
db.users.createIndex({ organization: 1, role: 1 })

db.tasks.createIndex({ organization: 1, status: 1 })
db.tasks.createIndex({ organization: 1, assignedTo: 1 })
db.tasks.createIndex({ organization: 1, dueDate: 1 })
db.tasks.createIndex({ status: 1, dueDate: 1 })

db.organizations.createIndex({ slug: 1 }, { unique: true })

db.invites.createIndex({ organization: 1, email: 1 })
db.invites.createIndex({ token: 1 }, { unique: true })
db.invites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

print("Database indexes created successfully")
