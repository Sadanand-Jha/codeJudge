import { SecureLogo } from "@/components/common/SecureLogo";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <SecureLogo variant="mark" size={44} className="animate-pulse" />
    </div>
  );
}
