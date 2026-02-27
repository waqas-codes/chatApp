import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxied by Vite to http://localhost:5000
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to auto-attach the auth token
api.interceptors.request.use(
    (config) => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.token) {
            config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
