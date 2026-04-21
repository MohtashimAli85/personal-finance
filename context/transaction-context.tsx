"use client";
import { createContext, use, useState } from "react";
import { createTransaction } from "@/app/actions/transaction/mutations";

interface TransactionContextType {
  transaction?: Omit<Transaction, "id">;
  initializeTransaction: () => void;
  cancelTransaction: () => void;
  updateTransaction: (updatedFields: Partial<Omit<Transaction, "id">>) => void;
  addTransaction: () => void;
}
const TransactionContext = createContext<TransactionContextType>(
  {} as TransactionContextType,
);
const initialTransaction = {
  payment: 0,
  deposit: 0,
  date: new Date().toISOString(),
  notes: "",
  account_id: "",
  category_id: "",
};
export const useTransactionContext = () => use(TransactionContext);
const TransactionProvider = ({
  children,
  accountId = "",
  initialCategoryId = "",
  initialAccountId = "",
  initialDate,
  autoInitialize = false,
}: {
  children: React.ReactNode;
  accountId?: string;
  initialCategoryId?: string;
  initialAccountId?: string;
  initialDate?: string;
  autoInitialize?: boolean;
}) => {
  const [transaction, setTransaction] = useState<Omit<Transaction, "id"> | undefined>(
    autoInitialize
      ? {
          ...initialTransaction,
          date: initialDate ?? new Date().toISOString(),
          account_id: accountId || initialAccountId,
          category_id: initialCategoryId,
        }
      : undefined,
  );
  const initializeTransaction = () => {
    setTransaction({
      ...initialTransaction,
      date: initialDate ?? new Date().toISOString(),
      account_id: accountId || initialAccountId,
      category_id: initialCategoryId,
    });
  };
  const cancelTransaction = () => {
    setTransaction(undefined);
  };
  const updateTransaction = (
    updatedFields: Partial<Omit<Transaction, "id">>,
  ) => {
    setTransaction((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };
  const addTransaction = async () => {
    if (!transaction?.account_id) {
      return;
    }
    await createTransaction(transaction);
    initializeTransaction();
  };
  return (
    <TransactionContext.Provider
      value={{
        transaction,
        initializeTransaction,
        cancelTransaction,
        updateTransaction,
        addTransaction,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export default TransactionProvider;
