/**
 * Convert a display amount (major units) to storage minor units.
 *
 * USD is tracked in cents (×100); KHR has no subunit, so the value is passed through.
 *
 * @param currency - The ledger currency.
 * @param amountMajor - The amount in major units (e.g. dollars or riel).
 * @returns The integer minor units to persist as `amount_minor`.
 */
export function toAmountMinor(currency: Currency, amountMajor: number) {
  return Math.round(currency === "USD" ? amountMajor * 100 : amountMajor);
}

/**
 * Convert storage minor units back to a display amount (major units).
 *
 * Inverse of {@link toAmountMinor}: USD cents ÷ 100, KHR unchanged.
 *
 * @param currency - The ledger currency.
 * @param amountMinor - The `amount_minor` integer from storage.
 * @returns The amount in major units for display/editing.
 */
export function toAmountMajor(currency: Currency, amountMinor: number) {
  return currency === "USD" ? amountMinor / 100 : amountMinor;
}

/**
 * Resolve the Iconify icon name for a currency.
 *
 * @param currency - The ledger currency.
 * @returns `i-lucide-dollar-sign` for USD, `i-lucide-coins` for KHR.
 */
export function currencyIcon(currency: Currency) {
  return currency === "USD" ? "i-lucide-dollar-sign" : "i-lucide-coins";
}
