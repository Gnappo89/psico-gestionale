"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkCredentials } from "@/lib/credentials";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/dashboard");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Inserisci email e password.")}&next=${encodeURIComponent(safeNext)}`);
  }

  let ok = false;
  try {
    ok = await checkCredentials(email, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Configurazione di accesso mancante.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  if (!ok) {
    redirect(`/login?error=${encodeURIComponent("Email o password non corretti.")}&next=${encodeURIComponent(safeNext)}`);
  }

  const token = await createSessionToken(email.trim().toLowerCase());
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions);

  redirect(safeNext);
}

export async function logoutAction() {
  cookies().set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  redirect("/login");
}
