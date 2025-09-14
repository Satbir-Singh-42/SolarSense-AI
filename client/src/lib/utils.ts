import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Number formatting functions with proper decimal handling
export function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "0";
  return parseFloat(n.toFixed(2)).toString()
}

export function formatCurrency(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "₹0";
  return `₹${parseFloat(n.toFixed(2))}`
}

export function formatPercent(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "0%";
  return `${parseFloat(n.toFixed(1))}%`
}

export function formatKwh(n: number): string {
  if (isNaN(n) || !isFinite(n)) return "0 kWh";
  return `${parseFloat(n.toFixed(1))} kWh`
}

// Trade-specific formatting with proper decimal handling
export function formatTradePrice(priceInRupees: number): string {
  if (isNaN(priceInRupees) || !isFinite(priceInRupees)) return "₹0";
  return `₹${parseFloat(priceInRupees.toFixed(2))}`
}

export function formatTradeAmount(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return "0 kWh";
  return `${parseFloat(amount.toFixed(1))} kWh`
}

export function formatTradeTotal(amount: number, priceInRupees: number): string {
  if (isNaN(amount) || !isFinite(amount) || isNaN(priceInRupees) || !isFinite(priceInRupees)) return "₹0";
  const total = amount * priceInRupees;
  return `₹${parseFloat(total.toFixed(2))}`
}

// Additional utility functions for specific display cases
export function formatCarbonSavings(kg: number): string {
  if (isNaN(kg) || !isFinite(kg)) return "0 kg CO2";
  return `${parseFloat(kg.toFixed(1))} kg CO2`
}

export function formatEnergyTraded(kwh: number): string {
  if (isNaN(kwh) || !isFinite(kwh)) return "0 kWh";
  return `${parseFloat(kwh.toFixed(1))} kWh`
}
