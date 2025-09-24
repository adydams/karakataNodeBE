// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // if you have index export, else require model path
const UserModel = require('../models/userModel');

exports.auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach minimal user info
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.user && req.user.role;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

exports.authenticate = async (req, res, next) => {
   const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Optionally fetch full user from DB
      const user = await User.findByPk(decoded.id);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

/**
 * Role-based access control
 * @param  {...string} allowedRoles Roles allowed to access the endpoint
 */
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient rights' });
    }

    next();
  };
};
