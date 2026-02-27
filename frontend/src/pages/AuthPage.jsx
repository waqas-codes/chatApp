import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Lock, Mail, Phone, User as UserIcon, KeyRound } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showOtp, setShowOtp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetForm, setShowResetForm] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const { setUser } = ChatState();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        otpCode: '',
        newPassword: '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const startCooldown = () => {
        setOtpCooldown(60);
        const interval = setInterval(() => {
            setOtpCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/user/login', {
                email: formData.email,
                password: formData.password,
            });
            toast.success('Login Successful');
            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            navigate('/chats');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error occurred');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/user/register', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });
            toast.success(data.message);
            if (data.otpCode) {
                alert(`[DEV MODE] Your OTP is: ${data.otpCode}`);
                setFormData(prev => ({ ...prev, otpCode: data.otpCode }));
            }
            setShowOtp(true);
            startCooldown();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error Occurred');
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/user/verify-otp', {
                ...formData,
            });
            toast.success('Registration Successful');
            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            navigate('/chats');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        }
    };

    const handleResendOtp = async () => {
        try {
            const { data } = await api.post('/user/resend-otp', {
                email: formData.email,
                type: showForgotPassword ? 'reset' : 'register',
            });
            toast.success('OTP resent!');
            if (data.otpCode) {
                alert(`[DEV MODE] Your OTP is: ${data.otpCode}`);
                setFormData(prev => ({ ...prev, otpCode: data.otpCode }));
            }
            startCooldown();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/user/forgot-password', {
                email: formData.email,
            });
            toast.success(data.message);
            if (data.otpCode) {
                alert(`[DEV MODE] Your OTP is: ${data.otpCode}`);
            }
            setShowResetForm(true);
            startCooldown();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error occurred');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/user/reset-password', {
                email: formData.email,
                otpCode: formData.otpCode,
                newPassword: formData.newPassword,
            });
            toast.success(data.message);
            setShowForgotPassword(false);
            setShowResetForm(false);
            setIsLogin(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error occurred');
        }
    };

    const getTitle = () => {
        if (showForgotPassword) {
            return showResetForm ? 'Reset Password' : 'Forgot Password';
        }
        if (isLogin) return 'Welcome back';
        if (showOtp) return 'Verify OTP';
        return 'Create an account';
    };

    const getSubtitle = () => {
        if (showForgotPassword) {
            return showResetForm ? 'Enter the OTP and your new password' : 'Enter your email to receive a reset code';
        }
        if (isLogin) return 'Sign in to connect with friends';
        if (showOtp) return 'Check your email/phone for the secure code (also check server console)';
        return 'Join WhatsApp Clone today';
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl relative overflow-hidden">
                {/* Green top bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-400 to-green-600"></div>

                <div className="text-center pt-2">
                    <h2 className="text-3xl font-extrabold text-gray-900">{getTitle()}</h2>
                    <p className="mt-2 text-sm text-gray-600">{getSubtitle()}</p>
                </div>

                {/* Forgot Password Flow */}
                {showForgotPassword ? (
                    !showResetForm ? (
                        <form className="mt-6 space-y-4" onSubmit={handleForgotPassword}>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                            >
                                Send Reset OTP
                            </button>
                        </form>
                    ) : (
                        <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
                            <div className="relative">
                                <input
                                    name="otpCode"
                                    type="text"
                                    maxLength={6}
                                    required
                                    className="appearance-none rounded-lg text-center tracking-widest relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 text-2xl focus:outline-none focus:ring-green-500 focus:border-green-500 font-bold"
                                    placeholder="000000"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="New Password"
                                    onChange={handleChange}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                            >
                                Reset Password
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={otpCooldown > 0}
                                className="w-full text-sm text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
                            >
                                {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                            </button>
                        </form>
                    )
                ) : isLogin ? (
                    /* Login form */
                    <form className="mt-6 space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="Email address"
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    placeholder="Password"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                        >
                            Sign in
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShowForgotPassword(true); setShowResetForm(false); }}
                            className="w-full text-sm text-green-600 hover:text-green-700 transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </form>
                ) : !showOtp ? (
                    /* Register form */
                    <form className="mt-6 space-y-4" onSubmit={handleRegister}>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="name"
                                type="text"
                                required
                                className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                placeholder="Full Name"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                placeholder="Email address"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="phone"
                                type="tel"
                                required
                                className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                placeholder="Phone Number"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                className="appearance-none rounded-lg relative block w-full pl-10 px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                placeholder="Password"
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                        >
                            Request OTP
                        </button>
                    </form>
                ) : (
                    /* OTP Verification form */
                    <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    name="otpCode"
                                    type="text"
                                    maxLength={6}
                                    required
                                    className="appearance-none rounded-lg text-center tracking-widest relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 text-2xl focus:outline-none focus:ring-green-500 focus:border-green-500 font-bold"
                                    placeholder="000000"
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150"
                        >
                            Verify & Register
                        </button>

                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={otpCooldown > 0}
                            className="w-full text-sm text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
                        >
                            {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                        </button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setShowOtp(false);
                            setShowForgotPassword(false);
                            setShowResetForm(false);
                        }}
                        className="text-sm font-medium text-green-600 hover:text-green-500 transition-colors"
                    >
                        {isLogin || showForgotPassword
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
