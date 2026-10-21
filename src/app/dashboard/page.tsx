import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Workspace" };
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <DashboardHeader email={user.email} />
      <Dashboard />
    </>
  );
}
