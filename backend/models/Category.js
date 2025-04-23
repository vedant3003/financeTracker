const mongoose = require("mongoose");

// Category.js

const categorySchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      ref: "User",
      required: true,
    },
    category_name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying by user
categorySchema.index({ user_id: 1, category_name: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
