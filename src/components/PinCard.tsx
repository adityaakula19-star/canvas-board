"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { Pin, Viewport, Vec2, Size } from "@/lib/types";

type Props = {
  pin: Pin;
  viewport: Viewport;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMoveEnd: (id: string, position: Vec2) => void;
  onResizeEnd: (pin: Pin, size: Size) => void;
  onDelete: (id: string) => void;
};

const MIN_SIZE = { w: 160, h: 120 };

export function PinCard({
  pin,
  viewport,
  isSelected,
  onSelect,
  onMoveEnd,
  onResizeEnd,
  onDelete
}: Props) {
  const [previewPos, setPreviewPos] = useState<Vec2 | null>(null);
  const [previewSize, setPreviewSize] = useState<Size | null>(null);
  const previewPosRef = useRef<Vec2 | null>(null);
  const previewSizeRef = useRef<Size | null>(null);
  const dragRef = useRef<{
    start: Vec2;
    origin: Vec2;
  } | null>(null);

  const resizeRef = useRef<{
    start: Vec2;
    origin: Size;
  } | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    onSelect(pin.id);
    dragRef.current = {
      start: { x: event.clientX, y: event.clientY },
      origin: { ...pin.position }
    };
    const moveListener = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (e.clientX - dragRef.current.start.x) / viewport.scale;
      const dy = (e.clientY - dragRef.current.start.y) / viewport.scale;
      const nextPos = {
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy
      };
      previewPosRef.current = nextPos;
      setPreviewPos(nextPos);
    };
    const upListener = () => {
      if (dragRef.current && previewPosRef.current) {
        onMoveEnd(pin.id, previewPosRef.current);
      }
      dragRef.current = null;
      setPreviewPos(null);
      previewPosRef.current = null;
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
    };
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const handleResizeStart = (event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    resizeRef.current = {
      start: { x: event.clientX, y: event.clientY },
      origin: { ...pin.size }
    };
    const moveListener = (e: PointerEvent) => {
      if (!resizeRef.current) return;
      const dx = (e.clientX - resizeRef.current.start.x) / viewport.scale;
      const dy = (e.clientY - resizeRef.current.start.y) / viewport.scale;
      const minW = Math.max(MIN_SIZE.w, pin.minSize?.w ?? MIN_SIZE.w);
      const minH = Math.max(MIN_SIZE.h, pin.minSize?.h ?? MIN_SIZE.h);
      const nextSize = {
        w: Math.max(minW, Math.round(resizeRef.current.origin.w + dx)),
        h: Math.max(minH, Math.round(resizeRef.current.origin.h + dy))
      };
      previewSizeRef.current = nextSize;
      setPreviewSize(nextSize);
    };
    const upListener = () => {
      if (resizeRef.current && previewSizeRef.current) {
        onResizeEnd(pin, previewSizeRef.current);
      }
      resizeRef.current = null;
      setPreviewSize(null);
      previewSizeRef.current = null;
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
    };
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const activePos = previewPos ?? pin.position;
  const activeSize = previewSize ?? pin.size;

  return (
    <div
      ref={cardRef}
      style={{
        transform: `translate(${activePos.x}px, ${activePos.y}px)`,
        width: activeSize.w,
        height: activeSize.h
      }}
      data-pin-card="true"
      className={clsx(
        "absolute rounded-xl glass border border-white/10 shadow-lg cursor-grab",
        isSelected ? "ring-2 ring-accent" : "ring-1 ring-transparent"
      )}
      onPointerDown={handlePointerDown}
    >
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl"
        style={{ background: pin.color }}
      >
        <div className="text-sm font-semibold truncate pr-2">{pin.title || "Untitled"}</div>
        <div className="flex items-center gap-2">
          {!!pin.tags.length && (
            <div className="hidden md:flex gap-1">
              {pin.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] uppercase tracking-wide bg-black/20 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <button
            className="text-xs px-2 py-1 bg-black/25 rounded-md hover:bg-black/40 transition"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pin.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="p-3 overflow-hidden h-[calc(100%-46px)]">
        {pin.kind === "text" ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words h-full overflow-auto scrollbar-thin">
            {pin.body || "Click to edit in the panel on the right."}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {pin.imageUrl ? (
              <img
                src={pin.imageUrl}
                alt={pin.title}
                className="object-contain w-full h-full rounded-lg select-none"
                draggable={false}
                onLoad={(event) => {
                  const img = event.currentTarget;
                  const naturalSize = {
                    w: Math.max(img.naturalWidth, MIN_SIZE.w),
                    h: Math.max(img.naturalHeight, MIN_SIZE.h)
                  };
                  if (
                    (!pin.minSize ||
                      pin.minSize.w !== naturalSize.w ||
                      pin.minSize.h !== naturalSize.h) &&
                    naturalSize.w > 0 &&
                    naturalSize.h > 0
                  ) {
                    onResizeEnd(pin, {
                      w: Math.max(pin.size.w, naturalSize.w),
                      h: Math.max(pin.size.h, naturalSize.h)
                    });
                  }
                }}
              />
            ) : (
              <div className="text-xs text-white/60">Add an image URL in the details panel.</div>
            )}
          </div>
        )}
      </div>

      <div
        onPointerDown={handleResizeStart}
        className="absolute bottom-1 right-1 w-4 h-4 bg-white/80 rounded-md cursor-se-resize shadow"
        title="Drag to resize"
      />
    </div>
  );
}
