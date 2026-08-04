'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { renderSecureImage, type SecureMediaOptions } from '@/services/secureMedia';

interface SecureCanvasProps extends SecureMediaOptions {
  /** Image name/path to load from secure media endpoint */
  imageName: string;
  /** Optional fallback content while loading */
  fallback?: React.ReactNode;
  /** Optional error display component */
  errorComponent?: (error: string) => React.ReactNode;
  /** Called when image successfully loads */
  onLoad?: () => void;
  /** Called when image fails to load */
  onError?: (error: string) => void;
}

/**
 * SecureCanvas Component
 * 
 * Renders encrypted images onto a canvas element with protection against:
 * - Right-click context menu
 * - Drag and drop
 * - Direct URL inspection (images are encrypted in transit)
 * 
 * @example
 * ```tsx
 * <SecureCanvas
 *   imageName="hero-banner.png"
 *   width={800}
 *   height={400}
 *   className="rounded-lg"
 * />
 * ```
 */
export function SecureCanvas({
  imageName,
  width = 300,
  height = 200,
  alt = 'Secure Image',
  className = '',
  fallback,
  errorComponent,
  onLoad,
  onError,
}: SecureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadImage = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      await renderSecureImage(imageName, canvasRef.current, {
        width,
        height,
        alt,
        className,
      });
      onLoad?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [imageName, width, height, alt, className, onLoad, onError]);

  // Load image when component mounts or imageName changes
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Block right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // Block drag start
  const handleDragStart = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // Block keyboard shortcuts for screenshots/downloads (best effort)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    // Block Ctrl+S, Ctrl+U, F12, Ctrl+Shift+I (common dev tools/screenshot shortcuts)
    if (
      (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'u' || e.key === 'p')
    ) {
      e.preventDefault();
    }
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
      e.preventDefault();
    }
  }, []);

  const canvasStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={`secure-canvas-container ${className}`} style={canvasStyle}>
      {isLoading && fallback && <div className="secure-canvas-fallback">{fallback}</div>}
      
      {error && (
        <div className="secure-canvas-error">
          {errorComponent ? errorComponent(error) : <p className="text-red-500">Error: {error}</p>}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        aria-label={alt}
        className="secure-canvas"
        style={{
          ...canvasStyle,
          display: isLoading || error ? 'none' : 'block',
        }}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onKeyDown={handleKeyDown}
        tabIndex={-1} // Make focusable for keyboard events but not in tab order
      />
    </div>
  );
}

export default SecureCanvas;