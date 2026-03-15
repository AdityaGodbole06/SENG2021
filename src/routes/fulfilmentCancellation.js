const express = require('express');
const router = express.Router();
const FulfilmentCancellation = require('../models/FulfilmentCancellation');
const DespatchAdvice = require('../models/DespatchAdvice');
const Supply = require('../models/Supply')
const { v4: uuidv4 } = require('uuid');


// POST /fulfilment-cancellations
router.post('/', async (req, res) => {
  if (req.party && req.party.role !== 'DESPATCH_PARTY') {
    return res.status(403).json({ error: 'Only a DESPATCH_PARTY can create a Fulfilment Cancellation' });
  }

  try {
    const { 
      dispatchAdviceId, 
      requestedByPartyId, 
      reason 
    } = req.body;
    
    const fulfilmentCancellationId = `FC-${uuidv4()}`;

    // Mongoose will automatically trigger validation here 
    const cancellation = new FulfilmentCancellation({
      fulfilmentCancellationId,
      dispatchAdviceId,
      requestedByPartyId,
      reason
    });
    await cancellation.validate();

    const parentAdvice = await DespatchAdvice.findOne({ dispatchAdviceId });
    
    if (!parentAdvice) {
      return res.status(404).json({ 
        message: 'DespatchAdvice not found' 
      });
    }

    const savedCancellation = await cancellation.save();

    if (savedCancellation) {
      const advice = await DespatchAdvice.findOne({ dispatchAdviceId });
      
      // Adjust Order - Mark the original advice as void or cancelled
      advice.status = 'CANCELLED'; 
      await advice.save();
      
      // Loop through items to adjust inventory (The "Adjust Supply" step)
      for (const item of advice.items) {
        await Supply.findOneAndUpdate(
          { 
            sku: item.sku, 
            despatchPartyId: advice.despatchParty.partyId 
          },
          { 
            $inc: { 
              allocatedQuantity: -item.quantity, 
              availableQuantity: item.quantity
            }
          },
          { returnDocument: 'after' } 
        );
      }
    }
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

// GET /fulfilment-cancellations
router.get('/:id', async (req, res) => {
  try {
    const cancellation = await FulfilmentCancellation.findOne({ 
      fulfilmentCancellationId: req.params.id 
    });

    // If Mongoose returns null, we must send a 404
    if (!cancellation) {
      return res.status(404).json({ message: 'Cancellation not found' });
    }

    return res.status(200).json(cancellation);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// DELETE /fulfilment-cancellations/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await FulfilmentCancellation.findOneAndDelete({ 
      fulfilmentCancellationId: req.params.id 
    });

    if (!deletedItem) {
      return res.status(404).json({ message: 'Cancellation record not found' });
    }

    return res.status(200).json({ 
      message: 'Cancellation record successfully deleted',
      deletedId: deletedItem.fulfilmentCancellationId 
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;