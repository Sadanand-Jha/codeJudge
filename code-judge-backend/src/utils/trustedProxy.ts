// Trust boundary for Cloudflare-injected headers (CF-IPCountry, CF-Connecting-IP).
//
// GEO_TRUSTED_PROXY_IPS is a comma-separated list of exact IPs and/or CIDR
// ranges (IPv4 or IPv6). Headers are honored ONLY when the direct TCP peer
// (req.socket.remoteAddress, never X-Forwarded-For) matches this list.
// Anyone who can reach the origin directly could otherwise forge these headers.
import { BlockList, isIP } from "node:net";

/** Strips the IPv4-mapped IPv6 prefix and lowercases, so lookups compare consistently. */
export function normalizeIp(value: string): string {
  const ip = value.trim().toLowerCase();
  if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) return ip.slice(7);
  return ip;
}

let cachedRaw: string | null = null;
let cachedList: BlockList | null = null;

/**
 * Builds (and caches per env value) a BlockList from GEO_TRUSTED_PROXY_IPS.
 * Malformed entries are skipped with a warning rather than failing boot,
 * because an empty list simply disables header trust (fail-closed).
 */
function trustedList(): BlockList {
  const raw = process.env.GEO_TRUSTED_PROXY_IPS ?? "";
  if (cachedList && cachedRaw === raw) return cachedList;

  const list = new BlockList();
  for (const entry of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    const [address, prefixText, ...rest] = entry.split("/");
    const family = isIP(address ?? "");
    const type = family === 4 ? "ipv4" : "ipv6";
    const maxPrefix = family === 4 ? 32 : 128;
    const prefix = prefixText === undefined ? null : Number(prefixText);
    const valid =
      family !== 0 &&
      rest.length === 0 &&
      (prefix === null || (Number.isInteger(prefix) && prefix >= 0 && prefix <= maxPrefix));
    if (!valid) {
      console.warn(`GEO_TRUSTED_PROXY_IPS: ignoring invalid entry "${entry}"`);
      continue;
    }
    if (prefix === null) list.addAddress(normalizeIp(address), type);
    else list.addSubnet(normalizeIp(address), prefix, type);
  }

  cachedRaw = raw;
  cachedList = list;
  return list;
}

/** Returns true when the direct peer address is in GEO_TRUSTED_PROXY_IPS (exact or CIDR). */
export function isTrustedPeer(peerAddress: string | null | undefined): boolean {
  if (!peerAddress) return false;
  const ip = normalizeIp(peerAddress);
  const family = isIP(ip);
  if (family === 0) return false;
  try {
    return trustedList().check(ip, family === 4 ? "ipv4" : "ipv6");
  } catch {
    return false;
  }
}

/**
 * Returns the visitor IP from CF-Connecting-IP, but only when the direct peer
 * is a trusted Cloudflare/ingress address and the header is a valid IP literal.
 * Otherwise returns null and callers fall back to req.ip.
 */
export function connectingIpFromTrustedPeer(
  peerAddress: string | null | undefined,
  headerValue: string | string[] | undefined
): string | null {
  if (!isTrustedPeer(peerAddress)) return null;
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const ip = normalizeIp(value ?? "");
  return isIP(ip) !== 0 ? ip : null;
}
