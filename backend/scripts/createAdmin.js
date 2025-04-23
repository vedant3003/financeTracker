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

// Function to create admin user
async function createAdminUser() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ user_id: "admin" });
    
    if (existingAdmin) {
      console.log("Admin user already exists!");
      
      // Update role if needed
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log("Updated existing user to admin role");
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        user_id: "admin",
        name: "Administrator",
        email: "admin@example.com",
        password: "admin", // In production, use a secure password
        role: "admin",
        balance: 0
      });
      
      await adminUser.save();
      console.log("Admin user created successfully!");
    }
    
    // Disconnect from MongoDB
    mongoose.disconnect();
  } catch (error) {
    console.error("Error creating admin user:", error);
    mongoose.disconnect();
  }
}

// Run the function
createAdminUser();
