// Maps a verified provider identity to the existing users table. First login
// creates the user; later logins update the same row. Emails are linked only
// after the provider has confirmed they are verified (enforced in oauth.ts).
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { oauthRepository, type OAuthUserRow } from "../repositories/oauth.repository.ts";
import type { OAuthProfile } from "../types/oauth.ts";

const BCRYPT_SALT_ROUNDS = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10) || 10;

function baseUsername(profile: OAuthProfile): string {
  const source = profile.name || profile.email.split("@")[0] || "user";
  let base = source.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base.length < 3) base = `user${base}`;
  return base.slice(0, 16);
}

function candidateUsername(base: string, attempt: number): string {
  if (attempt === 0) return base;
  const suffix = crypto.randomBytes(3).toString("hex").slice(0, 4);
  return `${base.slice(0, 20 - suffix.length)}${suffix}`;
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const candidate = error as { code?: string; constraint?: string } | null;
  return candidate?.code === "23505" && candidate.constraint === constraint;
}

export async function upsertOAuthUser(profile: OAuthProfile): Promise<OAuthUserRow> {
  const existingByProvider = await oauthRepository.findByProvider(profile.provider, profile.providerUserId);
  if (existingByProvider) {
    return oauthRepository.update(existingByProvider.id, profile);
  }

  // Verified provider email matches an existing password/other-provider
  // account: link it rather than creating a duplicate identity.
  const existingByEmail = await oauthRepository.findByEmail(profile.email);
  if (existingByEmail) {
    return oauthRepository.update(existingByEmail.id, profile);
  }

  // OAuth users cannot use password login. Store a valid bcrypt hash of random
  // bytes so the existing bcrypt.compare path fails cleanly instead of
  // encountering a malformed hash.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), BCRYPT_SALT_ROUNDS);
  const base = baseUsername(profile);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const username = candidateUsername(base, attempt);
    if (await oauthRepository.usernameExists(username)) continue;

    try {
      return await oauthRepository.create(profile, username, passwordHash);
    } catch (error) {
      // A concurrent first login may have created the provider identity or the
      // username between the checks above.
      if (isUniqueViolation(error, "idx_users_oauth_identity")) {
        const linked = await oauthRepository.findByProvider(profile.provider, profile.providerUserId);
        if (linked) return oauthRepository.update(linked.id, profile);
      }
      if (isUniqueViolation(error, "idx_users_username_lower_unique")) continue;
      throw error;
    }
  }

  throw new Error("Could not allocate a unique username for the OAuth user");
}
