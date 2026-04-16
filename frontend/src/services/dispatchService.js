export const dispatchService = {
    // Get all dispatch advices
    async getDispatches(clients) {
        try {
            const response = await clients.dispatchApi.get('/dispatch-advices');
            return Array.isArray(response) ? response : response?.data || [];
        }
        catch (error) {
            console.error('Error fetching dispatches:', error);
            return [];
        }
    },
    // Get dispatch by ID
    async getDispatchById(clients, id) {
        try {
            const response = await clients.dispatchApi.get(`/dispatch-advices/${id}`);
            return response;
        }
        catch (error) {
            console.error('Error fetching dispatch:', error);
            return null;
        }
    },
    // Create dispatch advice
    async createDispatch(clients, data) {
        try {
            const response = await clients.dispatchApi.post('/dispatch-advices', {
                ...data,
                status: 'dispatched',
            });
            return response;
        }
        catch (error) {
            console.error('Error creating dispatch:', error);
            return null;
        }
    },
    // Update dispatch
    async updateDispatch(clients, id, data) {
        try {
            const response = await clients.dispatchApi.put(`/dispatch-advices/${id}`, data);
            return response;
        }
        catch (error) {
            console.error('Error updating dispatch:', error);
            return null;
        }
    },
    // Delete dispatch
    async deleteDispatch(clients, id) {
        try {
            await clients.dispatchApi.delete(`/dispatch-advices/${id}`);
            return true;
        }
        catch (error) {
            console.error('Error deleting dispatch:', error);
            return false;
        }
    },
};
