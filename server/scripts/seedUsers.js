import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const demoUsers = [
  {
    name: "IssueFlow Demo Admin",
    email: "demo.admin@issueflow.local",
    password: "IssueFlowDemo2026!",
    role: "admin",
  },
  {
    name: "Aarav Sharma",
    email: "aarav@issueflow.local",
    password: "IssueFlowDemo2026!",
    role: "user",
  },
  {
    name: "Priya Deshmukh",
    email: "priya@issueflow.local",
    password: "IssueFlowDemo2026!",
    role: "user",
  },
  {
    name: "Rohan Mehta",
    email: "rohan@issueflow.local",
    password: "IssueFlowDemo2026!",
    role: "user",
  },
];

async function seedUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Add it to server/.env.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  let created = 0;
  let skipped = 0;

  for (const demoUser of demoUsers) {
    const email = demoUser.email.toLowerCase();
    const existingUser = await User.findOne({ email }).select("_id");

    if (existingUser) {
      console.log(`Skipped existing user: ${email}`);
      skipped += 1;
      continue;
    }

    const passwordHash = await bcrypt.hash(demoUser.password, 12);

    await User.create({
      name: demoUser.name,
      email,
      passwordHash,
      role: demoUser.role,
      isActive: true,
    });

    console.log(`Created ${demoUser.role}: ${email}`);
    created += 1;
  }

  console.log(`\nSeed complete. Created: ${created}; skipped: ${skipped}.`);
  console.log("Demo passwords are documented in the project's README.");
}

seedUsers()
  .catch((error) => {
    console.error("Failed to seed demo users:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
