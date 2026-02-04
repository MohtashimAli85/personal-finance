// Simplified database types for personal finance app

export interface Transaction {
  id: string;
  amount: number;
  date: number; // Unix timestamp
  description: string | null;
  notes: string | null;
  account_id: string | null;
  category_id: string | null;
}

export interface Category {
  id: string;
  name: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ErrorResponse {
  error: string;
  success: false;
}

// Summary types
