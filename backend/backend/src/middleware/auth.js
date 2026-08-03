import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired login token",
    });
  }
}

export function adminOnly(req, res, next) {
  const adminEmail = String(
    process.env.ADMIN_EMAIL || ""
  )
    .trim()
    .toLowerCase();

  const userEmail = String(req.user?.email || "")
    .trim()
    .toLowerCase();

  if (!adminEmail) {
    return res.status(500).json({
      message: "Admin email is not configured",
    });
  }

  if (userEmail !== adminEmail) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
}