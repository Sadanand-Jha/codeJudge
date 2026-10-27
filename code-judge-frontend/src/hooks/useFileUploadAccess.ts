"use client";

import { useMySubscription } from "@/hooks/useMySubscription";

export const FILE_UPLOAD_UPGRADE_MESSAGE =
  "File uploads are available on paid plans. Upgrade your plan to upload files.";
export const FILE_UPLOAD_UPGRADE_HREF = "/pricing";

export function useFileUploadAccess() {
  const { subscription, isLoading } = useMySubscription();
  return {
    canUploadFiles: subscription?.isPaid === true,
    isLoading,
    upgradeHref: FILE_UPLOAD_UPGRADE_HREF,
    upgradeMessage: FILE_UPLOAD_UPGRADE_MESSAGE,
  };
}
