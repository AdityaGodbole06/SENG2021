// Generates unique Id
const generateOrderAdjustmentId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ADJ-${timestamp}-${random}`;
}

const generateDespatchAdviceId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ADJ-${timestamp}-${random}`;
}

module.exports = {
    generateOrderAdjustmentId,
    generateDespatchAdviceId
};