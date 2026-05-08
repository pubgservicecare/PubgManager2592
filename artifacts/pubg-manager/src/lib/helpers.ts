import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat('en-PK', { 
    style: 'currency', 
    currency: 'PKR', 
    maximumFractionDigits: 0 
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  } catch (e) {
    return dateString;
  }
}
