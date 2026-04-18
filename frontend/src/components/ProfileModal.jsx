import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Edit2, Check, Loader2 } from 'lucide-react';
import { ChatState } from '../context/ChatProvider';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../utils/avatarUrl';

const ProfileModal = ({ user: profileUser, isOpen, onClose }) => {
    const { user: loggedInUser, setUser } = ChatState();
    const isSelf = profileUser?._id === loggedInUser?._id;

    const [name, setName] = useState(profileUser?.name || '');
    const [about, setAbout] = useState(profileUser?.about || 'Hey there! I am using WhatsApp.');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        setName(profileUser?.name || '');
        setAbout(profileUser?.about || 'Hey there! I am using WhatsApp.');
    }, [profileUser]);



    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type on the client side
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be less than 10MB');
            return;
        }

        try {
            setUploadingAvatar(true);

            const formData = new FormData();
            formData.append('avatar', file);

            const { data } = await api.post('/upload/avatar', formData);

            // Update the user state and localStorage with the new data
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            toast.success('Profile picture updated!');
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload profile picture');
        } finally {
            setUploadingAvatar(false);
            // Reset file input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            const { data } = await api.put('/user/profile', {
                name,
                about,
            });
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            setIsEditing(false);
            setLoading(false);
            toast.success('Profile updated!');
        } catch (error) {
            toast.error('Failed to update profile');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-green-600 h-32 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white hover:bg-black/10 p-1 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <div className="relative group">
                            <img
                                src={getAvatarUrl(profileUser?.avatar)}
                                alt={profileUser?.name}
                                className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
                            />
                            {isSelf && (
                                <>
                                    {/* Hidden file input */}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        {uploadingAvatar ? (
                                            <Loader2 className="text-white w-6 h-6 animate-spin" />
                                        ) : (
                                            <Camera className="text-white w-6 h-6" />
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-16 p-6 space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-900">{profileUser?.name}</h2>
                        <p className="text-sm text-gray-500">{profileUser?.email}</p>
                    </div>

                    <div className="space-y-4">
                        {/* Name Field (Only editable if self) */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-green-600 uppercase tracking-wider">Name</label>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full outline-none text-gray-800"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-gray-800">{profileUser?.name}</span>
                                )}
                                {isSelf && !isEditing && <Edit2 className="w-4 h-4 text-gray-400 cursor-pointer hover:text-green-600" onClick={() => setIsEditing(true)} />}
                            </div>
                        </div>

                        {/* About Field */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-green-600 uppercase tracking-wider">About</label>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                {isEditing ? (
                                    <textarea
                                        className="w-full outline-none text-gray-800 border-none resize-none"
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        rows={1}
                                    />
                                ) : (
                                    <span className="text-gray-800 italic">{profileUser?.about || 'Hey there! I am using WhatsApp.'}</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-green-600 uppercase tracking-wider">Phone</label>
                            <div className="border-b border-gray-100 pb-2">
                                <span className="text-gray-800">{profileUser?.phone}</span>
                            </div>
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex space-x-2">
                            <button
                                onClick={handleUpdate}
                                disabled={loading}
                                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check className="w-5 h-5" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
