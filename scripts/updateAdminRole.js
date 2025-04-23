const mongoose = require("mongoose");
require("dotenv").config();

// Import the User model
const User = require("../models/User");

// Connect to MongoDB
mongoose.connect(
  "mongodb+srv://prakharb2k6:" +
    process.env.MONGOPASS +
    "@cluster0.kjjpy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

// Function to update admin user role
async function updateAdminRole() {
  try {
    // Find the admin user
    const adminUser = await User.findOne({ user_id: "admin" });
    
    if (!adminUser) {
      console.log("Admin user not found!");
      mongoose.disconnect();
      return;
    }
    
    // Update the role to admin
    adminUser.role = "admin";
    await adminUser.save();
    
    console.log("Admin user role updated successfully!");
    console.log("Updated user:", adminUser);
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (error) {
    console.error("Error updating admin user role:", error);
    mongoose.disconnect();
  }
}

// Run the function
updateAdminRole();
