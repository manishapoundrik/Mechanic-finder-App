import mongoose from "mongoose";

const mechanicSchema = new mongoose.Schema({
  userId: String,
  shopName: String,
  specialty: String,
  phone: String,
  status: { type: String, default: "offline" },
  rating: { type: String, default: "0.0" },
  totalJobs: { type: Number, default: 0 },
  workingHours: String,
  latitude: Number,
  longitude: Number,
  address: String,
});

const Mechanic = mongoose.model("Mechanic", mechanicSchema);

export default Mechanic;