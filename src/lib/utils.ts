import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | number | Date, formatString = "PPP") {
  return format(new Date(date), formatString);
}

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return '';
  }
  // Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Local
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '-'
  return `$${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`
}

