import { timingSafeEqual } from "crypto";

// Verifica le credenziali dell'unica utente dell'app (la psicologa) contro
// le variabili d'ambiente ADMIN_EMAIL e ADMIN_PASSWORD.
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL o ADMIN_PASSWORD non configurate. Imposta queste variabili d'ambiente."
    );
  }

  if (email.trim().toLowerCase() !== adminEmail) return false;

  return safeCompare(password, adminPassword);
}

// Confronto a tempo costante, per non rivelare la lunghezza/contenuto della
// password tramite differenze di tempo di risposta.
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Confronta comunque con un buffer della stessa lunghezza per evitare
    // di rivelare la lunghezza tramite un fallimento immediato.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
