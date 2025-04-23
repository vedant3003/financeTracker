const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const Budget = require("../models/Budget");
const AccessControl = require("../models/AccessControl");
const {
  isAuthenticated,
  isAdmin,
  hasAccessToUser,
  hasWriteAccess,
} = require("../middleware/auth");

// Get all users (admin only)
router.get("/", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify user credentials and return role information
router.post("/login", async (req, res) => {
  const { user_id, password } = req.body;

  try {
    // Check if it's an existing user
    const user = await User.findOne({ user_id, password });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return user info with role
    const userResponse = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
    };

    res.status(200).json(userResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy verify endpoint for backward compatibility
router.get("/verify", async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const user = await User.findOne({ user_id, password });

    if (user && user.role === "admin") {
      res.status(200).json({ admin: true });
    } else if (user) {
      res.status(200).json({ admin: false, user });
    } else {
      res.status(401).json({ error: "Invalid credentials", admin: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user
router.post("/", async (req, res) => {
  const { user_id, name, email, password, balance, role } = req.body;
  try {
    // Check if role is being set to admin, which requires admin authentication
    if (role === "admin") {
      // Get credentials from headers for admin check
      const { user_id: admin_id, password: admin_password } = req.headers;

      // Verify admin credentials
      const adminUser = await User.findOne({
        user_id: admin_id,
        password: admin_password,
        role: "admin",
      });

      if (!adminUser) {
        return res
          .status(403)
          .json({ error: "Admin credentials required to create admin users" });
      }
    }

    // Create the user with specified role or default to 'user'
    const user = new User({
      user_id,
      name,
      email,
      password,
      balance,
      role: role || "user",
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create admin user (admin only)
router.post("/admin", isAuthenticated, isAdmin, async (req, res) => {
  const { user_id, name, email, password, balance } = req.body;
  try {
    const user = new User({
      user_id,
      name,
      email,
      password,
      balance,
      role: "admin",
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Create viewer user (admin or regular user)
router.post("/viewer", isAuthenticated, async (req, res) => {
  const { user_id, name, email, password } = req.body;
  try {
    // Only admin or regular users can create viewers
    if (req.user.role === "viewer") {
      return res
        .status(403)
        .json({ error: "Viewers cannot create other viewers" });
    }

    // Create the viewer user with 0 balance (viewers don't have their own budget)
    const user = new User({
      user_id,
      name,
      email,
      password,
      balance: 0, // Viewers always have 0 balance
      role: "viewer",
    });

    await user.save();

    // If a regular user is creating a viewer, automatically grant access to the creator's data
    if (req.user.role === "user") {
      const accessControl = new AccessControl({
        viewer_id: user_id,
        target_user_id: req.user.user_id,
        access_level: "read", // Viewers can only read, not write
        allowed_categories: [],
        expires_at: null,
      });

      await accessControl.save();
      res.status(201).json({ user, accessControl });
    } else {
      res.status(201).json(user);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// for each user, get the categories -> for each category, get the limit data, and then, the transactions
/*
  {
    user : {
      userData
    },
    categories : {
      categoryId1 : {
        CategoryData,
        Limit : {
          limitData
        },
        Transactions : [
          transaction1,
          transaction2,
          ...
        ]
      }
    }
  }
*/
// Get user data with categories, budgets, and transactions
router.get("/:userid", isAuthenticated, hasAccessToUser, async (req, res) => {
  const userId = req.params.userid;
  try {
    const user = await User.findOne({ user_id: userId })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const categories = await Category.find({ user_id: userId });
    const userCategories = {};

    // If viewer has access to specific categories only
    const viewerRestrictions =
      req.user.role === "viewer" &&
      req.accessControl &&
      req.accessControl.allowed_categories &&
      req.accessControl.allowed_categories.length > 0;

    for (let category of categories) {
      const category_id = category._id;

      // Skip categories the viewer doesn't have access to
      if (
        viewerRestrictions &&
        !req.accessControl.allowed_categories.includes(category_id.toString())
      ) {
        continue;
      }

      const limit = await Budget.findOne({ user_id: userId, category_id });
      const transactions = await Transaction.find({
        user_id: userId,
        category_id,
      });

      userCategories[category_id] = {
        CategoryData: category,
        Limit: limit,
        Transactions: transactions,
      };
    }

    res.json({ user, categories: userCategories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user (admin or self only)
router.delete("/:userid", isAuthenticated, hasWriteAccess, async (req, res) => {
  const userId = req.params.userid;
  try {
    // Check if user exists
    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user and all related data
    await User.deleteOne({ user_id: userId });
    await Category.deleteMany({ user_id: userId });
    await Budget.deleteMany({ user_id: userId });
    await Transaction.deleteMany({ user_id: userId });

    // Also delete any access control entries for this user
    await AccessControl.deleteMany({
      $or: [{ viewer_id: userId }, { target_user_id: userId }],
    });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Grant viewer access to a user (admin or target user)
router.post(
  "/access/:viewerid/:targetuserid",
  isAuthenticated,
  async (req, res) => {
    const { viewerid, targetuserid } = req.params;
    const { access_level, allowed_categories, expires_at } = req.body;

    try {
      // Check if the requesting user is admin or the target user
      if (req.user.role !== "admin" && req.user.user_id !== targetuserid) {
        return res
          .status(403)
          .json({ error: "Only admins or the target user can grant access" });
      }

      // Verify both users exist
      const viewer = await User.findOne({ user_id: viewerid });
      if (!viewer) {
        return res.status(404).json({ error: "Viewer user not found" });
      }

      const targetUser = await User.findOne({ user_id: targetuserid });
      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      // Regular users can only grant read access, not read_write
      if (req.user.role === "user" && access_level === "read_write") {
        return res.status(403).json({
          error: "Regular users can only grant read access to viewers",
        });
      }

      // Ensure viewer has viewer role
      if (viewer.role !== "viewer") {
        // Update the user to have viewer role
        viewer.role = "viewer";
        await viewer.save();
      }

      // Check if access control already exists
      let accessControl = await AccessControl.findOne({
        viewer_id: viewerid,
        target_user_id: targetuserid,
      });

      if (accessControl) {
        // Update existing access control
        accessControl.access_level = access_level || accessControl.access_level;
        accessControl.allowed_categories =
          allowed_categories || accessControl.allowed_categories;
        accessControl.expires_at = expires_at || accessControl.expires_at;
        await accessControl.save();
      } else {
        // Create new access control
        accessControl = new AccessControl({
          viewer_id: viewerid,
          target_user_id: targetuserid,
          access_level: access_level || "read",
          allowed_categories: allowed_categories || [],
          expires_at: expires_at || null,
        });
        await accessControl.save();
      }

      res.status(201).json(accessControl);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Revoke viewer access (admin or target user)
router.delete(
  "/access/:viewerid/:targetuserid",
  isAuthenticated,
  async (req, res) => {
    const { viewerid, targetuserid } = req.params;

    try {
      // Check if the requesting user is admin or the target user
      if (req.user.role !== "admin" && req.user.user_id !== targetuserid) {
        return res
          .status(403)
          .json({ error: "Only admins or the target user can revoke access" });
      }

      const result = await AccessControl.deleteOne({
        viewer_id: viewerid,
        target_user_id: targetuserid,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Access control not found" });
      }

      res.json({ message: "Access revoked successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get all access controls for a viewer (admin or self only)
router.get("/access/viewer/:viewerid", isAuthenticated, async (req, res) => {
  const viewerid = req.params.viewerid;

  // Only allow admin or the viewer themselves to see this
  if (req.user.role !== "admin" && req.user.user_id !== viewerid) {
    return res
      .status(403)
      .json({ error: "Not authorized to view this information" });
  }

  try {
    const accessControls = await AccessControl.find({ viewer_id: viewerid });

    // Get details of all target users
    const accessDetails = [];
    for (const access of accessControls) {
      const targetUser = await User.findOne({ user_id: access.target_user_id })
        .select("user_id name email")
        .lean();

      if (targetUser) {
        accessDetails.push({
          access,
          targetUser,
        });
      }
    }

    res.json(accessDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all viewers who have access to a user (admin or self only)
router.get(
  "/access/target/:targetuserid",
  isAuthenticated,
  async (req, res) => {
    const targetuserid = req.params.targetuserid;

    // Only allow admin or the target user themselves to see this
    if (req.user.role !== "admin" && req.user.user_id !== targetuserid) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this information" });
    }

    try {
      const accessControls = await AccessControl.find({
        target_user_id: targetuserid,
      });

      // Get details of all viewers
      const accessDetails = [];
      for (const access of accessControls) {
        const viewer = await User.findOne({ user_id: access.viewer_id })
          .select("user_id name email role")
          .lean();

        if (viewer) {
          accessDetails.push({
            access,
            viewer,
          });
        }
      }

      res.json(accessDetails);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
