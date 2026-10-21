import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
export const metadata = { title: "Create account" };
export default async function Register() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthShell mode="register" />;
}
