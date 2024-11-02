import { useAuthStore } from '@/stores';

export const fetchWrapper = {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    delete: request('DELETE')
};

function request(method) {
    return (url, body) => {
        const requestOptions = {
            method,
            headers: new Headers()
        };
        
        const authHead = authHeader(url);
        if (authHead.Authorization) {
            requestOptions.headers.append('Authorization', authHead.Authorization);
        }
        
        if (body) {
            if (body instanceof FormData) {
                requestOptions.body = body;
            } else {
                requestOptions.headers.append('Content-Type', 'application/json');
                requestOptions.body = JSON.stringify(body);
            }
        }
        return fetch(url, requestOptions).then(handleResponse);
    }
}

// helper functions

function authHeader(url) {
    const { auth, user } = useAuthStore();
    const isLoggedIn = !!auth?.accessToken && user;
    const isApiUrl = url.startsWith(import.meta.env.VITE_API_URL);
    if (isLoggedIn && isApiUrl) {
        return { Authorization: `Bearer ${auth.accessToken}` };
    } else {
        return {};
    }
}

function handleResponse(response) {
    return response.text().then(text => {
        const data = text && JSON.parse(text);
        
        if (!response.ok) {
            const { user, logout } = useAuthStore();
            if ([401, 403].includes(response.status) && user) {
                logout();
            }

            const error = (data && data.error && data.error.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}    
