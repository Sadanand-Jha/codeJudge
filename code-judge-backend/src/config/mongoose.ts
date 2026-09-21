// @ts-nocheck
// MongoDB/Mongoose cached connection for Vercel Serverless
// -------------------------------------------------------
// Install first if you plan to use MongoDB:
//   npm i mongoose
//   npm i -D @types/mongoose
//
// This pattern reuses the existing mongoose connection across
// serverless invocations via globalThis cache.
// Check `mongoose.connection.readyState` before creating new connection.
// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
//
// Usage in your code:
//   import { connectDB } from "./config/mongoose.js";
//   await connectDB();
//   // then use mongoose models as usual

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";

if (!MONGODB_URI) {
  console.warn("⚠️ MONGODB_URI is not defined — mongoose will not connect");
}

// Global cache for serverless
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend NodeJS global
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global._mongooseCache as MongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  // If connection is already open (readyState 1), reuse it
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log("✅ Using cached MongoDB connection (readyState 1)");
    return cached.conn;
  }

  // If currently connecting (readyState 2), wait for it
  if (mongoose.connection.readyState === 2 && cached.promise) {
    console.log("⏳ MongoDB connecting... awaiting existing promise");
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // If no URI, throw
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in environment variables");
  }

  // No existing connection — create new promise
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Disable mongoose buffering for serverless
      // Add other options as needed:
      // maxPoolSize: 5, // Keep small for serverless
    };

    console.log("🔌 Creating new MongoDB connection (serverless cold start)");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log("✅ MongoDB connected");
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Alternative simple helper that directly mirrors the requested pattern:
export async function connectMongoose(): Promise<void> {
  if (mongoose.connection.readyState >= 1) {
    // 1 = connected, 2 = connecting — reuse
    return;
  }
  await mongoose.connect(MONGODB_URI);
}

export default mongoose;
