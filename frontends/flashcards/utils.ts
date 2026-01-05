import { createDefine } from "fresh";

export interface State {
  shared: string;
}

export const define = createDefine<State>();

// Base path for this app - always /flashcards
const BASE_PATH = "/flashcards";

/**
 * Universal Path Resolver
 * Handles both Assets (CSS/JS) and Navigation Links (<a>)
 * Always adds the /flashcards prefix since this app is served under that path
 */
export function url(path: string): string {
  // Remove leading slash to ensure we don't get "//flashcards"
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}/${cleanPath}`;
}

// Alias 'asset' to 'url' so your old code still works if you want
export const asset = url;