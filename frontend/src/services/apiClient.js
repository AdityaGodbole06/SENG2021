import axios from 'axios';
export class ApiClient {
    constructor(config) {
        Object.defineProperty(this, "instance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.config = config;
        this.instance = axios.create({
            baseURL: config.baseURL,
            timeout: 10000,
        });
        // Add interceptors
        this.instance.interceptors.request.use(config => this.addAuthHeaders(config), error => Promise.reject(error));
        this.instance.interceptors.response.use(response => response, error => this.handleError(error));
    }
    addAuthHeaders(config) {
        if (this.config.token && this.config.authType === 'bearer') {
            config.headers.Authorization = `Bearer ${this.config.token}`;
        }
        else if (this.config.apiKey) {
            config.headers['X-API-Key'] = this.config.apiKey;
        }
        return config;
    }
    handleError(error) {
        console.error('API Error:', error.message);
        return Promise.reject(error);
    }
    setToken(token) {
        this.config.token = token;
    }
    setApiKey(key) {
        this.config.apiKey = key;
    }
    async get(url, params) {
        const response = await this.instance.get(url, { params });
        return response.data;
    }
    async post(url, data) {
        const response = await this.instance.post(url, data);
        return response.data;
    }
    async put(url, data) {
        const response = await this.instance.put(url, data);
        return response.data;
    }
    async delete(url) {
        const response = await this.instance.delete(url);
        return response.data;
    }
    async patch(url, data) {
        const response = await this.instance.patch(url, data);
        return response.data;
    }
}
// Create client instances for each API
export const createApiClients = (tokens) => ({
    ordersApi: new ApiClient({
        baseURL: 'https://www.chalksniffer.com/api',
        token: tokens.ordersApi,
        authType: 'bearer',
    }),
    dispatchApi: new ApiClient({
        baseURL: 'http://13.236.86.146:3000/api',
        token: tokens.dispatchApi,
        authType: 'bearer',
    }),
    invoicesApi: new ApiClient({
        baseURL: 'https://docs.gptless.au/api',
        token: tokens.invoicesApi,
        authType: 'bearer',
    }),
});
