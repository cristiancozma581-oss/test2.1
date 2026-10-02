import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatează o sumă stocată în bani (întregi) ca preț în lei. */
export function formateazaBani(bani: number): string {
  return new Intl.NumberFormat("ro-MD", {
    style: "currency",
    currency: "MDL",
    minimumFractionDigits: 2,
  }).format(bani / 100);
}

export function formateazaData(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ro-MD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
