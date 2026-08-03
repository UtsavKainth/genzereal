import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/token.js";

const publicUser = user => ({ id: user._id, name: user.name, email: user.email, wishlist: user.wishlist || [] });
const event = (req, action) => ({ action, ip: req.ip, userAgent: req.get("user-agent") || "" });

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Account already exists" });
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12), lastLoginAt: new Date(), loginHistory: [event(req, "login")] });
  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").trim().toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return res.status(401).json({ message: "Incorrect email or password" });
  user.lastLoginAt = new Date();
  user.loginHistory.push(event(req, "login"));
  if (user.loginHistory.length > 100) user.loginHistory = user.loginHistory.slice(-100);
  await user.save();
  res.json({ token: signToken(user._id), user: publicUser(user) });
}

export async function logout(req, res) {
  req.user.lastLogoutAt = new Date();
  req.user.loginHistory.push(event(req, "logout"));
  if (req.user.loginHistory.length > 100) req.user.loginHistory = req.user.loginHistory.slice(-100);
  await req.user.save();
  res.json({ message: "Logged out" });
}

export async function me(req, res) { res.json({ user: publicUser(req.user) }); }
