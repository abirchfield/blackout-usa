import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmtMW = (val: number) => `${val.toFixed(0)} MW`;
export const fmtMoneyK = (val: number) => `$${(val / 1000).toFixed(0)}k`;
export const fmtMoneyM = (val: number) => `$${(val / 1000000).toFixed(2)}M`;