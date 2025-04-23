const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
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
  time_stamp: {
    type: Date,
    default: Date.now,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
