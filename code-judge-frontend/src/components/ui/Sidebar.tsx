"use client";

import { ReactNode, Ref, forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import { cn } from "@/lib/helpers";

interface SidebarProps {
  children: ReactNode;
  className?: string;
  dataSidebar?: string;
}

/**
 * Reusable sidebar wrapper that prevents native browser dragging
 * on all sidebar elements (links, buttons, icons, text, images).
 * 
 * Usage:
 * <Sidebar className="your-custom-classes">
 *   <nav>...</nav>
 * </Sidebar>
 */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { children, className, dataSidebar = "true" },
  forwardedRef: Ref<HTMLElement>
) {
  const sidebarRef = useRef<HTMLElement>(null);
  useImperativeHandle(forwardedRef, () => sidebarRef.current as HTMLElement);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    // Prevent drag on all interactive elements inside sidebar
    const preventDrag = (e: DragEvent) => {
      // Only prevent if the drag originates from within sidebar
      if (e.target instanceof HTMLElement) {
        const isInteractive = e.target.closest('a, button, [role="button"], img, svg, input, textarea, select');
        if (isInteractive) {
          e.preventDefault();
        }
      }
    };

    const preventDragStart = (e: DragEvent) => {
      if (e.target instanceof HTMLElement) {
        // Allow drag only for explicit draggable elements (not in sidebar)
        const isExplicitlyDraggable = e.target.closest('[draggable="true"]');
        if (!isExplicitlyDraggable) {
          e.preventDefault();
        }
      }
    };

    // Use capture phase to intercept before child handlers
    el.addEventListener('dragstart', preventDragStart, true);
    el.addEventListener('drag', preventDrag, true);

    return () => {
      el.removeEventListener('dragstart', preventDragStart, true);
      el.removeEventListener('drag', preventDrag, true);
    };
  }, []);

  return (
    <aside
      ref={sidebarRef}
      data-sidebar={dataSidebar}
      className={cn(
        "select-none",
        "[&_*]:draggable-false",
        "[&_img]:draggable-false",
        "[&_svg]:draggable-false",
        className
      )}
      onDragStart={(e) => {
        // Prevent drag from sidebar container itself
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
    >
      {children}
    </aside>
  );
});

export default Sidebar;