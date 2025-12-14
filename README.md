# Event App - Full Stack Mobile Application

A complete mobile application with Node.js backend and React Native mobile app (iOS & Android).

## Project Structure

```
Event_app_backend/
├── backend/                 # Node.js Backend API
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   └── server.js       # Entry point
│   ├── .env.example        # Environment variables template
│   └── package.json        # Backend dependencies
│
└── mobile/                  # React Native Mobile App
    ├── src/
    │   ├── config/         # API configuration
    │   ├── context/        # React Context providers
    │   └── screens/        # App screens
    ├── App.js              # App entry point
    ├── app.json            # Expo configuration
    └── package.json        # Mobile dependencies
```

## Backend Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/eventapp
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:3000
```

5. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The backend API will be running on `http://localhost:5000`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

#### Events
- `GET /api/events` - Get all events (with optional query params: category, status, search)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Protected)
- `PUT /api/events/:id` - Update event (Protected)
- `DELETE /api/events/:id` - Delete event (Protected)
- `POST /api/events/:id/register` - Register for event (Protected)

#### Users
- `GET /api/users/profile` - Get user profile (Protected)
- `PUT /api/users/profile` - Update user profile (Protected)

## Mobile App Setup

### Prerequisites
- Node.js (v14 or higher)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Studio (for Android)

### Installation

1. Navigate to mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API URL in `src/config/api.js`:
```javascript
const API_URL = __DEV__ 
  ? 'http://localhost:5000/api'  // For iOS simulator
  : 'http://YOUR_IP:5000/api';    // For physical device, use your computer's IP
```

**Note for Physical Devices:**
- iOS: Use your Mac's IP address (e.g., `http://192.168.1.100:5000/api`)
- Android: Use your computer's IP address
- Make sure your device and computer are on the same network

4. Start the Expo development server:
```bash
npm start
# or
expo start
```

5. Run on device:
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go app

### Building for Production

#### iOS
```bash
expo build:ios
```

#### Android
```bash
expo build:android
```

## Features

### Backend
- ✅ RESTful API with Express.js
- ✅ MongoDB database with Mongoose
- ✅ JWT authentication
- ✅ Password encryption with bcrypt
- ✅ Error handling middleware
- ✅ CORS enabled
- ✅ Security headers with Helmet
- ✅ Request logging with Morgan

### Mobile App
- ✅ React Native with Expo
- ✅ Navigation (Stack & Tab navigation)
- ✅ Authentication (Login/Register)
- ✅ Event listing and search
- ✅ Event details and registration
- ✅ User profile
- ✅ Create events
- ✅ Context API for state management
- ✅ AsyncStorage for token persistence

## Development Workflow

1. **Start Backend**: `cd backend && npm run dev`
2. **Start Mobile**: `cd mobile && npm start`
3. **Test on Device**: Use Expo Go app or simulators

## Environment Variables

### Backend (.env)
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CORS_ORIGIN` - Allowed CORS origin

## Next Steps

1. Add image upload functionality
2. Add push notifications
3. Add event categories filtering
4. Add user favorites/bookmarks
5. Add event reviews and ratings
6. Add social sharing
7. Add calendar integration
8. Add payment integration (Stripe, etc.)

## Troubleshooting

### Mobile app can't connect to backend
- Make sure backend is running
- Check API URL in `src/config/api.js`
- For physical devices, use your computer's IP address instead of `localhost`
- Ensure both devices are on the same network
- Check firewall settings

### MongoDB connection issues
- Make sure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- For cloud MongoDB (Atlas), whitelist your IP address

## License

ISC

