# Multi-Tenant Task Management Platform

A comprehensive MERN stack application for managing tasks across multiple organizations with role-based access control, automated task expiry, and real-time notifications.

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture**: Complete data isolation per organization
- **Role-Based Authentication**: Admin, Manager, and Member roles with specific permissions
- **Task Management**: Full CRUD operations with categories, priorities, and due dates
- **Automated Task Expiry**: Background jobs to update task status and send notifications
- **Invitation System**: Email-based user invitations with role assignment
- **Real-time Notifications**: In-app notifications for task assignments and overdue tasks
- **Organization Dashboard**: Task statistics and member management
- **Secure Authentication**: JWT-based authentication with role-based access control

### Technical Features
- **Containerized Deployment**: Docker and Docker Compose configuration
- **Database Optimization**: MongoDB with proper indexing for multi-tenancy
- **Background Jobs**: Node-cron for automated task processing
- **API Testing**: Comprehensive test suite with Jest and Supertest
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Production Ready**: Nginx load balancer and security configurations

## 🏗️ Architecture

\`\`\`
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Express.js)  │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Background     │
                       │  Jobs (Cron)    │
                       └─────────────────┘
\`\`\`

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Docker & Docker Compose (for containerized deployment)
- Redis (optional, for caching)

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
\`\`\`bash
git clone https://github.com/yourusername/mern-task-platform.git
cd mern-task-platform
\`\`\`

2. **Install dependencies**
\`\`\`bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
\`\`\`

3. **Environment Configuration**
\`\`\`bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend environment
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
\`\`\`

4. **Start MongoDB**
\`\`\`bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Or use your local MongoDB installation
\`\`\`

5. **Run the application**
\`\`\`bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately
npm run server  # Backend only
npm run client  # Frontend only
\`\`\`

### Docker Deployment

1. **Development with Docker**
\`\`\`bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

2. **Production Deployment**
\`\`\`bash
# Copy environment file
cp .env.example .env
# Edit .env with production values

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d
\`\`\`

## 🧪 Testing

### Backend Tests
\`\`\`bash
cd backend
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
\`\`\`

### Frontend Tests
\`\`\`bash
cd frontend
npm test                # Run all tests
npm run test:coverage   # Run with coverage report
\`\`\`

### API Testing
\`\`\`bash
# Test API endpoints manually
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "organizationName": "Test Organization"
  }'
\`\`\`

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh token |

### Task Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/tasks` | Get all tasks | All |
| GET | `/api/tasks/stats` | Get task statistics | All |
| GET | `/api/tasks/:id` | Get single task | All |
| POST | `/api/tasks` | Create new task | Admin, Manager |
| PUT | `/api/tasks/:id` | Update task | Admin, Manager, Member* |
| DELETE | `/api/tasks/:id` | Delete task | Admin, Manager |

*Members can only update tasks assigned to them

### Organization Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/organizations/me` | Get current organization | All |
| PUT | `/api/organizations/me` | Update organization | Admin |
| GET | `/api/organizations/members` | Get organization members | Admin, Manager |
| POST | `/api/organizations/invite` | Invite user | Admin, Manager |

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
\`\`\`env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/task-platform
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
\`\`\`

#### Frontend (.env)
\`\`\`env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=Task Platform
\`\`\`

### Database Configuration

The application uses MongoDB with the following collections:
- `users` - User accounts and profiles
- `organizations` - Organization data and settings
- `tasks` - Task management data
- `invites` - User invitation tokens

### Security Features

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- Role-based access control

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up email service
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Server Requirements

**Minimum Requirements:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Ubuntu 20.04+ or similar

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- Load balancer for high availability

### Monitoring

The application includes health check endpoints:
- Backend: `GET /health`
- Database connectivity check
- Background job status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Ensure Docker builds pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for usage examples

## 🔄 Changelog

### v1.0.0
- Initial release
- Multi-tenant task management
- Role-based authentication
- Automated task expiry
- Docker containerization
- CI/CD pipeline

---

**Built with ❤️ using the MERN Stack**
