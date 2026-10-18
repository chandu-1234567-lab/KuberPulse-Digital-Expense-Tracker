import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export const StatCard = ({
  title,
  amount,
  icon: Icon,
  trend,
  trendPositive,
  subtitle,
  colorScheme = 'emerald', // emerald, cyan, indigo, amber, rose
}) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400',
      glow: 'shadow-emerald-500/5',
    },
    cyan: {
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/10',
      border: 'border-cyan-500/20',
      iconBg: 'bg-cyan-500/20 text-cyan-500 dark:text-cyan-400',
      glow: 'shadow-cyan-500/5',
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/10',
      border: 'border-indigo-500/20',
      iconBg: 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400',
      glow: 'shadow-indigo-500/5',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-500 dark:text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/10',
      border: 'border-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-500 dark:text-rose-400',
      glow: 'shadow-rose-500/5',
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.emerald;

  return (
    <div
      className={`relative p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-lg ${scheme.glow} hover-lift transition-all duration-300 backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
            {formatCurrency(amount)}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          {subtitle && (
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`font-semibold px-2 py-0.5 rounded-full ${
                trendPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
