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
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If it's not JSON, use the text as the error message
                if (!response.ok) {
                    return Promise.reject(text || response.statusText);
                }
            }
        }
        
        if (!response.ok) {
            const { user, logout } = useAuthStore();
            if ([401, 403].includes(response.status) && user) {
                logout();
            }

            const msg = (data?.error?.message) || data?.message || text || response.statusText;
            if (data?.error && typeof data.error === 'object') {
                return Promise.reject({
                    message: msg,
                    details: data.error.details,
                    status: data.error.status
                });
            }
            return Promise.reject(msg);
        }

        return data;
    });
}    
