declare module "react-katex" {
  import { ComponentPropsWithoutRef, FC } from "react";

  interface KatexOptions {
    throwOnError?: boolean;
    errorColor?: string;
    trust?: boolean;
    macros?: Record<string, string>;
    displayMode?: boolean;
  }

  interface InlineMathProps extends ComponentPropsWithoutRef<"span"> {
    math: string;
    renderMode?: "html" | "mathml" | "htmlAndMathml";
  }

  interface BlockMathProps extends ComponentPropsWithoutRef<"div"> {
    math: string;
    renderMode?: "html" | "mathml" | "htmlAndMathml";
  }

  export const InlineMath: FC<InlineMathProps & KatexOptions>;
  export const BlockMath: FC<BlockMathProps & KatexOptions>;
}