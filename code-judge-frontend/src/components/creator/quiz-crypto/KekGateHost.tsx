"use client";

import { KekGateDialog } from "./KekGateDialog";
import { useKekGateStore } from "@/store/kekGateStore";
import { setUnlockedKek } from "@/lib/quizKek";

export function KekGateHost() {
  const open = useKekGateStore((state) => state.open);
  const mode = useKekGateStore((state) => state.mode);
  const config = useKekGateStore((state) => state.config);
  const complete = useKekGateStore((state) => state.complete);
  const cancel = useKekGateStore((state) => state.cancel);

  return (
    <KekGateDialog
      key={open ? mode ?? "open" : "closed"}
      open={open}
      mode={mode}
      config={config}
      onComplete={(kek, kdf) => {
        setUnlockedKek(kek, kdf);
        complete(kek);
      }}
      onCancel={cancel}
    />
  );
}
