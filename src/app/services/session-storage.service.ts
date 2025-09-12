import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class SessionStorageService {
  constructor() {}

  /**
   * Save data to sessionStorage with a time-to-live (TTL) in milliseconds.
   * @param key The sessionStorage key.
   * @param value The data to store.
   * @param ttl Time to live in milliseconds (e.g., 3600000 for 1 hour).
   */
  saveWithExpiry(key: string, value: any, ttl: number): void {
    const now = new Date();

    const item = {
      value: value,
      expiry: now.getTime() + ttl,
    };

    sessionStorage.setItem(key, JSON.stringify(item));
  }

  /**
   * Retrieve data from sessionStorage if not expired.
   * @param key The sessionStorage key.
   * @returns The stored value, or null if expired or not found.
   */
  getWithExpiry(key: string): any | null {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) {
      return null;
    }

    try {
      const item = JSON.parse(itemStr);
      const now = new Date();

      if (now.getTime() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }

      return item.value;
    } catch (e) {
      console.error("Failed to parse sessionStorage item", e);
      sessionStorage.removeItem(key); // Clean up corrupt data
      return null;
    }
  }

  removeItem(key: any): void {
    sessionStorage.removeItem(key);
  }

  removeAll(): void {
    sessionStorage.clear();
  }
}
