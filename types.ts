export type PinKind = "text" | "image";

export type Vec2 = { x: number; y: number };

export type Size = { w: number; h: number };

export type Pin = {
  id: string;
  kind: PinKind;
  title: string;
  body?: string;
  imageUrl?: string;
  position: Vec2;
  size: Size;
  minSize?: Size;
  tags: string[];
  color: string;
  createdAt: number;
  updatedAt: number;
};

export type Snapshot = {
  id: string;
  name: string;
  savedAt: number;
  state: BoardCore;
};

export type Viewport = {
  offset: Vec2;
  scale: number;
};

export type BoardCore = {
  pins: Pin[];
  selectedId?: string;
  filterTag?: string;
  viewport: Viewport;
};

export type BoardState = {
  present: BoardCore;
  past: BoardCore[];
  future: BoardCore[];
  snapshots: Snapshot[];
};

export type BoardAction =
  | { type: "ADD_PIN"; payload: Pin }
  | { type: "UPDATE_PIN"; payload: Pin }
  | { type: "MOVE_PIN"; payload: { id: string; position: Vec2 } }
  | { type: "DELETE_PIN"; payload: { id: string } }
  | { type: "SELECT_PIN"; payload?: { id?: string } }
  | { type: "SET_VIEWPORT"; payload: Viewport }
  | { type: "SET_FILTER"; payload?: string }
  | { type: "SAVE_SNAPSHOT"; payload: Snapshot }
  | { type: "RESTORE_SNAPSHOT"; payload: { id: string } }
  | { type: "DELETE_SNAPSHOT"; payload: { id: string } }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD_FROM_STORAGE"; payload: { core: BoardCore; snapshots: Snapshot[] } };
