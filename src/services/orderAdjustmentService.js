const OrderAdjustment = require('../models/OrderAdjustment');
const DespatchAdvice = require('../models/DespatchAdvice');
const { generateOrderAdjustmentId } = require('../utils/generateId');

class orderAdjustmentService {
    /*
    * Creates a new order adjustment request
    @param {Object} data - Passes in adjustment data
    @return {Object} - Returns new object with adjustments
    */

    async createAdjustment(data) {
        const { despatchAdviceId, requestedByPartyId, reason, adjustments } = data;

        // Case if despatch advice doesnt exist
        const despatchAdvice = await DespatchAdvice.findOne({ dispatchAdviceId: despatchAdviceId });
        if (!despatchAdvice) {
            throw new Error(`Despatch advice ${despatchAdviceId} not found`);
        }

        // Check if despatch can be adjusted
        if (despatchAdvice.status == 'CANCELLED') {
            throw new Error(`Despatch advice can't be adjusted on cancelled orders`);
        }
        if (despatchAdvice.status == 'DELIVERED') {
            throw new Error(`Despatch advice can't be adjusted on delivered orders`);
        }

        this.validateAdjustments(adjustments, despatchAdvice.items);

        // Create unique adjustment id
        const orderAdjustmentId = generateOrderAdjustmentId();

        // Make adjustments
        const adjustment = new OrderAdjustment({
            orderAdjustmentId,
            dispatchAdviceId: despatchAdviceId,
            requestedByPartyId,
            reason,
            adjustments,
            status: 'PENDING'
        });

        // Add adjustment id to despatch advice
        await adjustment.save();
        despatchAdvice.adjustments.push(adjustment._id);
        await despatchAdvice.save();

        return adjustment;
    }

    validateAdjustments(adjustments, items) {
        if (!adjustments || adjustments.length === 0) {
            throw new Error('At least one adjustment is required');
        }

        const validSkus = new Set(items.map(item => item.sku));
        for (const adj of adjustments) {
            if (!validSkus.has(adj.sku)) {
                throw new Error(`SKU ${adj.sku} does not exist in the despatch advice`);
            }
        }
    }
}

module.exports = orderAdjustmentService;