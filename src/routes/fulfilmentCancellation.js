const express = require('express');
const router = express.Router();
const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const DespatchAdvice = require('../models/DespatchAdvice');

// POST /fulfilment-cancellations
router.post('/', async (req, res) => {
  try {
    const { 
      fulfilmentCancellationId, 
      dispatchAdviceId, 
      requestedByPartyId, 
      reason 
    } = req.body;

    const parentAdvice = await DespatchAdvice.findOne({ dispatchAdviceId });
    
    if (!parentAdvice) {
      return res.status(404).json({ 
        message: 'DespatchAdvice not found' 
      });
    }

    // Mongoose will automatically trigger validation here 
    const cancellation = new FulfilmentCancellation({
      fulfilmentCancellationId,
      dispatchAdviceId,
      requestedByPartyId,
      reason
    });

    const savedCancellation = await cancellation.save();

    return res.status(201).json(savedCancellation);

  } catch (error) {
    //Handle Validation or Duplicate Key Errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: `Validation Error: ${error.message}` 
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate ID error' 
      });
    }

    // Generic Server Error
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;