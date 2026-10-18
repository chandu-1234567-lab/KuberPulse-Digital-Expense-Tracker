const express = require('express');
const router = express.Router();
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const { validateBudgetInput } = require('../validators/budgetValidator');

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(validateBudgetInput, createBudget);

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

module.exports = router;
