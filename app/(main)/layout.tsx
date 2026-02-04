import React from "react";
import { accountExists } from "../actions/account";
import { redirect } from "next/navigation";

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  const hasAccounts = await accountExists();
  if (!hasAccounts) redirect("/onboarding");
  return <>{children}</>;
};

export default MainLayout;
