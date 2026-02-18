export function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch (_e) {
    return value.toString();
  }
}
export const safeParseFloat = (value: string | null): number => {
  if (!value) {
    return 0;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
export const fetchData = async <T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> => {
  const queryParams = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
  const fullUrl = `${baseUrl}/api/${url}${queryParams}`;
  const response = await fetch(fullUrl, {
    next: { revalidate: 3600, tags: [url] },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${fullUrl}`);
  }
  const data = await response.json();
  return data;
};
export const sleep = (ms = 1000) =>
  new Promise((resolve) => setTimeout(resolve, ms));
