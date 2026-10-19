import { toDayJS } from "#shared/utils/date";

export function entryTitle(notes: string | null | undefined, categoryName: string) {
  const trimmed = notes?.trim();
  return trimmed || categoryName || "Untitled";
}

export function entryDateLabel(iso: string) {
  return toDayJS(iso).format("MMM DD");
}

export function categoryIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("rent") || normalized.includes("hous")) return "i-lucide-house";
  if (normalized.includes("food") || normalized.includes("market") || normalized.includes("groc")) {
    return "i-lucide-shopping-cart";
  }
  if (
    normalized.includes("internet") ||
    normalized.includes("wifi") ||
    normalized.includes("fiber")
  ) {
    return "i-lucide-wifi";
  }
  if (normalized.includes("water")) return "i-lucide-droplets";
  if (
    normalized.includes("electric") ||
    normalized.includes("power") ||
    normalized.includes("util")
  ) {
    return "i-lucide-zap";
  }
  if (normalized.includes("suppl")) return "i-lucide-shopping-bag";
  return "i-lucide-receipt";
}

export function payerInitials(name: string) {
  const part = name.trim().split(/\s+/)[0] ?? "?";
  return part.slice(0, 1).toUpperCase() || "?";
}

export function initialsOnColor(hex: string | null | undefined) {
  return hex?.toLowerCase() === "#eab308" ? "text-neutral-900" : "text-white";
}
