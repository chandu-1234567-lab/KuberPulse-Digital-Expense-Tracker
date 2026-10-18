import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import axiosClient from '../api/axiosClient';
import { StatCard } from '../components/common/StatCard';
import { CategoryBadge, StatusBadge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CHART_PALETTE, CATEGORY_COLORS } from '../utils/constants';

export const Dashboard = () => {
  const { refreshKey } = useOutletContext() || {};
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, analyticsRes] = await Promise.all([
        axiosClient.get('/dashboard/summary'),
        axiosClient.get('/dashboard/analytics?timeframe=monthly'),
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshKey]);

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800/50 animate-pulse lg:col-span-2" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
        </div>
      </div>
    );
  }

  const {
    totalBalance = 0,
    totalIncome = 0,
    totalExpenses = 0,
    monthlySavings = 0,
    monthlySavingsRate = 0,
    remainingMonthlyBudget = 0,
    warningAlerts = 0,
    exceededAlerts = 0,
    budgetProgress = [],
    recentTransactions = [],
  } = summary || {};

  const expenseByCategory = analytics?.expenseByCategory || [];
  const monthlyComparison = analytics?.monthlyComparison || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Alert Banner for Budget Warnings */}
      {(warningAlerts > 0 || exceededAlerts > 0) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Budget Alerts Attention Required
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {exceededAlerts > 0 && (
                  <span className="text-rose-500 font-bold mr-2">
                    {exceededAlerts} budget category exceeded 100%!
                  </span>
                )}
                {warningAlerts > 0 && (
                  <span className="text-amber-500 font-bold">
                    {warningAlerts} budget category spending exceeded 80% threshold.
                  </span>
                )}
              </p>
            </div>
          </div>
          <Link
            to="/budgets"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
          >
            Review Budgets
          </Link>
        </div>
      )}

      {/* 1. Five Core Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Balance"
          amount={totalBalance}
          icon={Wallet}
          colorScheme="indigo"
          subtitle="Net cumulative funds"
          trend={totalBalance >= 0 ? 'Surplus' : 'Deficit'}
          trendPositive={totalBalance >= 0}
        />
        <StatCard
          title="Total Income"
          amount={totalIncome}
          icon={TrendingUp}
          colorScheme="emerald"
          subtitle="All recorded earnings"
          trendPositive={true}
        />
        <StatCard
          title="Total Expenses"
          amount={totalExpenses}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle="Total outflows"
          trendPositive={false}
        />
        <StatCard
          title="Monthly Savings"
          amount={monthlySavings}
          icon={PiggyBank}
          colorScheme="cyan"
          subtitle={`Savings rate: ${monthlySavingsRate}%`}
          trend={monthlySavings >= 0 ? `${monthlySavingsRate}% Rate` : 'Negative'}
          trendPositive={monthlySavings >= 0}
        />
        <StatCard
          title="Remaining Budget"
          amount={remainingMonthlyBudget}
          icon={Layers}
          colorScheme="amber"
          subtitle="Unspent monthly allocations"
          trend={remainingMonthlyBudget > 0 ? 'Available' : 'Depleted'}
          trendPositive={remainingMonthlyBudget > 0}
        />
      </div>

      {/* 2. Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Monthly Cash Flow (Income vs Expenses)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Performance across recent billing cycles (INR ₹)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-teal-500" />
                Expense Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Breakdown by category
              </p>
            </div>
          </div>

          {expenseByCategory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <PieIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[entry.name] || CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${formatCurrency(val)} (${item.payload.percentage}%)`,
                        item.payload.name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 3 categories legend */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {expenseByCategory.slice(0, 3).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#10b981' }}
                      />
                      {cat.name}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount)} ({cat.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Budget Consumption Progress Bars & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Usage Bars */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Budget Usage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track 80% warning and exceeded limits
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
            >
              Planner <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {budgetProgress.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No monthly budgets configured.</p>
              <Link
                to="/budgets"
                className="mt-3 inline-block px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold"
              >
                Set Category Budget
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetProgress.slice(0, 5).map((b) => {
                const isExceeded = b.percentageUsed >= 100;
                const isWarning = b.percentageUsed >= 80 && !isExceeded;

                return (
                  <div key={b._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {b.category}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatCurrency(b.spent)} / {formatCurrency(b.monthlyLimit)}
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest financial activities
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentTransactions.map((tx) => {
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx._id}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {isIncome ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <CategoryBadge category={tx.category} type={tx.type} />
                          <span className="text-[11px] text-slate-400">
                            {formatDate(tx.date)} • {tx.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
