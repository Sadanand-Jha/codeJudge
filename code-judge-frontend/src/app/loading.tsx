import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="animate-pulse motion-reduce:animate-none" />
    </div>
  );
}
