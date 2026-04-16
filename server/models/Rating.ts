import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  requestId: String,
  customerId: String,
  mechanicId: String,
  rating: Number,
  review: String,
});

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;