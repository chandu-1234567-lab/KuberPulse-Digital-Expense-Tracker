/**
 * Format amount as Indian Rupees (INR) using Indian numbering system (Lakhs & Crores)
 * e.g., 150000 -> "₹1,50,000.00"
 */
export const formatCurrency = (amount, includeDecimals = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }

  const num = Number(amount);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num);
};

/**
 * Format date in clean readable standard (e.g. 15 Oct 2026)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

/**
 * Format date for HTML input (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0];
};

/**
 * Format relative date (Today, Yesterday, X days ago)
 */
export const formatRelativeDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Check if same calendar day
    if (now.getDate() === date.getDate()) return 'Today';
    return 'Yesterday';
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(dateString);
};
