const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('🔍 [DEBUG] Auth middleware: Starting authentication');
    console.log('🔍 [DEBUG] Auth middleware: Headers:', req.headers);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('🔍 [DEBUG] Auth middleware: Token extracted:', token ? 'Token present' : 'No token');
    
    if (!token) {
      console.log('❌ [ERROR] Auth middleware: No token provided');
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    console.log('🔍 [DEBUG] Auth middleware: Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 [DEBUG] Auth middleware: Token decoded:', decoded);
    
    console.log('🔍 [DEBUG] Auth middleware: Looking up user with ID:', decoded.user.id);
    const user = await User.findById(decoded.user.id).select('-password');
    console.log('🔍 [DEBUG] Auth middleware: User found:', user);
    
    if (!user) {
      console.log('❌ [ERROR] Auth middleware: User not found');
      return res.status(401).json({ error: 'Token is not valid' });
    }

    console.log('✅ [SUCCESS] Auth middleware: User authenticated successfully');
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ [ERROR] Auth middleware error:', error);
    console.error('❌ [ERROR] Auth middleware error message:', error.message);
    console.error('❌ [ERROR] Auth middleware error stack:', error.stack);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(401).json({ error: 'Authorization failed' });
  }
};

module.exports = { auth, adminAuth };
