import { ENDPOINT } from '../context/ChatProvider';

const DEFAULT_AVATAR = 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';

/**
 * Build a full avatar URL for display.
 * - If avatar is null/undefined, returns the default placeholder.
 * - If avatar is already a full URL (http/https), returns as-is.
 * - Otherwise (local path like /uploads/avatar-123.png), prepends the backend origin.
 */
export const getAvatarUrl = (avatar) => {
    if (!avatar) return DEFAULT_AVATAR;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `${ENDPOINT}${avatar}`;
};
