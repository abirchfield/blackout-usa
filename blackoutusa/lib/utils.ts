import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmtMW = (val: number) => `${val.toFixed(0)} MW`;
export const fmtMoneyK = (val: number) => `$${(val / 1000).toFixed(0)}k`;
export const fmtMoneyM = (val: number) => `$${(val / 1000000).toFixed(2)}M`;

export const fmtPowerAuto = (val: number) => {
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)} GW`;
  }
  return `${val.toFixed(0)} MW`;
};

export const fmtMoneyAuto = (val: number) => {
  if (val >= 1000000) {
    return `$${(val / 1000000).toFixed(2)}M`;
  }
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(0)}k`;
  }
  return `$${val.toFixed(0)}`;
};