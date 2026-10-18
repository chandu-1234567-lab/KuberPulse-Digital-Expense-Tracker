const express = require('express');
const router = express.Router();
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { validateTransactionInput } = require('../validators/transactionValidator');

// Protected route middleware for all transaction endpoints
router.use(protect);

router.get('/export/csv', exportTransactionsCSV);

router.route('/')
  .get(getTransactions)
  .post(validateTransactionInput, createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .put(validateTransactionInput, updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
