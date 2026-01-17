import { createDefine } from "fresh";
import { asset as freshAsset } from "fresh/runtime";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface State {
  shared: string;
}

export const define = createDefine<State>();

// Base path for this app - always /garage
const BASE_PATH = "/garage";

/**
 * Universal Path Resolver
 * Handles both Assets (CSS/JS) and Navigation Links (<a>)
 * Always adds the /garage prefix since this app is served under that path
 */
export function url(path: string): string {
  if (path === BASE_PATH) return BASE_PATH;
  if (path.startsWith(`${BASE_PATH}/`)) return path;
  // Remove leading slash to ensure we don't get "//garage"
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}/${cleanPath}`;
}

export function asset(path: string): string {
  return url(freshAsset(path));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
