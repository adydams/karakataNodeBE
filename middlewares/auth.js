// middleware/auth.js
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // if you have index export, else require model path
const UserModel = require('../models/userModel');
const Role = require('../models/roleModel');
exports.auth = async (req, res, next) => {
  try {
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
}catch (err) {
  console.error("Auth middleware error:", err);
  return res.status(500).json({ success: false, message: 'Server error in authentication' });
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
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      include: [
        {
           model: Role,
           as: "role",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.user = {
      id: user.id,
      roleId: user.roleId,
      role: user.role?.name,
      email: user.email,
      name: user.name,
    };
    //console.log("Authenticated User:", req.user);

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
/**
 * Role-based access control
 * @param  {...string} allowedRoles Roles allowed to access the endpoint
 */
exports.authorizeRole = (...allowedRoles) => {
   return (req, res, next) => {
    if (!req.user) {
     // console.log("Authorization failed: No user found in request");
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
console.log("Authorization check:", {user:req.user, userId: req.user.id, userRole: req.user.role, allowedRoles });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient rights' });
    }

    next();
  };
};


/**
 * Middleware: Check user permissions (fine-grained)
 * Example: checkPermissions("admin:create", "user:view")
 */
exports.checkPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user found" });
    }

    // Assuming req.user.permissions is an array like ["admin:create", "offerletter:view"]
    const userPermissions = req.user.permissions || [];

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Missing required permissions",
        requiredPermissions,
      });
    }

    next();
  };
};
