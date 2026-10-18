import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  PieChart,
  Plus,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/Badge';
import { formatCurrency } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { EXPENSE_CATEGORIES } from '../utils/constants';

export const Budgets = () => {
  const { refreshKey, triggerRefresh } = useOutletContext() || {};
  const { showToast } = useToast();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    category: EXPENSE_CATEGORIES[0],
    monthlyLimit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Dialog state
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`);
      if (res.data.success) {
        setBudgets(res.data.budgets);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('[Fetch Budgets Error]:', err);
      showToast('Failed to load budget data', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, showToast]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets, refreshKey]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setFormData({
      category: EXPENSE_CATEGORIES[0],
      monthlyLimit: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      monthlyLimit: budget.monthlyLimit,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const limitNum = parseFloat(formData.monthlyLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      showToast('Please enter a valid monthly limit in Rupees', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingBudget) {
        await axiosClient.put(`/budgets/${editingBudget._id}`, {
          category: formData.category,
          monthlyLimit: limitNum,
        });
        showToast('Budget updated successfully', 'success');
      } else {
        await axiosClient.post('/budgets', {
          category: formData.category,
          monthlyLimit: limitNum,
          month: selectedMonth,
          year: selectedYear,
        });
        showToast('Budget created successfully', 'success');
      }

      setIsModalOpen(false);
      fetchBudgets();
      triggerRefresh?.();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save budget';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/budgets/${deleteTargetId}`);
      showToast('Budget removed successfully', 'success');
      setDeleteTargetId(null);
      fetchBudgets();
      triggerRefresh?.();
    } catch (err) {
      showToast('Failed to delete budget', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const totalBudget = summary?.totalBudget || 0;
  const totalSpent = summary?.totalSpent || 0;
  const remainingBudget = summary?.remainingBudget || 0;
  const warningCount = summary?.warningCount || 0;
  const exceededCount = summary?.exceededCount || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-emerald-500" />
            Budget Planner & Spending Limits
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Assign monthly category caps, track consumption, and trigger 80% warning alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none"
            >
              {monthNames.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 px-2 py-1 focus:outline-none border-l border-slate-200 dark:border-slate-800"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover-lift"
          >
            <Plus className="w-4 h-4" />
            Set Budget
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Planned Budget"
          amount={totalBudget}
          icon={Layers}
          colorScheme="indigo"
          subtitle={`Allocated for ${monthNames[selectedMonth - 1]}`}
        />
        <StatCard
          title="Actual Spending"
          amount={totalSpent}
          icon={TrendingDown}
          colorScheme="rose"
          subtitle={`${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% of budget utilized`}
          trendPositive={totalSpent <= totalBudget}
        />
        <StatCard
          title="Remaining Balance"
          amount={remainingBudget}
          icon={CheckCircle2}
          colorScheme="emerald"
          subtitle="Available unspent buffer"
          trend={remainingBudget >= 0 ? 'Safe Buffer' : 'Deficit'}
          trendPositive={remainingBudget >= 0}
        />
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Active Alerts
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
              <AlertTriangle className="w-4 h-4" /> {warningCount} Warnings (&gt;80%)
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-rose-500">
              <AlertCircle className="w-4 h-4" /> {exceededCount} Exceeded
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            Automated threshold evaluation
          </p>
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Category Budgets for {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual consumption indicators with real-time expenditure calculation
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Computing budget and transaction aggregates...</p>
          </div>
        ) : budgets.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No budgets established for this month
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Start by assigning monthly expenditure caps to key categories like Food, Rent, or Groceries.
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              + Create Category Budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {budgets.map((b) => {
              const isExceeded = b.percentageUsed >= 100;
              const isWarning = b.percentageUsed >= 80 && !isExceeded;

              return (
                <div
                  key={b._id}
                  className={`p-5 rounded-2xl border transition-all hover-lift ${
                    isExceeded
                      ? 'bg-rose-500/5 border-rose-500/30 dark:bg-rose-950/20'
                      : isWarning
                      ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/20'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {b.category}
                      </h4>
                      <div className="mt-1">
                        <StatusBadge status={b.status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        title="Edit Limit"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(b._id)}
                        title="Delete Budget"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Planned vs Actual Metrics */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Spent: <b className="text-slate-900 dark:text-white">{formatCurrency(b.spent)}</b>
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Limit: <b className="text-slate-900 dark:text-white">{formatCurrency(b.monthlyLimit)}</b>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isExceeded
                            ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                            : isWarning
                            ? 'bg-amber-500 shadow-sm shadow-amber-500/50'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span
                        className={`font-bold ${
                          isExceeded
                            ? 'text-rose-500'
                            : isWarning
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {b.percentageUsed}% utilized
                      </span>

                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {b.remaining >= 0 ? (
                          <>Remaining: <span className="text-emerald-500 font-bold">{formatCurrency(b.remaining)}</span></>
                        ) : (
                          <>Over by: <span className="text-rose-500 font-bold">{formatCurrency(Math.abs(b.remaining))}</span></>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Budget Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBudget ? 'Edit Budget Limit' : `Set Budget for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Category *
            </label>
            <select
              disabled={!!editingBudget}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Monthly Limit (INR ₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                ₹
              </span>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="10000"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              You will receive automated warnings when spending reaches 80% (₹{(formData.monthlyLimit * 0.8 || 0).toLocaleString('en-IN')}).
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingBudget ? 'Update Limit' : 'Save Budget'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Budget"
        message="Are you sure you want to remove this category budget? Existing transactions in this category will remain intact."
      />
    </div>
  );
};
