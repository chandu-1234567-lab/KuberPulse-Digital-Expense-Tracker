const Budget = require('../models/Budget');
const { Transaction } = require('../models/Transaction');

// @desc    Get all budgets for user with actual spending, remaining amounts, and alert statuses
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const queryMonth = req.query.month ? parseInt(req.query.month, 10) : currentDate.getMonth() + 1;
    const queryYear = req.query.year ? parseInt(req.query.year, 10) : currentDate.getFullYear();

    const budgets = await Budget.find({
      userId: req.user._id,
      month: queryMonth,
      year: queryYear,
    }).sort({ createdAt: -1 });

    // Calculate start and end dates for the target month
    const startDate = new Date(Date.UTC(queryYear, queryMonth - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(queryYear, queryMonth, 0, 23, 59, 59, 999));

    // Aggregate expenses by category for this user in this month
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalSpentPaise: { $sum: '$amountInPaise' },
        },
      },
    ]);

    const spendingMap = {};
    categorySpending.forEach((item) => {
      spendingMap[item._id] = item.totalSpentPaise;
    });

    let totalBudgetPaise = 0;
    let totalSpentInBudgetedPaise = 0;
    let warningCount = 0;
    let exceededCount = 0;

    const enrichedBudgets = budgets.map((b) => {
      const spentPaise = spendingMap[b.category] || 0;
      const limitPaise = b.monthlyLimitInPaise;
      const remainingPaise = limitPaise - spentPaise;
      const percentageUsed = limitPaise > 0 ? (spentPaise / limitPaise) * 100 : 0;

      let status = 'safe'; // < 80%
      if (percentageUsed >= 100) {
        status = 'exceeded';
        exceededCount++;
      } else if (percentageUsed >= 80) {
        status = 'warning';
        warningCount++;
      }

      totalBudgetPaise += limitPaise;
      totalSpentInBudgetedPaise += spentPaise;

      return {
        _id: b._id,
        category: b.category,
        month: b.month,
        year: b.year,
        monthlyLimit: limitPaise / 100,
        monthlyLimitInPaise: limitPaise,
        spent: spentPaise / 100,
        spentInPaise: spentPaise,
        remaining: remainingPaise / 100,
        remainingInPaise: remainingPaise,
        percentageUsed: Number(percentageUsed.toFixed(1)),
        status, // 'safe' | 'warning' (>=80%) | 'exceeded' (>=100%)
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      month: queryMonth,
      year: queryYear,
      summary: {
        totalBudget: totalBudgetPaise / 100,
        totalSpent: totalSpentInBudgetedPaise / 100,
        remainingBudget: (totalBudgetPaise - totalSpentInBudgetedPaise) / 100,
        warningCount,
        exceededCount,
      },
      budgets: enrichedBudgets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res, next) => {
  try {
    const { category, monthlyLimitInPaise, month, year } = req.body;

    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category: category.trim(),
      month,
      year,
    });

    if (existingBudget) {
      return res.status(400).json({
        success: false,
        message: `Budget already exists for category '${category}' for ${month}/${year}. You can edit it instead.`,
      });
    }

    const budget = await Budget.create({
      userId: req.user._id,
      category: category.trim(),
      monthlyLimitInPaise,
      month,
      year,
    });

    res.status(201).json({
      success: true,
      message: 'Budget set successfully',
      budget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized',
      });
    }

    const { monthlyLimitInPaise, category } = req.body;

    if (category) budget.category = category.trim();
    if (monthlyLimitInPaise) budget.monthlyLimitInPaise = monthlyLimitInPaise;

    const updatedBudget = await budget.save();

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
      budget: updatedBudget,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found or unauthorized',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Budget deleted successfully',
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
