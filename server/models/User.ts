import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  username: String,
  phone: String,
  role: { type: String, default: "customer" },
  latitude: Number,
  longitude: Number,
});

const User = mongoose.model("User", userSchema);

export default User;