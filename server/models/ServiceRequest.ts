import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema({
  customerId: String,
  mechanicId: String,
  customerLatitude: Number,
  customerLongitude: Number,
  description: String,
  vehicleType: String,
  shopPlaceId: String,
  shopName: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);

export default ServiceRequest;