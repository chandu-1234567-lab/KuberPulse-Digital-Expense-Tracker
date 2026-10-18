const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Transportation',
  'Rent',
  'Bills',
  'Entertainment',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Others',
];

const INCOME_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business',
  'Investments',
  'Gifts',
  'Others',
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Bank Transfer',
  'Others',
];

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense'],
        message: 'Transaction type must be either income or expense',
      },
      required: [true, 'Transaction type is required'],
    },
    // Amount stored strictly in integer paise to avoid IEEE-754 floating point inaccuracies
    amountInPaise: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1 paisa (₹0.01)'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer paise value',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method',
      },
      default: 'UPI',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property: amount in Rupees (e.g., 10050 paise -> 100.50 rupees)
transactionSchema.virtual('amount').get(function () {
  return this.amountInPaise ? this.amountInPaise / 100 : 0;
});

// Compound indexes for optimal querying performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

module.exports = {
  Transaction: mongoose.model('Transaction', transactionSchema),
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
};
