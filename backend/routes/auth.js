const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('walletAddress').isEthereumAddress()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, walletAddress } = req.body;

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [{ email }, { walletAddress }] 
    });

    if (user) {
      return res.status(400).json({ 
        error: 'User already exists with this email or wallet address' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user is admin based on environment config
    const adminAddress = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const isAdmin = walletAddress.toLowerCase() === adminAddress.toLowerCase();

    // Create user
    user = new User({
      email,
      password: hashedPassword,
      name,
      walletAddress,
      isAdmin
    });

    await user.save();

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        walletAddress: user.walletAddress
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        walletAddress: user.walletAddress
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// @route   POST /api/auth/wallet-login
// @desc    Login with wallet signature
// @access  Public
router.post('/wallet-login', [
  body('walletAddress').isEthereumAddress(),
  body('signature').isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress, signature } = req.body;

    // In a real application, you would verify the signature here
    // For demo purposes, we'll just check if the user exists

    let user = await User.findOne({ walletAddress });
    
    if (!user) {
      // Check if user is admin based on environment config
      const adminAddress = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const isAdmin = walletAddress.toLowerCase() === adminAddress.toLowerCase();

      // Create user if they don't exist
      user = new User({
        email: `${walletAddress}@wallet.local`,
        password: '', // No password for wallet users
        name: `User ${walletAddress.slice(0, 6)}`,
        walletAddress,
        isAdmin
      });

      await user.save();
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        walletAddress: user.walletAddress
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ error: 'Server error during wallet login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      walletAddress: user.walletAddress,
      isAdmin: user.isAdmin
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
