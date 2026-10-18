const {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} = require('../models/Transaction');

const validateTransactionInput = (req, res, next) => {
  const { type, amount, category, description, date, paymentMethod } = req.body;
  const errors = [];

  // Type validation
  if (!type || !['income', 'expense'].includes(type)) {
    errors.push('Transaction type must be either "income" or "expense"');
  }

  // Amount validation (in Rupees or integer paise)
  const numAmount = Number(amount);
  if (amount === undefined || amount === null || isNaN(numAmount) || numAmount <= 0) {
    errors.push('Amount must be a positive number greater than 0');
  } else {
    // Convert to integer paise
    req.body.amountInPaise = Math.round(numAmount * 100);
  }

  // Category validation
  const allowedCategories =
    type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Category is required');
  } else if (!allowedCategories.includes(category.trim())) {
    errors.push(
      `Category '${category}' is not valid for ${type || 'transaction'}. Allowed: ${allowedCategories.join(', ')}`
    );
  }

  // Description validation
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description is required');
  } else if (description.trim().length > 200) {
    errors.push('Description cannot exceed 200 characters');
  }

  // Date validation
  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Invalid transaction date format');
    }
  }

  // Payment method validation
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push(
      `Invalid payment method. Allowed: ${PAYMENT_METHODS.join(', ')}`
    );
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(', '),
      errors,
    });
  }

  next();
};

module.exports = {
  validateTransactionInput,
};
