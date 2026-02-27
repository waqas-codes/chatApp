const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
    registerUser,
    verifyOTP,
    resendOTP,
    authUser,
    forgotPassword,
    resetPassword,
    allUsers,
    updateProfile,
    toggleBlockUser,
} = require("../controllers/userControllers");

const router = express.Router();

router.route("/").get(protect, allUsers);
router.route("/register").post(registerUser);
router.route("/verify-otp").post(verifyOTP);
router.route("/resend-otp").post(resendOTP);
router.post("/login", authUser);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);
router.route("/profile").put(protect, updateProfile);
router.route("/block").put(protect, toggleBlockUser);

module.exports = router;
