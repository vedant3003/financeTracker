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

router.get("/:userid", isAuthenticated, hasAccessToUser, async (req, res) => {
  const category_id = req.body.category_id;
  const user_id = req.params.userid;

  try {
    // If viewer has access to specific categories only
    const viewerRestrictions =
      req.user.role === "viewer" &&
      req.accessControl &&
      req.accessControl.allowed_categories &&
      req.accessControl.allowed_categories.length > 0;

    // If viewer with category restrictions is trying to access a category they don't have access to
    if (
      viewerRestrictions &&
      category_id &&
      !req.accessControl.allowed_categories.includes(category_id.toString())
    ) {
      return res
        .status(403)
        .json({ error: "You don't have access to this category" });
    }

    // If category_id is provided, get transactions for that category
    if (category_id) {
      const transactions = await Transaction.find({ user_id, category_id });
      return res.json(transactions);
    }

    // If no category_id, get all transactions the user has access to
    let query = { user_id };

    // If viewer with restrictions, only get transactions from allowed categories
    if (viewerRestrictions) {
      query.category_id = { $in: req.accessControl.allowed_categories };
    }

    const transactions = await Transaction.find(query);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:userid", isAuthenticated, hasWriteAccess, async (req, res) => {
  const { category_id, amount, description } = req.body;
  const user_id = req.params.userid;
  try {
    // Find the user to check their role
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Viewers cannot have their own transactions
    if (user.role === "viewer") {
      return res
        .status(403)
        .json({ error: "Viewers cannot have their own transactions" });
    }
    const transaction = new Transaction({
      user_id: user_id,
      category_id: category_id,
      amount: amount,
      description: description,
    });
    await transaction.save();
    // edit the budget
    const budget = await Budget.findOne({ user_id, category_id });
    budget.spent += amount;
    await budget
      .save()
      .then(() => console.log("Budget updated"))
      .catch((err) => console.log("Error updating budget", err));

    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete(
  "/:userid/:transactionid",
  isAuthenticated,
  hasWriteAccess,
  async (req, res) => {
    const { userid, transactionid } = req.params;
    try {
      const transaction = await Transaction.findById(transactionid);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      const category_id = transaction.category_id;
      const amount = transaction.amount;
      const budget = await Budget.findOne({ user_id: userid, category_id });
      budget.spent -= amount;
      await budget.save();
      await Transaction.findByIdAndDelete(transactionid);
      res.json({ message: "Transaction deleted" });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

module.exports = router;
