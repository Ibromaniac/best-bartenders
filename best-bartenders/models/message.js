const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    senderRole: {
      type: String,
      enum: ["customer", "bartender"],
      required: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Message", messageSchema);
