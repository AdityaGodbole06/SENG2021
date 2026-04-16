export const invoicesService = {
    // Get all invoices
    async getInvoices(clients) {
        try {
            const response = await clients.invoicesApi.get('/invoices');
            return Array.isArray(response) ? response : response?.data || [];
        }
        catch (error) {
            console.error('Error fetching invoices:', error);
            return [];
        }
    },
    // Get invoice by ID
    async getInvoiceById(clients, id) {
        try {
            const response = await clients.invoicesApi.get(`/invoices/${id}`);
            return response;
        }
        catch (error) {
            console.error('Error fetching invoice:', error);
            return null;
        }
    },
    // Create invoice
    async createInvoice(clients, data) {
        try {
            const response = await clients.invoicesApi.post('/invoices', {
                ...data,
                status: 'unpaid',
            });
            return response;
        }
        catch (error) {
            console.error('Error creating invoice:', error);
            return null;
        }
    },
    // Update invoice
    async updateInvoice(clients, id, data) {
        try {
            const response = await clients.invoicesApi.put(`/invoices/${id}`, data);
            return response;
        }
        catch (error) {
            console.error('Error updating invoice:', error);
            return null;
        }
    },
    // Delete invoice
    async deleteInvoice(clients, id) {
        try {
            await clients.invoicesApi.delete(`/invoices/${id}`);
            return true;
        }
        catch (error) {
            console.error('Error deleting invoice:', error);
            return false;
        }
    },
    // Mark invoice as paid
    async markAsPaid(clients, id) {
        try {
            const response = await clients.invoicesApi.patch(`/invoices/${id}`, {
                status: 'paid',
            });
            return response;
        }
        catch (error) {
            console.error('Error marking invoice as paid:', error);
            return null;
        }
    },
};
