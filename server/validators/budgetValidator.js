const { EXPENSE_CATEGORIES } = require('../models/Transaction');

const validateBudgetInput = (req, res, next) => {
  const { category, monthlyLimit, month, year } = req.body;
  const errors = [];

  if (!category || typeof category !== 'string' || !EXPENSE_CATEGORIES.includes(category.trim())) {
    errors.push(`Budget category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
  }

  const numLimit = Number(monthlyLimit);
  if (monthlyLimit === undefined || monthlyLimit === null || isNaN(numLimit) || numLimit <= 0) {
    errors.push('Monthly limit must be a positive number in Rupees');
  } else {
    req.body.monthlyLimitInPaise = Math.round(numLimit * 100);
  }

  const numMonth = Number(month);
  if (!month || !Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12) {
    errors.push('Month must be an integer between 1 and 12');
  }

  const numYear = Number(year);
  if (!year || !Number.isInteger(numYear) || numYear < 2000 || numYear > 2100) {
    errors.push('Year must be a valid 4-digit year (e.g., 2026)');
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
  validateBudgetInput,
};
