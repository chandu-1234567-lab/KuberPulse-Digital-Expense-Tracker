const { Transaction } = require('../models/Transaction');
const Budget = require('../models/Budget');

// @desc    Get dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Start and end of current month
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

    // 1. All-time aggregate
    const allTimeStats = await Transaction.aggregate([
      { $match: { userId } },
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
    allTimeStats.forEach((s) => {
      if (s._id === 'income') totalIncomePaise = s.totalPaise;
      if (s._id === 'expense') totalExpensePaise = s.totalPaise;
    });

    const totalBalancePaise = totalIncomePaise - totalExpensePaise;

    // 2. Current month aggregate
    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$type',
          monthlyPaise: { $sum: '$amountInPaise' },
        },
      },
    ]);

    let currentMonthIncomePaise = 0;
    let currentMonthExpensePaise = 0;
    monthlyStats.forEach((s) => {
      if (s._id === 'income') currentMonthIncomePaise = s.monthlyPaise;
      if (s._id === 'expense') currentMonthExpensePaise = s.monthlyPaise;
    });

    const monthlySavingsPaise = currentMonthIncomePaise - currentMonthExpensePaise;
    const monthlySavingsRate =
      currentMonthIncomePaise > 0
        ? Number(((monthlySavingsPaise / currentMonthIncomePaise) * 100).toFixed(1))
        : 0;

    // 3. Current month budgets and spending
    const currentBudgets = await Budget.find({
      userId,
      month: currentMonth,
      year: currentYear,
    });

    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          spentPaise: { $sum: '$amountInPaise' },
        },
      },
    ]);

    const spendingMap = {};
    categorySpending.forEach((c) => {
      spendingMap[c._id] = c.spentPaise;
    });

    let totalBudgetLimitPaise = 0;
    let totalBudgetSpentPaise = 0;
    let warningAlerts = 0;
    let exceededAlerts = 0;

    const budgetProgress = currentBudgets.map((b) => {
      const spent = spendingMap[b.category] || 0;
      const limit = b.monthlyLimitInPaise;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      let status = 'safe';
      if (pct >= 100) {
        status = 'exceeded';
        exceededAlerts++;
      } else if (pct >= 80) {
        status = 'warning';
        warningAlerts++;
      }

      totalBudgetLimitPaise += limit;
      totalBudgetSpentPaise += spent;

      return {
        _id: b._id,
        category: b.category,
        monthlyLimit: limit / 100,
        spent: spent / 100,
        remaining: (limit - spent) / 100,
        percentageUsed: Number(pct.toFixed(1)),
        status,
      };
    });

    const remainingMonthlyBudgetPaise = Math.max(0, totalBudgetLimitPaise - totalBudgetSpentPaise);

    // 4. Recent transactions (latest 6)
    const recentTransactions = await Transaction.find({ userId })
      .sort({ date: -1, _id: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        totalBalance: totalBalancePaise / 100,
        totalIncome: totalIncomePaise / 100,
        totalExpenses: totalExpensePaise / 100,
        monthlyIncome: currentMonthIncomePaise / 100,
        monthlyExpenses: currentMonthExpensePaise / 100,
        monthlySavings: monthlySavingsPaise / 100,
        monthlySavingsRate,
        totalBudgetLimit: totalBudgetLimitPaise / 100,
        remainingMonthlyBudget: remainingMonthlyBudgetPaise / 100,
        warningAlerts,
        exceededAlerts,
        budgetProgress,
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard analytics (charts data, category breakdown, monthly trends)
// @route   GET /api/dashboard/analytics
// @access  Private
const getDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { timeframe = 'monthly' } = req.query; // 'daily', 'weekly', 'monthly', 'yearly'

    const now = new Date();
    let startDate;

    if (timeframe === 'daily') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    } else if (timeframe === 'weekly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    } else if (timeframe === 'yearly') {
      startDate = new Date(now.getFullYear() - 3, 0, 1); // Last 3 years
    } else {
      // monthly (default: last 6-12 months)
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    // 1. Expense by Category
    const categoryStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalPaise: { $sum: '$amountInPaise' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaise: -1 } },
    ]);

    const totalExpenseInPeriod = categoryStats.reduce((acc, c) => acc + c.totalPaise, 0);

    const expenseByCategory = categoryStats.map((item) => ({
      name: item._id,
      amount: item.totalPaise / 100,
      count: item.count,
      percentage: totalExpenseInPeriod > 0
        ? Number(((item.totalPaise / totalExpenseInPeriod) * 100).toFixed(1))
        : 0,
    }));

    // 2. Income by Category
    const incomeCategoryStats = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'income',
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalPaise: { $sum: '$amountInPaise' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaise: -1 } },
    ]);

    const incomeByCategory = incomeCategoryStats.map((item) => ({
      name: item._id,
      amount: item.totalPaise / 100,
      count: item.count,
    }));

    // 3. Monthly Income vs Expenses Trend (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyTrendsData = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          totalPaise: { $sum: '$amountInPaise' },
        },
      },
    ]);

    // Build ordered list of the last 6 months
    const monthlyComparison = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = `${monthNames[m - 1]} ${y}`;

      const incomeItem = monthlyTrendsData.find(
        (t) => t._id.year === y && t._id.month === m && t._id.type === 'income'
      );
      const expenseItem = monthlyTrendsData.find(
        (t) => t._id.year === y && t._id.month === m && t._id.type === 'expense'
      );

      const income = incomeItem ? incomeItem.totalPaise / 100 : 0;
      const expense = expenseItem ? expenseItem.totalPaise / 100 : 0;
      const savings = income - expense;

      monthlyComparison.push({
        month: label,
        year: y,
        monthIndex: m,
        income,
        expense,
        savings,
      });
    }

    // 4. Payment method distribution
    const paymentStats = await Transaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$paymentMethod',
          totalPaise: { $sum: '$amountInPaise' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalPaise: -1 } },
    ]);

    const paymentMethods = paymentStats.map((p) => ({
      name: p._id || 'Others',
      amount: p.totalPaise / 100,
      count: p.count,
    }));

    res.status(200).json({
      success: true,
      timeframe,
      data: {
        expenseByCategory,
        incomeByCategory,
        monthlyComparison,
        paymentMethods,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getDashboardAnalytics,
};
