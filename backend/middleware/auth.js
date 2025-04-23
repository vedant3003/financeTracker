const User = require("../models/User");
const AccessControl = require("../models/AccessControl");

// Middleware to check if user is authenticated
const isAuthenticated = async (req, res, next) => {
  const { user_id, password } = req.headers;

  if (!user_id || !password) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await User.findOne({ user_id, password });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Middleware to check if user is an admin
const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

// Middleware to check if user has access to a specific user's data
const hasAccessToUser = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const targetUserId = req.params.userid;
  const requestingUserId = req.user.user_id;

  // If user is accessing their own data, allow it
  if (targetUserId === requestingUserId) {
    return next();
  }

  // If user is an admin, allow access to any user
  if (req.user.role === "admin") {
    return next();
  }

  // If user is a viewer, check if they have access to the target user
  if (req.user.role === "viewer") {
    try {
      const accessControl = await AccessControl.findOne({
        viewer_id: requestingUserId,
        target_user_id: targetUserId,
      });

      if (!accessControl) {
        return res
          .status(403)
          .json({ error: "You don't have access to this user's data" });
      }

      // Check if access has expired
      if (accessControl.expires_at && new Date() > accessControl.expires_at) {
        return res
          .status(403)
          .json({ error: "Your access to this user's data has expired" });
      }

      // Attach access control info to request for further checks
      req.accessControl = accessControl;
      return next();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Default deny access
  return res.status(403).json({ error: "Access denied" });
};

// Middleware to check if user has write access to a specific user's data
const hasWriteAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const targetUserId = req.params.userid;
  const requestingUserId = req.user.user_id;

  // If user is accessing their own data, allow it
  if (targetUserId === requestingUserId && req.user.role !== "viewer") {
    return next();
  }

  // If user is an admin, allow access to any user
  if (req.user.role === "admin") {
    return next();
  }

  // If user is a regular user, check if they're trying to manage a viewer associated with them
  if (req.user.role === "user") {
    try {
      // Check if the target user is a viewer associated with this user
      const accessControl = await AccessControl.findOne({
        viewer_id: targetUserId,
        target_user_id: requestingUserId,
      });

      if (accessControl) {
        return next();
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Viewers never have write access to other users' data
  if (req.user.role === "viewer") {
    return res
      .status(403)
      .json({ error: "Viewers don't have write access to user data" });
  }

  // Default deny access
  return res.status(403).json({ error: "Write access denied" });
};

module.exports = {
  isAuthenticated,
  isAdmin,
  hasAccessToUser,
  hasWriteAccess,
};
