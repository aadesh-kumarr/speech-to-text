import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
const COOKIE_NAME = "vaani_session",
  MAX_AGE = 60 * 60 * 24 * 7;
function secret() {
  const v = process.env.AUTH_SECRET;
  if (!v || v.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(v);
}
export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}
export async function clearSession() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });
}
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, createdAt: true },
    });
  } catch (error) {
    console.error("Session lookup failed", error);
    return null;
  }
});
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
