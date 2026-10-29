import type { KdfParams } from "@/lib/crypto";
import { useKekStore } from "@/store/kekStore";
import { useKekGateStore } from "@/store/kekGateStore";

export function hasUnlockedKek(): boolean {
  return useKekStore.getState().getKek() !== null;
}

export async function requireKek(): Promise<CryptoKey> {
  const existing = useKekStore.getState().getKek();
  if (existing) return existing;
  return useKekGateStore.getState().request();
}

export function setUnlockedKek(kek: CryptoKey, kdf: KdfParams): void {
  useKekStore.getState().setKek(kek, kdf);
}

export function lockKek(): void {
  useKekStore.getState().lock();
}
