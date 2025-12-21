const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  address: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  profile_photo: { type: String, default: "" }

});

module.exports = mongoose.model("Customer", customerSchema);