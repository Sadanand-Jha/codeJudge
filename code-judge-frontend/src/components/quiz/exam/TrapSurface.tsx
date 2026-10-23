import type { CSSProperties, Ref } from "react";

export interface TrapSurfaceProps {
  placement: string;
  style: CSSProperties;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * The only DOM node used by the AI trap. It has no children, no aria label,
 * no title and no comment so the text exists solely inside the SVG background.
 */
export function TrapSurface({ placement, style, className, ref }: TrapSurfaceProps) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-trap-placement={placement}
      className={className}
      style={style}
    />
  );
}
