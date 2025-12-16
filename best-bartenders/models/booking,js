const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    bartenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bartender"
    },
    eventType: String,
    eventDate: String,
    eventTime: String,
    location: String,
    status: {
      type: String,
      default: "Pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);