const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  if (!req.isMongoConnected) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { 
      name, 
      email, 
      password, 
      skillLevel,
      minWaveHeight,
      maxWaveHeight,
      tidePreference,
      boardType
    } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      skillLevel: skillLevel || 'Beginner',
      preferences: {
        skillLevel: skillLevel || 'Beginner',
        minWaveHeight: parseFloat(minWaveHeight) || 0.5,
        maxWaveHeight: parseFloat(maxWaveHeight) || 2.0,
        tidePreference: tidePreference || 'Any',
        boardType: boardType || 'Soft-top'
      }
    });

    await user.save();

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        skillLevel: user.skillLevel,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  if (!req.isMongoConnected) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        skillLevel: user.skillLevel,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  if (!req.isMongoConnected) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

/**
 * Update user preferences
 */
exports.updatePreferences = async (req, res) => {
  if (!req.isMongoConnected) {
    return res.status(503).json({ error: 'Database unavailable' });
  }

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { preferences } = req.body;

    // Prepare update object
    const updateData = { preferences };
    
    // If skillLevel is in preferences, update the top-level field too
    if (preferences && preferences.skillLevel) {
      updateData.skillLevel = preferences.skillLevel;
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Update user profile (name/email)
 */
exports.updateProfile = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, email } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { $set: { name, email } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid current password' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete user account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    const decoded = jwt.verify(token, JWT_SECRET);
    await User.findByIdAndDelete(decoded.userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
