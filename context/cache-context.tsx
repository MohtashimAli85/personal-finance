"use client";
import { createContext, useContext, ReactNode } from "react";

type CacheContextType = {
  getCache: <T = unknown>(key: string) => T | undefined;
  setCache: <T = unknown>(key: string, value: T, ttl?: number) => void;
  clearCache: () => void;
  deleteCache: (key: string) => void;
};

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export function useCache(): CacheContextType {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error("useCache must be used within a CacheProvider");
  return ctx;
}

export default function CacheProvider({ children }: { children: ReactNode }) {
  const map = new Map<string, { expiry: number; data: unknown }>();

  function getCache<T = unknown>(key: string): T | undefined {
    const cacheValue = map.get(key);
    if (!cacheValue) return undefined;
    if (Date.now() > cacheValue.expiry) {
      map.delete(key);
      return undefined;
    }
    return cacheValue.data as T;
  }

  function setCache<T = unknown>(key: string, value: T, ttl = 10) {
    const expiry = Date.now() + ttl * 1000;

    map.set(key, { expiry, data: value });
  }

  function clearCache() {
    map.clear();
  }

  function deleteCache(key: string) {
    map.delete(key);
  }

  const contextValue: CacheContextType = {
    getCache,
    setCache,
    clearCache,
    deleteCache,
  };

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
}
