# Backend Folder Structure

This backend follows a clean, layered architecture for better maintainability and scalability.

## 📁 Folder Structure

```
surfapp--backend/
├── config/              # Configuration files
│   ├── cache.js        # Cache management for spot data
│   ├── database.js     # MongoDB connection setup
│   ├── python.js       # Python ML engine configuration
│   ├── spotMetadata.js # Spot metadata loading
│   └── utils.js        # Helper utilities (date labels, etc.)
│
├── controllers/         # Request handlers (business logic)
│   ├── spotsController.js    # Handles spot recommendations
│   ├── forecastController.js # Handles 7-day forecasts
│   └── healthController.js   # Health check endpoint
│
├── middlewares/         # Express middlewares
│   └── mongoStatus.js  # MongoDB connection status middleware
│
├── models/             # Database models (Mongoose schemas)
│   ├── User.js         # User model
│   └── Session.js      # Surf session model
│
├── routes/             # API route definitions
│   ├── spots.js        # /api/spots routes
│   ├── forecast.js     # /api/forecast-chart routes
│   ├── health.js       # /api/health routes
│   ├── sessions.js     # /api/sessions routes
│   └── auth.js         # /api/auth routes
│
├── EnhancedSuitabilityCalculator.js  # Suitability scoring logic
├── server.js           # Main application entry point
└── package.json        # Dependencies
```

## 🎯 Layer Responsibilities

### Config Layer (`config/`)
- **Purpose**: Centralize all configuration and initialization logic
- **Files**:
  - `cache.js` - Manages in-memory cache for spot predictions (5-minute TTL)
  - `database.js` - MongoDB connection setup and status management
  - `python.js` - Python executable paths and ML script locations
  - `spotMetadata.js` - Loads spot metadata from shared JSON file
  - `utils.js` - Helper functions (date label generation, etc.)

### Controllers Layer (`controllers/`)
- **Purpose**: Handle business logic and coordinate between services
- **Files**:
  - `spotsController.js` - Fetches ML predictions, calculates suitability scores, handles caching
  - `forecastController.js` - Generates 7-day forecasts (daily/hourly)
  - `healthController.js` - System health and cache status

### Middlewares Layer (`middlewares/`)
- **Purpose**: Request/response processing and cross-cutting concerns
- **Files**:
  - `mongoStatus.js` - Attaches MongoDB connection status to all requests

### Models Layer (`models/`)
- **Purpose**: Database schema definitions
- **Files**:
  - `User.js` - User authentication and preferences
  - `Session.js` - Surf session tracking and ratings

### Routes Layer (`routes/`)
- **Purpose**: Define API endpoints and map to controllers
- **Files**:
  - `spots.js` - GET /api/spots
  - `forecast.js` - GET /api/forecast-chart
  - `health.js` - GET /api/health
  - `sessions.js` - Session CRUD operations
  - `auth.js` - User authentication

## 🔄 Request Flow

```
Client Request
    ↓
server.js (Express app)
    ↓
Middleware (mongoStatus)
    ↓
Route Handler (routes/)
    ↓
Controller (controllers/)
    ↓
Models/Config/Services
    ↓
Response to Client
```

## 📝 Example: Spots Endpoint Flow

1. **Request**: `GET /api/spots?skillLevel=Intermediate&userId=123`
2. **Route**: `routes/spots.js` → calls `spotsController.getSpots()`
3. **Controller**: `controllers/spotsController.js`
   - Parses user preferences
   - Loads session insights (if logged in)
   - Checks cache (via `config/cache.js`)
   - If cache miss: spawns Python ML script
   - Calculates enhanced suitability scores
   - Sorts spots by score
   - Returns response
4. **Response**: JSON with ranked surf spots

## 🚀 Benefits of This Structure

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Easy to unit test individual controllers/services
3. **Maintainability**: Changes are localized to specific layers
4. **Scalability**: Easy to add new endpoints or refactor logic
5. **Readability**: Clear organization makes onboarding easier
6. **Reusability**: Shared logic in config/ and utils/

## 🔧 Migration Notes

The old `server.js` has been backed up as `server_old.js`. The new architecture:
- ✅ Maintains all existing functionality
- ✅ No API changes - fully backward compatible
- ✅ Improved error handling and logging
- ✅ Better code organization

## 📚 Next Steps

Consider adding:
- `services/` layer for complex business logic
- `utils/` or `helpers/` for shared utilities
- `validators/` for request validation middleware
- `tests/` for unit and integration tests
