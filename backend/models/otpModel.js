const mongoose = require("mongoose");

const otpSchema = mongoose.Schema(
    {
        identifier: { type: String, required: true }, // email or phone
        code: { type: String, required: true },
        type: { type: String, required: true, enum: ['register', 'reset'] }, // For what purpose
        createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes (300 seconds)
    }
);

const OTP = mongoose.model("OTP", otpSchema);
module.exports = OTP;
