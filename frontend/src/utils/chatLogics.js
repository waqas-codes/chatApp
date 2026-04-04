export const getSender = (loggedUser, users) => {
    if (!users || users.length < 2) return "Unknown Sender";
    return users[0]?._id === loggedUser?._id ? users[1]?.name : users[0]?.name;
};

export const getSenderFull = (loggedUser, users) => {
    if (!users || users.length < 2) return users?.[0] || {};
    return users[0]?._id === loggedUser?._id ? users[1] : users[0];
};
