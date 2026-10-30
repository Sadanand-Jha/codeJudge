"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChooseLetterheadDialog } from "@/components/letterheads/ChooseLetterheadDialog";
import { canUseCustomHeader } from "@/lib/planAccess";
import { listLetterheads } from "@/services/letterheads";
import { getMySubscription } from "@/services/user";
import { prepareHeaderPlacement } from "@/utils/letterheadLayout";
import type { HeaderPlacement, Letterhead } from "@/types/letterhead";

export type LetterheadChoice =
  | { status: "selected"; placement: HeaderPlacement | null }
  | { status: "cancelled" };

async function placementFor(letterhead: Letterhead): Promise<HeaderPlacement | null> {
  try {
    return await prepareHeaderPlacement(letterhead.cloudinary, letterhead.headerConfig);
  } catch {
    return null;
  }
}

export function useLetterheadChoice() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogLetterheads, setDialogLetterheads] = useState<Letterhead[]>([]);
  const resolverRef = useRef<((choice: LetterheadChoice) => void) | null>(null);

  const settle = useCallback((choice: LetterheadChoice) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOpen(false);
    setSubmitting(false);
    resolve?.(choice);
  }, []);

  const chooseHeader = useCallback(
    async (knownLetterheads?: Letterhead[]): Promise<LetterheadChoice> => {
      if (resolverRef.current) return { status: "cancelled" };
      try {
        const subscription = await getMySubscription();
        if (!canUseCustomHeader(subscription)) {
          return { status: "selected", placement: null };
        }
        const letterheads =
          knownLetterheads ?? (await listLetterheads()).letterheads;
        if (letterheads.length === 0) {
          return { status: "selected", placement: null };
        }
        if (letterheads.length === 1) {
          return {
            status: "selected",
            placement: await placementFor(letterheads[0]),
          };
        }
        setDialogLetterheads(letterheads);
        setOpen(true);
        return await new Promise<LetterheadChoice>((resolve) => {
          resolverRef.current = resolve;
        });
      } catch {
        return { status: "selected", placement: null };
      }
    },
    []
  );

  const handleSelect = useCallback(
    async (letterhead: Letterhead | null) => {
      if (submitting) return;
      if (!letterhead) {
        settle({ status: "selected", placement: null });
        return;
      }
      setSubmitting(true);
      const placement = await placementFor(letterhead);
      settle({ status: "selected", placement });
    },
    [settle, submitting]
  );

  useEffect(
    () => () => {
      resolverRef.current?.({ status: "cancelled" });
      resolverRef.current = null;
    },
    []
  );

  const dialog = (
    <ChooseLetterheadDialog
      open={open}
      letterheads={dialogLetterheads}
      submitting={submitting}
      onSelect={(letterhead) => void handleSelect(letterhead)}
      onClose={() => settle({ status: "cancelled" })}
    />
  );

  return { chooseHeader, dialog };
}
