export function formatMinorUnits(minor: bigint | number | string, currency = 'USD'): string {
  const minorNum = typeof minor === 'bigint' ? Number(minor) : typeof minor === 'string' ? parseFloat(minor) : minor;
  const decimals = currency.toUpperCase() === 'JPY' ? 0 : 2;
  const val = minorNum / Math.pow(10, decimals);

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  } catch {
    return `${currency.toUpperCase()} ${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
}

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateAccount(account: string | undefined): string {
  if (!account) return '—';
  if (account.length <= 8) return account;
  return `••• ${account.slice(-4)}`;
}

export function getStatusBadgeStyle(status: string): { bg: string; text: string; border: string; label: string } {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
    case 'verified':
    case 'clear':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', label: status.toUpperCase() };
    case 'processing':
    case 'awaiting_approval':
    case 'pending_review':
    case 'review_required':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', label: status.replace('_', ' ').toUpperCase() };
    case 'failed':
    case 'rejected':
    case 'cancelled':
    case 'blocked':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', label: status.toUpperCase() };
    default:
      return { bg: 'bg-slate-800/50', text: 'text-slate-300', border: 'border-slate-700/50', label: status.toUpperCase() };
  }
}

