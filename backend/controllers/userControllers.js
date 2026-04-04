const User = require("../models/userModel");
const OTP = require("../models/otpModel");
const generateToken = require("../config/generateToken");
const { sendOTPEmail } = require("../config/sendEmail");

// @desc    Register new user & Generate OTP
// @route   POST /api/user/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: "Please enter all the fields" });
    }

    const userExists = await User.findOne({ $or: [{ email }, { phone }] });

    if (userExists) {
        return res.status(400).json({ message: "User with email or phone already exists" });
    }

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
        identifier: email,
        code: otpCode,
        type: "register",
    });

    // Send OTP via email
    await sendOTPEmail(email, otpCode, "register");

    res.status(200).json({
        message: "OTP sent successfully to email",
        email,
        otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
    });
};

// @desc    Verify OTP and Create User
// @route   POST /api/user/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    const { name, email, phone, password, avatar, otpCode } = req.body;

    const validOtp = await OTP.findOne({
        identifier: email,
        code: otpCode,
        type: "register",
    });

    if (!validOtp) {
        return res.status(400).json({ message: "Invalid or Expired OTP" });
    }

    const user = await User.create({
        name,
        email,
        phone,
        password,
        avatar,
        isVerified: true,
    });

    if (user) {
        // delete otp after successful registration
        await OTP.deleteOne({ _id: validOtp._id });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            token: generateToken(user._id),
        });
    } else {
        return res.status(400).json({ message: "Failed to create user" });
    }
};

// @desc    Resend OTP
// @route   POST /api/user/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
    const { email, type } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    // Delete any existing OTPs for this identifier and type
    await OTP.deleteMany({ identifier: email, type: type || "register" });

    // Generate new 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
        identifier: email,
        code: otpCode,
        type: type || "register",
    });

    // Send OTP via email
    await sendOTPEmail(email, otpCode, type || "register");

    res.status(200).json({
        message: "OTP resent successfully",
        otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
    });
};

// @desc    Auth the user
// @route   POST /api/user/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            about: user.about,
            token: generateToken(user._id),
        });
    } else {
        return res.status(401).json({ message: "Invalid Email or Password" });
    }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/user/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found with this email" });
    }

    // Delete old reset OTPs
    await OTP.deleteMany({ identifier: email, type: "reset" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
        identifier: email,
        code: otpCode,
        type: "reset",
    });

    // Send OTP via email
    await sendOTPEmail(email, otpCode, "reset");

    res.status(200).json({
        message: "Password reset OTP sent to email",
        otpCode: process.env.NODE_ENV === "development" ? otpCode : undefined,
    });
};

// @desc    Reset Password with OTP
// @route   POST /api/user/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otpCode, newPassword } = req.body;

    if (!email || !otpCode || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const validOtp = await OTP.findOne({
        identifier: email,
        code: otpCode,
        type: "reset",
    });

    if (!validOtp) {
        return res.status(400).json({ message: "Invalid or Expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: validOtp._id });

    res.status(200).json({ message: "Password reset successful. Please login." });
};

// @desc    Get all Users
// @route   GET /api/user?search=
// @access  Private
const allUsers = async (req, res) => {
    const keyword = req.query.search
        ? {
            $or: [
                { name: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } },
                { phone: { $regex: req.query.search, $options: "i" } },
            ],
        }
        : {};

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find(keyword)
        .find({ _id: { $ne: req.user._id } })
        .select("-password")
        .skip(skip)
        .limit(limit);
    res.send(users);
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.avatar = req.body.avatar || user.avatar;
        user.about = req.body.about || user.about;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            about: updatedUser.about,
            token: generateToken(updatedUser._id),
        });
    } else {
        return res.status(404).json({ message: "User not found" });
    }
};

// @desc    Toggle Block User
// @route   PUT /api/user/block
// @access  Private
const toggleBlockUser = async (req, res) => {
    const { userId } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user.blocked) user.blocked = [];
        const isBlocked = user.blocked.includes(userId);

        if (isBlocked) {
            user.blocked = user.blocked.filter(id => id.toString() !== userId.toString());
        } else {
            user.blocked.push(userId);
        }

        await user.save();
        res.status(200).json({ message: isBlocked ? "User Unblocked" : "User Blocked", blocked: user.blocked });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    verifyOTP,
    resendOTP,
    authUser,
    forgotPassword,
    resetPassword,
    allUsers,
    updateProfile,
    toggleBlockUser,
};
