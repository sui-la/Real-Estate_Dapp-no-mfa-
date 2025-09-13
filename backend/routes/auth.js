const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper function to check if user is admin
const checkAdminStatus = (email, walletAddress) => {
  const adminAddress = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const adminEmail = process.env.ADMIN_EMAIL;
  
  return (walletAddress && walletAddress.toLowerCase() === adminAddress.toLowerCase()) || 
         (adminEmail && email.toLowerCase() === adminEmail.toLowerCase());
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('walletAddress').optional().isEthereumAddress(),
  body('profile').optional().isObject(),
  body('profile.phone').optional().trim(),
  body('profile.address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, walletAddress, profile } = req.body;

    // Check if user already exists (only check email for email/password registration)
    let user = await User.findOne({ 
      $or: [
        { email }, 
        ...(walletAddress ? [{ walletAddress: walletAddress.toLowerCase() }] : [])
      ]
    });

    if (user) {
      return res.status(400).json({ 
        error: 'User already exists with this email' + (walletAddress ? ' or wallet address' : '')
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if wallet is already in use (if provided)
    if (walletAddress) {
      const existingWalletUser = await User.findOne({ 
        walletAddress: walletAddress.toLowerCase()
      }).where('walletAddress').ne("").ne(null);
      
      if (existingWalletUser) {
        return res.status(400).json({ error: 'Wallet address is already registered' });
      }
    }

    // Check if user is admin based on environment config (only if wallet provided)
    const isAdmin = walletAddress ? checkAdminStatus(email, walletAddress) : checkAdminStatus(email, null);

    // Create user with empty wallet address for email/password registration
    user = new User({
      email,
      password: hashedPassword,
      name,
      walletAddress: walletAddress ? walletAddress.toLowerCase() : "", // Empty string for new users
      isAdmin,
      profile: profile || {}
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

    // Update admin status if it has changed
    const currentAdminStatus = checkAdminStatus(user.email, user.walletAddress);
    if (user.isAdmin !== currentAdminStatus) {
      user.isAdmin = currentAdminStatus;
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
      const isAdmin = checkAdminStatus(`${walletAddress}@wallet.local`, walletAddress);

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

// @route   POST /api/auth/verify
// @desc    Verify JWT token and get user data
// @access  Private
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        profile: user.profile,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Server error during token verification' });
  }
});

// @route   POST /api/auth/check-wallet
// @desc    Check if wallet address is already linked to an account
// @access  Public
router.post('/check-wallet', [
  body('walletAddress').isEthereumAddress()
], async (req, res) => {
  try {
    const { walletAddress } = req.body;
    // Check if wallet is already linked to any user (excluding empty strings and null)
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      $and: [
        { walletAddress: { $ne: "" } },
        { walletAddress: { $ne: null } }
      ]
    });

    if (existingUser) {
      return res.json({
        isLinked: true,
        userId: existingUser._id.toString()
      });
    }

    return res.json({
      isLinked: false,
      userId: null
    });

  } catch (error) {
    console.error('Check wallet error:', error);
    res.status(500).json({ error: 'Server error during wallet check' });
  }
});

// @route   POST /api/auth/link-wallet
// @desc    Link wallet address to existing email account
// @access  Private
router.post('/link-wallet', [
  auth,
  body('walletAddress').isEthereumAddress()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { walletAddress } = req.body;
    const userId = req.user.id;

    // Check if wallet is already linked to another account (excluding empty strings)
    const existingWalletUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      _id: { $ne: userId },
      $and: [
        { walletAddress: { $ne: "" } },
        { walletAddress: { $ne: null } }
      ]
    });
    
    if (existingWalletUser) {
      return res.status(400).json({ error: 'Wallet is already linked to another account' });
    }

    // Update user with wallet address
    const user = await User.findByIdAndUpdate(
      userId,
      { walletAddress: walletAddress.toLowerCase() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        profile: user.profile,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Wallet linking error:', error);
    res.status(500).json({ error: 'Server error during wallet linking' });
  }
});

// @route   GET /api/auth/user/:userId
// @desc    Get user by ID (for wallet switching)
// @access  Public (in development - should be protected in production)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/auth/wallet-switch
// @desc    Switch to user account that owns the connected wallet
// @access  Public (in development - should be protected in production)
router.post('/wallet-switch', async (req, res) => {
  try {
    const { userId, walletAddress } = req.body;
    
    // Find the user and verify they own this wallet
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: 'Wallet address does not match user account' });
    }
    
    // Generate JWT token for the user
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin
      }
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        
        res.json({
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            walletAddress: user.walletAddress,
            isAdmin: user.isAdmin
          }
        });
      }
    );
  } catch (error) {
    console.error('Wallet switch error:', error);
    res.status(500).json({ error: 'Server error during wallet switch' });
  }
});

module.exports = router;
