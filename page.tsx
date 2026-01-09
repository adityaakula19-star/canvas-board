"use client";

import { useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { PinCard } from "@/components/PinCard";
import { useBoardStore } from "@/lib/boardStore";
import type { Pin, Vec2, Viewport } from "@/lib/types";

const colors = ["#38bdf8", "#a855f7", "#f59e0b", "#10b981", "#ef4444", "#14b8a6"];
const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

const defaultTextSize = { w: 260, h: 200 };
const defaultImageSize = { w: 320, h: 240 };

type FormState = {
  title: string;
  body: string;
  tags: string;
  url?: string;
};

const toTagArray = (value: string) =>
  value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const toWorldPoint = (client: Vec2, viewport: Viewport, rect: DOMRect): Vec2 => {
  return {
    x: (client.x - rect.left - viewport.offset.x) / viewport.scale,
    y: (client.y - rect.top - viewport.offset.y) / viewport.scale
  };
};

export default function Home() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const {
    state,
    addPin,
    movePin,
    updatePin,
    deletePin,
    selectPin,
    setViewport,
    setFilter,
    undo,
    redo,
    saveSnapshot,
    restoreSnapshot,
    deleteSnapshot
  } = useBoardStore();
  const [textForm, setTextForm] = useState<FormState>({
    title: "Quick note",
    body: "",
    tags: ""
  });
  const [imageForm, setImageForm] = useState<FormState>({
    title: "Image",
    body: "",
    tags: "",
    url: ""
  });
  const [snapshotName, setSnapshotName] = useState("Snapshot");

  const { pins, selectedId, filterTag, viewport } = state.present;
  const selectedPin = pins.find((p) => p.id === selectedId);
  const visiblePins = useMemo(() => {
    if (!filterTag) return pins;
    return pins.filter((p) => p.tags.includes(filterTag));
  }, [pins, filterTag]);

  const createPin = (kind: Pin["kind"], position?: Vec2, extra?: Partial<Pin>) => {
    const now = Date.now();
    const basePos =
      position ??
      toWorldPoint(
        { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        viewport,
        boardRef.current?.getBoundingClientRect() ?? new DOMRect()
      );
    const pin: Pin = {
      id: uuid(),
      kind,
      title: extra?.title ?? (kind === "text" ? "New note" : "New image"),
      body: kind === "text" ? extra?.body ?? "" : undefined,
      imageUrl: kind === "image" ? extra?.imageUrl ?? "" : undefined,
      position: basePos,
      size: kind === "text" ? defaultTextSize : defaultImageSize,
      minSize: kind === "image" ? defaultImageSize : undefined,
      tags: extra?.tags ?? [],
      color: extra?.color ?? randomColor(),
      createdAt: now,
      updatedAt: now
    };
    addPin(pin);
  };

  const handleAddText = () => {
    createPin("text", undefined, {
      title: textForm.title || "Note",
      body: textForm.body,
      tags: toTagArray(textForm.tags)
    });
    setTextForm((prev) => ({ ...prev, body: "" }));
  };

  const handleAddImage = () => {
    createPin("image", undefined, {
      title: imageForm.title || "Image",
      imageUrl: imageForm.url,
      tags: toTagArray(imageForm.tags)
    });
    setImageForm((prev) => ({ ...prev, url: "" }));
  };

  const panningRef = useRef<{ start: Vec2; origin: Vec2 } | null>(null);

  const startPanning = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-pin-card]") || target.closest("[data-toolbar]")) return;
    const start = { x: event.clientX, y: event.clientY };
    panningRef.current = { start, origin: viewport.offset };
    window.addEventListener("pointermove", handlePanMove);
    window.addEventListener("pointerup", stopPanning);
  };

  const handlePanMove = (event: PointerEvent) => {
    if (!panningRef.current) return;
    const dx = event.clientX - panningRef.current.start.x;
    const dy = event.clientY - panningRef.current.start.y;
    setViewport({
      ...viewport,
      offset: {
        x: panningRef.current.origin.x + dx,
        y: panningRef.current.origin.y + dy
      }
    });
  };

  const stopPanning = () => {
    panningRef.current = null;
    window.removeEventListener("pointermove", handlePanMove);
    window.removeEventListener("pointerup", stopPanning);
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const delta = -event.deltaY * 0.001;
    const nextScale = Math.min(2.5, Math.max(0.5, viewport.scale * (1 + delta)));
    const worldPos = toWorldPoint(point, viewport, rect);
    const nextOffset = {
      x: point.x - worldPos.x * nextScale,
      y: point.y - worldPos.y * nextScale
    };
    setViewport({ offset: nextOffset, scale: nextScale });
  };

  const handleBackgroundDoubleClick = (event: React.MouseEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const world = toWorldPoint({ x: event.clientX, y: event.clientY }, viewport, rect);
    createPin("text", world, {
      title: "New note",
      body: "Start typing...",
      tags: filterTag ? [filterTag] : []
    });
  };

  const updateSelected = (partial: Partial<Pin>) => {
    if (!selectedPin) return;
    updatePin({ ...selectedPin, ...partial, updatedAt: Date.now() });
  };

  const resetView = () => setViewport({ offset: { x: 0, y: 0 }, scale: 1 });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Canvas Board</h1>
          <p className="text-white/60 text-sm">
            Drag, zoom, snapshot, and persist your ideas across sessions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={undo}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Undo
          </button>
          <button
            onClick={redo}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Redo
          </button>
          <button
            onClick={resetView}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
          >
            Reset view
          </button>
        </div>
      </header>

      <main className="flex flex-1 gap-4 px-4 pb-4">
        <section className="flex-1 rounded-2xl glass relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#334155_1px,transparent_0)] bg-[length:28px_28px] pointer-events-none" />
          <div
            className="absolute top-0 left-0 right-0 p-3 flex flex-wrap gap-3 z-10 pointer-events-none"
            data-toolbar="true"
          >
            <div className="glass rounded-xl p-3 flex flex-col gap-2 max-w-xl w-full md:w-auto pointer-events-auto">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Add note</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddText}
                    className="px-3 py-1.5 rounded-md bg-accent text-black font-semibold"
                  >
                    Add text
                  </button>
                  <button
                    onClick={handleAddImage}
                    className="px-3 py-1.5 rounded-md bg-accent-2 text-white font-semibold"
                  >
                    Add image
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  placeholder="Note title"
                  value={textForm.title}
                  onChange={(e) => setTextForm((p) => ({ ...p, title: e.target.value }))}
                />
                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  placeholder="Tags (comma separated)"
                  value={textForm.tags}
                  onChange={(e) => setTextForm((p) => ({ ...p, tags: e.target.value }))}
                />
              </div>
              <textarea
                className="glass rounded-md px-3 py-2 text-sm resize-none"
                rows={3}
                placeholder="Body text"
                value={textForm.body}
                onChange={(e) => setTextForm((p) => ({ ...p, body: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  placeholder="Image title"
                  value={imageForm.title}
                  onChange={(e) => setImageForm((p) => ({ ...p, title: e.target.value }))}
                />
                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  placeholder="Image URL"
                  value={imageForm.url}
                  onChange={(e) => setImageForm((p) => ({ ...p, url: e.target.value }))}
                />
              </div>
              <input
                className="glass rounded-md px-3 py-2 text-sm"
                placeholder="Image tags (comma separated)"
                value={imageForm.tags}
                onChange={(e) => setImageForm((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>

            <div className="glass rounded-xl p-3 flex items-center gap-3 pointer-events-auto">
              <input
                className="glass rounded-md px-3 py-2 text-sm min-w-[200px]"
                placeholder="Filter by tag"
                value={filterTag ?? ""}
                onChange={(e) => setFilter(e.target.value)}
              />
              {filterTag && (
                <button
                  onClick={() => setFilter(undefined)}
                  className="px-2 py-1 rounded-md bg-white/10 text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div
            ref={boardRef}
            className="relative h-full w-full overflow-hidden"
            onPointerDown={startPanning}
            onWheel={handleWheel}
            onDoubleClick={handleBackgroundDoubleClick}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${viewport.offset.x}px, ${viewport.offset.y}px) scale(${viewport.scale})`,
                transformOrigin: "0 0"
              }}
            >
              {visiblePins.map((pin) => (
                <PinCard
                  key={pin.id}
                  pin={pin}
                  viewport={viewport}
                  isSelected={pin.id === selectedId}
                  onSelect={selectPin}
                  onMoveEnd={movePin}
                  onResizeEnd={(p, size) => updatePin({ ...p, size, minSize: p.minSize ?? size })}
                  onDelete={deletePin}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="w-full md:w-96 glass rounded-2xl p-4 flex flex-col gap-4">
          <div>
            <h3 className="font-semibold mb-2">Snapshots</h3>
            <div className="flex gap-2 mb-3">
              <input
                className="glass rounded-md px-3 py-2 text-sm flex-1"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
              />
              <button
                onClick={() => {
                  if (snapshotName.trim()) {
                    saveSnapshot(snapshotName.trim());
                    setSnapshotName("Snapshot");
                  }
                }}
                className="px-3 py-2 bg-accent text-black rounded-md font-semibold"
              >
                Save
              </button>
            </div>
            <div className="max-h-52 overflow-auto scrollbar-thin flex flex-col gap-2">
              {state.snapshots.length === 0 && (
                <p className="text-white/60 text-sm">No snapshots yet.</p>
              )}
              {state.snapshots
                .slice()
                .sort((a, b) => b.savedAt - a.savedAt)
                .map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
                  >
                    <div>
                      <div className="font-semibold text-sm">{snap.name}</div>
                      <div className="text-[11px] text-white/60">
                        {new Date(snap.savedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-sm px-2 py-1 bg-white/10 rounded-md"
                        onClick={() => restoreSnapshot(snap.id)}
                      >
                        Restore
                      </button>
                      <button
                        className="text-sm px-2 py-1 bg-white/10 rounded-md"
                        onClick={() => deleteSnapshot(snap.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <h3 className="font-semibold mb-2">Selected pin</h3>
            {!selectedPin ? (
              <p className="text-white/60 text-sm">Select a pin to edit its content.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  value={selectedPin.title}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="Title"
                />
                {selectedPin.kind === "text" ? (
                  <textarea
                    className="glass rounded-md px-3 py-2 text-sm resize-none"
                    rows={4}
                    value={selectedPin.body ?? ""}
                    onChange={(e) => updateSelected({ body: e.target.value })}
                    placeholder="Body"
                  />
                ) : (
                  <input
                    className="glass rounded-md px-3 py-2 text-sm"
                    value={selectedPin.imageUrl ?? ""}
                    onChange={(e) => updateSelected({ imageUrl: e.target.value })}
                    placeholder="Image URL"
                  />
                )}

                <input
                  className="glass rounded-md px-3 py-2 text-sm"
                  value={selectedPin.tags.join(", ")}
                  onChange={(e) => updateSelected({ tags: toTagArray(e.target.value) })}
                  placeholder="Tags"
                />

                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-white/60">Width</label>
                  <label className="text-xs text-white/60">Height</label>
                  <input
                    type="number"
                    min={selectedPin.minSize?.w ?? 160}
                    className="glass rounded-md px-3 py-2 text-sm"
                    value={selectedPin.size.w}
                    onChange={(e) =>
                      updateSelected({
                        size: {
                          ...selectedPin.size,
                          w: Math.max(selectedPin.minSize?.w ?? 160, Number(e.target.value))
                        }
                      })
                    }
                  />
                  <input
                    type="number"
                    min={selectedPin.minSize?.h ?? 120}
                    className="glass rounded-md px-3 py-2 text-sm"
                    value={selectedPin.size.h}
                    onChange={(e) =>
                      updateSelected({
                        size: {
                          ...selectedPin.size,
                          h: Math.max(selectedPin.minSize?.h ?? 120, Number(e.target.value))
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/60">Accent</label>
                  <input
                    type="color"
                    value={selectedPin.color}
                    onChange={(e) => updateSelected({ color: e.target.value })}
                    className="h-9 w-16 rounded"
                  />
                  <div className="flex gap-1">
                    {colors.map((c) => (
                      <button
                        key={c}
                        className="w-7 h-7 rounded-full border border-white/20"
                        style={{ background: c }}
                        onClick={() => updateSelected({ color: c })}
                        aria-label={`Use color ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => deletePin(selectedPin.id)}
                    className="px-3 py-2 bg-red-500/80 hover:bg-red-500 rounded-md text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
