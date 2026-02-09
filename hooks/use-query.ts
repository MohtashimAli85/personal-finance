import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { useCache } from "@/context/cache-context";

interface UseQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: UseQueryOptions<T>): UseQueryResult<T> {
  const { getCache, setCache } = useCache();
  const cached = getCache<T>(queryKey);

  const [data, setData] = useState<T | undefined>(cached);
  const [isLoading, setIsLoading] = useState(!cached && enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(() => {
    setIsLoading(true);
    setError(null);
    queryFn()
      .then((result) => {
        setCache(queryKey, result);
        setData(result);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [queryKey, queryFn, setCache]);

  const onMount = useEffectEvent(() => {
    if (cached) return;
    if (!enabled) return;
    fetch();
  });

  useEffect(() => {
    onMount();
  }, []);

  return { data, isLoading, error, refetch: fetch };
}

export default useQuery;
