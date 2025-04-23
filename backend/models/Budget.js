const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const budgetSchema = new Schema(
  {
    user_id: {
      type: String,
      ref: "User",
      required: true,
    },
    category_id: {
      type: String,
      ref: "Category",
      required: true,
    },
    limit: {
      type: Number,
      required: true,
    },
    spent: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Budget", budgetSchema);
