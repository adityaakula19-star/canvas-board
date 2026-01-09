import { useEffect, useMemo, useReducer } from "react";
import { v4 as uuid } from "uuid";
import type {
  BoardAction,
  BoardCore,
  BoardState,
  Pin,
  Snapshot,
  Vec2,
  Viewport
} from "./types";

const STORAGE_KEY = "canvas-board/state";
const SNAPSHOT_KEY = "canvas-board/snapshots";
const HISTORY_LIMIT = 120;

const defaultViewport: Viewport = {
  offset: { x: 0, y: 0 },
  scale: 1
};

const defaultPresent: BoardCore = {
  pins: [],
  selectedId: undefined,
  filterTag: undefined,
  viewport: defaultViewport
};

const defaultState: BoardState = {
  present: defaultPresent,
  past: [],
  future: [],
  snapshots: []
};

const cloneCore = (core: BoardCore): BoardCore => ({
  ...core,
  pins: core.pins.map((p) => ({ ...p }))
});

const pushHistory = (state: BoardState, next: BoardCore): BoardState => {
  const nextPast = [...state.past, state.present].slice(-HISTORY_LIMIT);
  return {
    past: nextPast,
    present: next,
    future: [],
    snapshots: state.snapshots
  };
};

const reducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case "LOAD_FROM_STORAGE":
      return {
        ...state,
        present: cloneCore(action.payload.core),
        snapshots: action.payload.snapshots
      };
    case "ADD_PIN": {
      const nextPresent: BoardCore = {
        ...state.present,
        pins: [...state.present.pins, action.payload],
        selectedId: action.payload.id
      };
      return pushHistory(state, nextPresent);
    }
    case "UPDATE_PIN": {
      const nextPresent: BoardCore = {
        ...state.present,
        pins: state.present.pins.map((p) =>
          p.id === action.payload.id ? { ...action.payload, updatedAt: Date.now() } : p
        )
      };
      return pushHistory(state, nextPresent);
    }
    case "MOVE_PIN": {
      const nextPresent: BoardCore = {
        ...state.present,
        pins: state.present.pins.map((p) =>
          p.id === action.payload.id
            ? { ...p, position: action.payload.position, updatedAt: Date.now() }
            : p
        )
      };
      return pushHistory(state, nextPresent);
    }
    case "DELETE_PIN": {
      const filtered = state.present.pins.filter((p) => p.id !== action.payload.id);
      const nextPresent: BoardCore = {
        ...state.present,
        pins: filtered,
        selectedId:
          state.present.selectedId === action.payload.id
            ? filtered.at(-1)?.id
            : state.present.selectedId
      };
      return pushHistory(state, nextPresent);
    }
    case "SELECT_PIN": {
      return {
        ...state,
        present: {
          ...state.present,
          selectedId: action.payload?.id
        }
      };
    }
    case "SET_VIEWPORT": {
      return {
        ...state,
        present: {
          ...state.present,
          viewport: action.payload
        }
      };
    }
    case "SET_FILTER": {
      return {
        ...state,
        present: {
          ...state.present,
          filterTag: action.payload?.trim() || undefined
        }
      };
    }
    case "SAVE_SNAPSHOT": {
      const existing = state.snapshots.filter((s) => s.id !== action.payload.id);
      return {
        ...state,
        snapshots: [...existing, action.payload]
      };
    }
    case "DELETE_SNAPSHOT": {
      return {
        ...state,
        snapshots: state.snapshots.filter((s) => s.id !== action.payload.id)
      };
    }
    case "RESTORE_SNAPSHOT": {
      const snapshot = state.snapshots.find((s) => s.id === action.payload.id);
      if (!snapshot) return state;
      const core = cloneCore(snapshot.state);
      return pushHistory(state, core);
    }
    case "UNDO": {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
        snapshots: state.snapshots
      };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: newFuture,
        snapshots: state.snapshots
      };
    }
    default:
      return state;
  }
};

const loadFromStorage = (): BoardState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawSnapshots = localStorage.getItem(SNAPSHOT_KEY);
    const parsedCore = raw ? (JSON.parse(raw) as BoardCore) : defaultPresent;
    const parsedSnapshots = rawSnapshots ? (JSON.parse(rawSnapshots) as Snapshot[]) : [];
    return {
      present: {
        ...defaultPresent,
        ...parsedCore,
        viewport: parsedCore?.viewport ?? defaultViewport
      },
      past: [],
      future: [],
      snapshots: parsedSnapshots
    };
  } catch {
    return defaultState;
  }
};

export const useBoardStore = () => {
  const [state, dispatch] = useReducer(reducer, defaultState, loadFromStorage);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.present));
  }, [state.present]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(state.snapshots));
  }, [state.snapshots]);

  const actions = useMemo(
    () => ({
      addPin: (pin: Pin) => dispatch({ type: "ADD_PIN", payload: pin }),
      movePin: (id: string, position: Vec2) =>
        dispatch({ type: "MOVE_PIN", payload: { id, position } }),
      updatePin: (pin: Pin) => dispatch({ type: "UPDATE_PIN", payload: pin }),
      deletePin: (id: string) => dispatch({ type: "DELETE_PIN", payload: { id } }),
      selectPin: (id?: string) => dispatch({ type: "SELECT_PIN", payload: { id } }),
      setViewport: (viewport: Viewport) =>
        dispatch({ type: "SET_VIEWPORT", payload: viewport }),
      setFilter: (tag?: string) => dispatch({ type: "SET_FILTER", payload: tag }),
      saveSnapshot: (name: string) => {
        const snapshot: Snapshot = {
          id: uuid(),
          name,
          savedAt: Date.now(),
          state: cloneCore(state.present)
        };
        dispatch({ type: "SAVE_SNAPSHOT", payload: snapshot });
      },
      deleteSnapshot: (id: string) =>
        dispatch({ type: "DELETE_SNAPSHOT", payload: { id } }),
      restoreSnapshot: (id: string) =>
        dispatch({ type: "RESTORE_SNAPSHOT", payload: { id } }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" })
    }),
    [state.present]
  );

  return {
    state,
    ...actions
  };
};
