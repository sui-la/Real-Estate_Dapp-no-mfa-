const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ [ERROR] Auth middleware: No token provided');
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.user.id).select('-password');

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
