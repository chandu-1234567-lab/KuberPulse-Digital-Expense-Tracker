import React from 'react';
import { CATEGORY_COLORS } from '../../utils/constants';

export const CategoryBadge = ({ category, type = 'expense' }) => {
  const color = CATEGORY_COLORS[category] || '#64748b';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-xs"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}35`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {category}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  if (status === 'exceeded') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        Exceeded
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        &gt;80% Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
      On Track
    </span>
  );
};
