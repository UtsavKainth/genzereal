import mongoose from "mongoose";

const loginEventSchema = new mongoose.Schema({
  action: { type: String, enum: ["login", "logout"], required: true },
  at: { type: Date, default: Date.now },
  ip: String,
  userAgent: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  wishlist: [{ type: Number }],
  loginHistory: [loginEventSchema],
  lastLoginAt: Date,
  lastLogoutAt: Date
}, { timestamps: true });

export default mongoose.model("User", userSchema);
