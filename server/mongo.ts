import mongoose from "mongoose";
import "dotenv/config";

export async function connectMongo() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mechanic-finder";

    await mongoose.connect(uri);

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
