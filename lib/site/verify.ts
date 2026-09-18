import crypto from "crypto";
import { ensureDbInitialized, normalizeHost } from "./db";
import { VerificationResult } from "./types";

export function generateVerificationToken(host: string): string {
  const cleanHost = normalizeHost(host);
  return `site-agent-verify-${crypto.createHash("sha256").update(`${cleanHost}:${process.env.GEMINI_API_KEY || "secret"}`).digest("hex").slice(0, 16)}`;
}

export async function createVerificationRequest(host: string, method: "dns" | "meta"): Promise<VerificationResult> {
  const cleanHost = normalizeHost(host);
  const token = generateVerificationToken(cleanHost);
  const id = `verif_${cleanHost}_${method}`;

  const db = await ensureDbInitialized();
  await db.execute({
    sql: `INSERT INTO verifications (id, host, method, token)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET token = excluded.token`,
    args: [id, cleanHost, method, token],
  });

  const instructions =
    method === "dns"
      ? `Add a DNS TXT record to '${cleanHost}' with the exact value:\n${token}`
      : `Add the following HTML tag inside the <head> of 'https://${cleanHost}/':\n<meta name="site-agent-verify" content="${token}">`;

  return {
    verified: false,
    method,
    token,
    instructions,
  };
}

export async function verifyDomainOwnership(host: string, method: "dns" | "meta"): Promise<VerificationResult> {
  const cleanHost = normalizeHost(host);
  const token = generateVerificationToken(cleanHost);

  let isVerified = false;

  if (method === "meta") {
    try {
      const res = await fetch(`https://${cleanHost}/`, {
        headers: {
          "User-Agent": process.env.CRAWL_USER_AGENT || "SiteAgent/1.0 (+https://ais.studio)",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const html = await res.text();
        if (
          html.includes(`name="site-agent-verify" content="${token}"`) ||
          html.includes(`content="${token}" name="site-agent-verify"`) ||
          html.includes(token)
        ) {
          isVerified = true;
        }
      }
    } catch (err) {
      console.warn(`Meta verification failed for ${cleanHost}:`, err);
    }
  } else if (method === "dns") {
    // Check mock/DNS lookup or TXT record
    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=${cleanHost}&type=TXT`, {
        signal: AbortSignal.timeout(5000),
      });
      if (dnsRes.ok) {
        const dnsData = await dnsRes.json();
        const records = dnsData.Answer || [];
        for (const rec of records) {
          if (rec.data && rec.data.includes(token)) {
            isVerified = true;
            break;
          }
        }
      }
    } catch (err) {
      console.warn(`DNS TXT verification failed for ${cleanHost}:`, err);
    }
  }

  if (isVerified) {
    const db = await ensureDbInitialized();
    const id = `verif_${cleanHost}_${method}`;
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE verifications SET verified_at = ? WHERE host = ?`,
      args: [now, cleanHost],
    });

    await db.execute({
      sql: `INSERT INTO sites (id, host, verified_at)
            VALUES (?, ?, ?)
            ON CONFLICT(host) DO UPDATE SET verified_at = excluded.verified_at`,
      args: [`site_${cleanHost}`, cleanHost, now],
    });

    return {
      verified: true,
      method,
      token,
      verifiedAt: now,
      instructions: `Domain ownership verified successfully!`,
    };
  }

  return {
    verified: false,
    method,
    token,
    instructions: `Verification failed. Token '${token}' was not found via ${method.toUpperCase()}. Please check your configuration and try again.`,
  };
}
