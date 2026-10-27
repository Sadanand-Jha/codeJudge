"use client";

import { useAiAccess } from "@/hooks/useAiAccess";

export const FILE_UPLOAD_UPGRADE_MESSAGE =
  "File uploads are available on paid plans. Upgrade your plan to upload files.";
export const FILE_UPLOAD_UPGRADE_HREF = "/pricing";

export function useFileUploadAccess() {
  const access = useAiAccess();
  return {
    ...access,
    canUploadFiles: access.hasPaidPlan,
    isLoading: access.subscriptionLoading,
    upgradeHref: FILE_UPLOAD_UPGRADE_HREF,
    upgradeMessage: FILE_UPLOAD_UPGRADE_MESSAGE,
  };
}
