import UserModel from "./models/User";
import MechanicModel from "./models/Mechanic";
import ServiceRequestModel from "./models/ServiceRequest";
import RatingModel from "./models/Rating";

// ─── USERS ─────────────────────────────

export async function getUser(id: string) {
  return await UserModel.findById(id);
}

export async function getUserByEmail(email: string) {
  return await UserModel.findOne({ email });
}

export async function getUserByUsername(username: string) {
  return await UserModel.findOne({ username });
}

export async function createUser(data: any) {
  const user = new UserModel(data);
  return await user.save();
}

export async function updateUser(id: string, data: any) {
  return await UserModel.findByIdAndUpdate(id, data, { new: true });
}

// ─── MECHANICS ─────────────────────────

export async function createMechanic(data: any) {
  const mechanic = new MechanicModel(data);
  return await mechanic.save();
}

export async function getMechanicByUserId(userId: string) {
  return await MechanicModel.findOne({ userId });
}

export async function getMechanicById(id: string) {
  return await MechanicModel.findById(id);
}

export async function updateMechanic(id: string, data: any) {
  return await MechanicModel.findByIdAndUpdate(id, data, { new: true });
}

// Simple version (can improve later with geo queries)
export async function getNearbyMechanics(lat: number, lng: number) {
  return await MechanicModel.find();
}

// ─── SERVICE REQUESTS ─────────────────

export async function createServiceRequest(data: any) {
  const request = new ServiceRequestModel(data);
  return await request.save();
}

export async function getServiceRequest(id: string) {
  return await ServiceRequestModel.findById(id);
}

export async function updateServiceRequest(id: string, data: any) {
  return await ServiceRequestModel.findByIdAndUpdate(id, data, {
    new: true,
  });
}

// ─── ACTIVE REQUESTS ─────────────────

export async function getActiveRequestForCustomer(customerId: string) {
  return await ServiceRequestModel.findOne({
    customerId,
    status: { $in: ["pending", "accepted", "in_progress"] },
  });
}

export async function getActiveRequestForMechanic(mechanicId: string) {
  return await ServiceRequestModel.findOne({
    mechanicId,
    status: { $in: ["pending", "accepted", "in_progress"] },
  });
}

// ─── HISTORY ─────────────────────────

export async function getRequestHistory(customerId: string) {
  return await ServiceRequestModel.find({ customerId }).sort({
    createdAt: -1,
  });
}

export async function getMechanicJobHistory(mechanicId: string) {
  return await ServiceRequestModel.find({ mechanicId }).sort({
    createdAt: -1,
  });
}

// ─── RATINGS ─────────────────────────

export async function createRating(data: any) {
  const rating = new RatingModel(data);
  return await rating.save();
}