import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats an epoch timestamp (milliseconds) to a YYYY-MM-DD string
 * using manual UTC field extraction — no locale dependency.
 *
 * @param epochMs - Unix timestamp in milliseconds
 * @returns Formatted date string in YYYY-MM-DD format (UTC)
 */
export function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}