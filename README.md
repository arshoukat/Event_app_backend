# Event App - Backend API

A Node.js/Express REST API backend for the Event App application.

## Project Structure

```
Event_app_backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   └── server.js       # Entry point
├── .env                # Environment variables (create this file)
├── package.json        # Dependencies
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
touch .env
```

3. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/eventapp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:3000
```

**Note:** Port 5001 is used instead of 5000 to avoid conflicts with macOS AirPlay Receiver.

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The backend API will be running on `http://localhost:5001`

## API Endpoints

### Base URL
- `GET /api` - Get API information and available endpoints
- `GET /health` - Health check endpoint

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Events
- `GET /api/events` - Get all events (with optional query params: category, status, search)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Protected)
- `PUT /api/events/:id` - Update event (Protected)
- `DELETE /api/events/:id` - Delete event (Protected)
- `POST /api/events/:id/register` - Register for event (Protected)

### Users
- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update user profile (Protected)

## Features

- ✅ RESTful API with Express.js
- ✅ MongoDB database with Mongoose
- ✅ JWT authentication
- ✅ Password encryption with bcrypt
- ✅ Error handling middleware
- ✅ CORS enabled
- ✅ Security headers with Helmet
- ✅ Request logging with Morgan

## Development Workflow

1. **Start Server**: `npm run dev`
2. **Test API**: Use Postman, curl, or your frontend application
3. **View Logs**: Check terminal for request logs

## Environment Variables

### Required (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001, changed from 5000 to avoid macOS AirPlay conflict)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string in production)
- `CORS_ORIGIN` - Allowed CORS origin

## Troubleshooting

### Port 5000 already in use
- macOS AirPlay Receiver uses port 5000 by default
- The backend is configured to use port 5001 to avoid this conflict
- If you need to use port 5000, disable AirPlay Receiver in System Settings > General > AirDrop & Handoff

### MongoDB connection issues
- Make sure MongoDB is running
  - macOS: `brew services start mongodb-community@7.0`
  - Check status: `brew services list | grep mongodb`
- Check `MONGODB_URI` in `.env` file
- For cloud MongoDB (Atlas), whitelist your IP address

### Route not found errors
- Make sure you're using the correct endpoint paths (e.g., `/api/events` not just `/api`)
- Check the API info: `GET http://localhost:5001/api`

## License

ISC
