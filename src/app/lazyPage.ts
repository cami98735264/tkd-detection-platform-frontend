import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "chunk-reload-attempted";

/**
 * React.lazy for route pages, resilient to deploys: content-hashed chunks of
 * the previous build disappear once a new version is live, so a tab opened
 * before the deploy fails to import them. Reload once to pick up the new
 * index.html/client.js instead of rendering a blank page.
 */
export function lazyPage<T extends ComponentType<object>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (err) {
      if (typeof window !== "undefined" && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // wait for the reload
      }
      throw err;
    }
  });
}
