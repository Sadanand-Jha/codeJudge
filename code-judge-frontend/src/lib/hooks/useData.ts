"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DataState<T> = 
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "empty"; data: null; error: null }
  | { status: "error"; data: null; error: Error };

export function useData<T>(
  loader: () => T | Promise<T>,
  options?: { delayMs?: number }
): DataState<T> & { retry: () => void } {
  const [state, setState] = useState<DataState<T>>({ status: "loading", data: null, error: null });

  const loaderRef = useRef(loader);
  const optsRef = useRef(options);
  useEffect(() => {
    loaderRef.current = loader;
    optsRef.current = options;
  });

  const fetchData = useCallback(() => {
    const delay = optsRef.current?.delayMs ?? 0;
    const timer = setTimeout(() => {
      Promise.resolve(loaderRef.current())
        .then((result) => {
          if (result === null || result === undefined || (Array.isArray(result) && result.length === 0)) {
            setState({ status: "empty", data: null, error: null });
          } else {
            setState({ status: "ready", data: result, error: null });
          }
        })
        .catch((error) => {
          setState({ status: "error", data: null, error: error instanceof Error ? error : new Error(String(error)) });
        });
    }, delay);
    return timer;
  }, []);

  useEffect(() => {
    const timer = fetchData();
    return () => clearTimeout(timer);
  }, [fetchData]);

  const retry = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    const timer = fetchData();
    return () => clearTimeout(timer);
  }, [fetchData]);

  return { ...state, retry };
}