export const ordersService = {
    // Get all orders
    async getOrders(clients) {
        try {
            const response = await clients.ordersApi.get('/orders');
            return response;
        }
        catch (error) {
            console.error('Error fetching orders:', error);
            return [];
        }
    },
    // Get order by ID
    async getOrderById(clients, id) {
        try {
            const response = await clients.ordersApi.get(`/orders/${id}`);
            return response;
        }
        catch (error) {
            console.error('Error fetching order:', error);
            return null;
        }
    },
    // Create order
    async createOrder(clients, data) {
        try {
            const response = await clients.ordersApi.post('/orders', {
                ...data,
                status: 'pending',
            });
            return response;
        }
        catch (error) {
            console.error('Error creating order:', error);
            return null;
        }
    },
    // Update order
    async updateOrder(clients, id, data) {
        try {
            const response = await clients.ordersApi.put(`/orders/${id}`, data);
            return response;
        }
        catch (error) {
            console.error('Error updating order:', error);
            return null;
        }
    },
    // Delete order
    async deleteOrder(clients, id) {
        try {
            await clients.ordersApi.delete(`/orders/${id}`);
            return true;
        }
        catch (error) {
            console.error('Error deleting order:', error);
            return false;
        }
    },
};
