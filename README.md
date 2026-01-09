# Canvas Board

A frontend-only, Next.js-based canvas board for free-form notes, image pins, grouping, and versioned snapshots. Everything persists locally so you can close the tab and return to the exact layout later.

## Features
- Blank infinite canvas with pan (drag background) and scroll-to-zoom.
- Text and image pins with drag, resize (image pins respect natural min size), tag support, and color accents.
- Undo/redo for create, move, edit, delete, and snapshot restores.
- Snapshots: save named board states and restore later; snapshot list persists.
- Tag filter to quickly group related pins.
- Double-click background to drop a quick note at the cursor.
- LocalStorage persistence for board + snapshots.

## Quickstart
Prereqs: Node 20+ and npm (or pnpm/yarn).

```bash
cd canvas-board
npm install
npm run dev
# open http://localhost:3000
```

## Usage Tips
- Drag pins by their header; resize from the bottom-right handle.
- Double-click empty canvas area to create a pre-filled note at the cursor.
- Use the tag filter (top toolbar) to only render pins with that tag.
- Save snapshots from the right panel; restore or delete them anytime.
- Reset view realigns the viewport if you get lost after panning/zooming.

## Design Notes
- **State management:** a tiny reducer-powered store (`src/lib/boardStore.ts`) with bounded history for undo/redo and snapshot support. Persistence is via `localStorage` (present state + snapshots).
- **Layout/UX:** Tailwind for styling, a glassmorphic control bar anchored on the canvas, and a right-side inspector for the selected pin to avoid cluttering the canvas.
- **Performance:** positions are stored in world coordinates; viewport transform handles pan/zoom efficiently without recalculating pin layouts. History is capped to keep memory bounded.
- **Responsiveness:** layout adapts down to smaller screens; key controls remain accessible without nested menus.

## Deployment
Standard Next.js deployment works (Vercel/Netlify/etc.). Build with:
```bash
npm run build
npm start
```

The app is frontend-only and requires no backend services. All data is local to the browser.
