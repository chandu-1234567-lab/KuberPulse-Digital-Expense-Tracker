const { Transaction } = require('../models/Transaction');

// @desc    Get user transactions with filtering, search, sorting, and pagination
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      paymentMethod,
      search,
      startDate,
      endDate,
      sortBy = 'date',
      order = 'desc',
      page = 1,
      limit = 10,
      all,
    } = req.query;

    const query = { userId: req.user._id };

    if (type && ['income', 'expense'].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end of day for inclusive date filtering
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search && search.trim() !== '') {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { description: { $regex: sanitized, $options: 'i' } },
        { notes: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Sorting field mapping
    let sortField = 'date';
    if (sortBy === 'amount') {
      sortField = 'amountInPaise';
    } else if (sortBy === 'createdAt') {
      sortField = 'createdAt';
    } else if (sortBy === 'category') {
      sortField = 'category';
    }
    const sortOrder = order === 'asc' ? 1 : -1;

    // Total count for pagination
    const total = await Transaction.countDocuments(query);

    let transactionsQuery = Transaction.find(query).sort({ [sortField]: sortOrder, _id: -1 });

    const isAll = all === 'true' || all === true;
    const pageNum = parseInt(page, 10) || 1;
    const pageLimit = isAll ? total || 1000 : parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * pageLimit;

    if (!isAll) {
      transactionsQuery = transactionsQuery.skip(skip).limit(pageLimit);
    }

    const transactions = await transactionsQuery;

    // Compute aggregate summary for this user matching query
    const aggregateSummary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          totalPaise: { $sum: '$amountInPaise' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalIncomePaise = 0;
    let totalExpensePaise = 0;
    aggregateSummary.forEach((item) => {
      if (item._id === 'income') totalIncomePaise = item.totalPaise;
      if (item._id === 'expense') totalExpensePaise = item.totalPaise;
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination: {
        total,
        page: pageNum,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit) || 1,
      },
      summary: {
        totalIncome: totalIncomePaise / 100,
        totalExpenses: totalExpensePaise / 100,
        netBalance: (totalIncomePaise - totalExpensePaise) / 100,
        totalIncomeInPaise: totalIncomePaise,
        totalExpensesInPaise: totalExpensePaise,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const {
      type,
      category,
      description,
      date,
      paymentMethod,
      notes,
      amountInPaise,
    } = req.body;

    const transaction = await Transaction.create({
      userId: req.user._id,
      type,
      amountInPaise,
      category: category.trim(),
      description: description.trim(),
      date: date ? new Date(date) : new Date(),
      paymentMethod: paymentMethod || 'UPI',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    const {
      type,
      category,
      description,
      date,
      paymentMethod,
      notes,
      amountInPaise,
    } = req.body;

    if (type) transaction.type = type;
    if (amountInPaise !== undefined) transaction.amountInPaise = amountInPaise;
    if (category) transaction.category = category.trim();
    if (description) transaction.description = description.trim();
    if (date) transaction.date = new Date(date);
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (notes !== undefined) transaction.notes = notes ? notes.trim() : '';

    const updatedTransaction = await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions to CSV
// @route   GET /api/transactions/export/csv
// @access  Private
const exportTransactionsCSV = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1 });

    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Description',
      'Amount (Rupees)',
      'Payment Method',
      'Notes',
      'Created At',
    ];

    const rows = transactions.map((t) => [
      `"${t._id}"`,
      `"${new Date(t.date).toISOString().split('T')[0]}"`,
      `"${t.type.toUpperCase()}"`,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      (t.amountInPaise / 100).toFixed(2),
      `"${t.paymentMethod}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(t.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transactions_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCSV,
};
