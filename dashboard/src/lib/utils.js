import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, last class wins on conflict. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
