export const CURRENCIES = ["USD", "KHR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  amount_minor: number;
  currency: Currency;
}

export function formatMoney(money: Money): string {
  const { amount_minor, currency } = money;
  if (currency === "USD") {
    const sign = amount_minor < 0 ? "-" : "";
    const abs = Math.abs(amount_minor);
    const whole = Math.trunc(abs / 100);
    const cents = abs % 100;
    return `${sign}$${whole.toLocaleString("en-US")}.${cents.toString().padStart(2, "0")}`;
  }
  return `${amount_minor < 0 ? "-" : ""}៛${Math.abs(amount_minor).toLocaleString("en-US")}`;
}

export function isValidCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "KHR";
}
