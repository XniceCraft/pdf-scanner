import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDateTime(ms: number): string {
  const date = new Date(ms);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const mins = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${mins}`;
}

/**
 * Returns a human-readable string describing how long ago a date was.
 * e.g. "Updated 10 hours ago."
 */
export function getUpdatedAt(date: Date | string | number): string {
  const past = new Date(date).getTime();
  const now = Date.now();
  const diffMs = now - past;

  if (diffMs < 0) return "Updated just now.";

  const seconds = Math.floor(diffMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const format = (value: number, unit: string): string =>
    `Updated ${value} ${unit}${value !== 1 ? "s" : ""} ago`;

  if (seconds < 60) return "Updated just now.";
  if (minutes < 60) return format(minutes, "minute");
  if (hours < 24) return format(hours, "hour");
  if (days < 7) return format(days, "day");
  if (weeks < 5) return format(weeks, "week");
  if (months < 12) return format(months, "month");
  return format(years, "year");
}
