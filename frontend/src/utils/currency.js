const DEFAULT_USD_RATE = 1 / 83.33;

export const CURRENCY_OPTIONS = {
  USD: {
    code: "USD",
    symbol: "$",
    label: "USD ($)",
    rate: DEFAULT_USD_RATE,
  },
  INR: {
    code: "INR",
    symbol: "₹",
    label: "INR (₹)",
    rate: 1,
  },
};

export function convertFromINR(amount, currency = "USD") {
  const numericAmount = Number(amount) || 0;
  const config = CURRENCY_OPTIONS[currency] || CURRENCY_OPTIONS.USD;
  return numericAmount * config.rate;
}

export function formatBusinessCurrency(amount, currency = "USD") {
  const config = CURRENCY_OPTIONS[currency] || CURRENCY_OPTIONS.USD;
  const value = convertFromINR(amount, currency);
  const absolute = Math.abs(value);
  const prefix = config.symbol;

  if (absolute >= 1_000_000) {
    return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `${prefix}${(value / 1_000).toFixed(1)}K`;
  }

  return `${prefix}${Math.round(value).toLocaleString("en-US")}`;
}
