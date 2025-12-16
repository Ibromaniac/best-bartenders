const mongoose = require("mongoose");

const bartenderSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  password: String,
  experience: String,
  skills: String,
  rate: String,
  street: String,
  apt: String,
  city: String,
  state: String,
  zip: String,
  licenseNumber: String,
  profile_photo: String,
  bartending_license: String,
  government_id: String,
  approved: { type: Boolean, default: false }
});

module.exports = mongoose.model("Bartender", bartenderSchema);