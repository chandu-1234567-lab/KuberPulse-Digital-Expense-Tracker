import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Briefcase,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../components/common/Toast';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TransactionFormModal } from '../components/transactions/TransactionFormModal';
import { CategoryBadge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { INCOME_CATEGORIES } from '../utils/constants';

export const Income = () => {
  const { refreshKey, triggerRefresh } = useOutletContext() || {};
  const { showToast } = useToast();

  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [totalIncome, setTotalIncome] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchIncomeData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        type: 'income',
        page,
        limit: 10,
        sortBy: 'date',
        order: 'desc',
      };
      if (categoryFilter) params.category = categoryFilter;

      const res = await axiosClient.get('/transactions', { params });
      if (res.data.success) {
        setIncomes(res.data.transactions);
        setPagination(res.data.pagination);
        setTotalIncome(res.data.summary?.totalIncome || 0);
      }
    } catch (err) {
      console.error('[Fetch Income Error]:', err);
      showToast('Failed to load income data', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, showToast]);

  useEffect(() => {
    fetchIncomeData();
  }, [fetchIncomeData, refreshKey]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await axiosClient.delete(`/transactions/${deleteTargetId}`);
      showToast('Income record deleted successfully', 'success');
      setDeleteTargetId(null);
      fetchIncomeData();
      triggerRefresh?.();
    } catch (err) {
      showToast('Failed to delete income record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Income Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track salaries, freelance earnings, investments, and capital inflows
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedIncome(null);
            setIsAddEditOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover-lift"
        >
          <Plus className="w-4 h-4" />
          Add Income
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Income Earned"
          amount={totalIncome}
          icon={TrendingUp}
          colorScheme="emerald"
          subtitle="Cumulative inflows"
          trendPositive={true}
        />
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Income Categories
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {INCOME_CATEGORIES.length} Active Streams
          </p>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            Salary, Freelance, Investments & more
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Filtered Category
          </p>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="mt-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Income Sources</option>
            {INCOME_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {pagination.total} transaction records
          </p>
        </div>
      </div>

      {/* Income Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading income transactions...</p>
          </div>
        ) : incomes.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No income entries found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add your salary, dividends, or freelance payouts.
            </p>
            <button
              onClick={() => {
                setSelectedIncome(null);
                setIsAddEditOpen(true);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              + Add Income
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Source & Description</th>
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Method</th>
                  <th className="px-6 py-4 text-right">Inflow Amount (₹)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {incomes.map((inc) => (
                  <tr
                    key={inc._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {inc.description}
                      </p>
                      {inc.notes && (
                        <p className="text-[11px] text-slate-400 italic truncate max-w-xs">
                          {inc.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <CategoryBadge category={inc.category} type="income" />
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {formatDate(inc.date)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                        {inc.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                      + {formatCurrency(inc.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedIncome(inc);
                            setIsAddEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(inc._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Add / Edit Income */}
      <TransactionFormModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        initialType="income"
        transactionToEdit={selectedIncome}
        onSuccess={() => {
          fetchIncomeData();
          triggerRefresh?.();
        }}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Income Record"
        message="Are you sure you want to delete this income entry? Your total balance and savings figures will adjust automatically."
      />
    </div>
  );
};
