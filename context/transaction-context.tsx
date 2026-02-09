"use client";
import { createTransaction } from "@/app/actions/transaction/mutations";
import { Transaction } from "@/app/actions/transaction/queries";
import { createContext, useContext, useState } from "react";
interface TransactionContextType {
  transaction: Omit<Transaction, "id"> | undefined;
  initializeTransaction: () => void;
  cancelTransaction: () => void;
  updateTransaction: (updatedFields: Partial<Omit<Transaction, "id">>) => void;
  addTransaction: () => void;
}
const TransactionContext = createContext<TransactionContextType>(
  {} as TransactionContextType,
);
export const useTransactionContext = () => useContext(TransactionContext);
const TransactionProvider = ({ children }: { children: React.ReactNode }) => {
  const [transaction, setTransaction] = useState<
    Omit<Transaction, "id"> | undefined
  >();
  const initializeTransaction = () => {
    setTransaction({
      payment: 0,
      deposit: 0,
      date: new Date().toISOString(),
      notes: "",
      account_id: "",
      category_id: "",
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
    if (!transaction?.account_id) return;
    await createTransaction(transaction);
    setTransaction(undefined);
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
