import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
export const metadata = { title: "Sign in" };
export default async function Login() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthShell mode="login" />;
}
