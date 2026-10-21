import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { credentialsSchema } from "@/lib/validations";
import { createSession } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    const parsed = credentialsSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user || !(await compare(parsed.data.password, user.passwordHash)))
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to sign in" }, { status: 500 });
  }
}
