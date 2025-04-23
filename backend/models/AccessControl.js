const mongoose = require("mongoose");

const accessControlSchema = new mongoose.Schema(
  {
    // The viewer user_id who is granted access
    viewer_id: {
      type: String,
      ref: "User",
      required: true,
    },
    // The user_id whose data the viewer can access
    target_user_id: {
      type: String,
      ref: "User",
      required: true,
    },
    // What level of access the viewer has
    access_level: {
      type: String,
      enum: ["read", "read_write"],
      default: "read",
    },
    // Optional: specific categories the viewer can access (empty means all)
    allowed_categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }],
    // When this access permission expires (null means never)
    expires_at: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of viewer-target pairs
accessControlSchema.index({ viewer_id: 1, target_user_id: 1 }, { unique: true });

module.exports = mongoose.model("AccessControl", accessControlSchema);
