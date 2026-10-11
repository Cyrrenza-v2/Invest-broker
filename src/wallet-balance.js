export function getReconciledAvailableBalance(wallet) {
  if (!wallet || wallet.balance_reconciled !== true) return null;
  const amount = Number(wallet.available_balance);
  return Number.isFinite(amount) ? amount : null;
}

export function displayAvailableBalance(value, currency = "NGN") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending reconciliation";
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(Number(value));
}
