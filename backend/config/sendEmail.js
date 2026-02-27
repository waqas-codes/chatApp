const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send OTP via email
 * @param {string} to - recipient email
 * @param {string} otp - the OTP code
 * @param {string} type - 'register' or 'reset'
 */
const sendOTPEmail = async (to, otp, type = "register") => {
    const subject =
        type === "register"
            ? "WhatsApp Clone - Verify Your Account"
            : "WhatsApp Clone - Password Reset Code";

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #25D366, #128C7E); padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">WhatsApp Clone</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
          ${type === "register" ? "Account Verification" : "Password Reset"}
        </p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <p style="color: #333; font-size: 16px; margin: 0 0 24px;">
          ${type === "register"
            ? "Use the code below to verify your account:"
            : "Use the code below to reset your password:"}
        </p>
        <div style="background: #f0fdf4; border: 2px dashed #25D366; border-radius: 12px; padding: 20px; display: inline-block;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #128C7E;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 13px; margin: 24px 0 0;">
          This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

    const mailOptions = {
        from: `"WhatsApp Clone" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP sent to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send OTP to ${to}:`, error.message);
        // Fallback: log to console so development still works
        console.log(`[FALLBACK] OTP for ${to} is: ${otp}`);
        return false;
    }
};

module.exports = { sendOTPEmail };
