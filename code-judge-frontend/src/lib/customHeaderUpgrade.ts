export const CUSTOM_HEADER_UPGRADE_EVENT = "quizsupport:custom-header-upgrade";

export interface CustomHeaderUpgradeDetail {
  onContinueStandard?: () => void;
}

/** Open the Pro letterhead upgrade prompt from anywhere in the client. */
export function showCustomHeaderUpgrade(detail: CustomHeaderUpgradeDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CustomHeaderUpgradeDetail>(CUSTOM_HEADER_UPGRADE_EVENT, { detail })
  );
}
