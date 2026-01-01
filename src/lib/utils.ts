import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a YYYY-MM-DD date string as local time (not UTC)
 * This prevents timezone-related date shifting issues
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Preserves multiple newlines in content for markdown rendering.
 * Converts 3+ consecutive newlines into paragraph breaks with <br> tags.
 */
export function preserveNewlines(content: string): string {
  return content.replace(/\n{3,}/g, (match) => {
    const extraBreaks = match.length - 2;
    return '\n\n' + '<br/>'.repeat(extraBreaks);
  });
}
