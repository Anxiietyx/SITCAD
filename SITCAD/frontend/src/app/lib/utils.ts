import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "N/A";
  const d = new Date(value);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}/${month}/${year} ${timeStr}`;
}
