import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  
  // Parse the date as UTC
  const utcDate = new Date(value);
  
  // Convert to Malaysia timezone (UTC+8)
  const malaysiaDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
  
  const day = malaysiaDate.getUTCDate();
  const month = malaysiaDate.getUTCMonth() + 1;
  const year = malaysiaDate.getUTCFullYear();
  const hours = malaysiaDate.getUTCHours();
  const minutes = malaysiaDate.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  
  return `${day}/${month}/${year} ${displayHours}:${minutes}${ampm}`;
}
