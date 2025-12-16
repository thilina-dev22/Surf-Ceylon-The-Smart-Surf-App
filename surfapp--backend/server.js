require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Configuration
const { connectDatabase } = require('./config/database');
const { loadSpotMetadata } = require('./config/spotMetadata');

// Middleware
const mongoStatus = require('./middlewares/mongoStatus');

// Routes
const spotsRoutes = require('./routes/spots');
const forecastRoutes = require('./routes/forecast');
const healthRoutes = require('./routes/health');
const sessionRoutes = require('./routes/sessions');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection (optional - app works without MongoDB)
connectDatabase();

// Load spot metadata
loadSpotMetadata();

// Make MongoDB connection status available to all routes
app.use(mongoStatus);

// API Routes
app.use('/api/spots', spotsRoutes);
app.use('/api/forecast-chart', forecastRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🌊 Surf Ceylon Backend running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
