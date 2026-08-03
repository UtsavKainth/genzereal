import mongoose from "mongoose";

export async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    console.log("🔄 Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`📍 Host: ${mongoose.connection.host}`);
    console.log(`📂 Database: ${mongoose.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed");
    console.error(err.message);
    process.exit(1);
  }
}