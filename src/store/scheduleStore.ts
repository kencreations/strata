import { create } from 'zustand';
import type { Event, TimelineItem, Conflict } from '../db/types';
import { getTodayEvents, getScheduleLayers, getAllEvents, insertScheduleLayer } from '../db/repositories/eventRepository';
import {
  detectConflicts,
  persistConflicts,
  getUnresolvedConflicts,
  buildTimeline,
  getUpNextEvent,
  secondsUntilEvent,
} from '../services/scheduleUtils';
import { GUEST_USER_ID } from '../db/migrations';

interface ScheduleLayer {
  id: string;
  layerName: string;
  colorCode: string;
  isActive: boolean;
}

interface ScheduleState {
  layers: ScheduleLayer[];
  activeLayers: string[]; // layer IDs
  todayEvents: Event[];
  allEvents: Event[];
  timeline: TimelineItem[];
  conflicts: Conflict[];
  upNextEvent: Event | null;
  leaveInSeconds: number;
  isLoading: boolean;
  lastRefreshed: Date | null;

  // Actions
  initialize: (userId?: string) => Promise<void>;
  fetchAllEvents: (userId?: string) => Promise<void>;
  refreshToday: (userId?: string) => Promise<void>;
  toggleLayer: (layerId: string) => void;
  setActiveLayers: (ids: string[]) => void;
  
  completedToday: string[];
  markEventDone: (eventId: string) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  layers: [],
  activeLayers: [],
  todayEvents: [],
  allEvents: [],
  timeline: [],
  conflicts: [],
  upNextEvent: null,
  leaveInSeconds: 0,
  isLoading: false,
  lastRefreshed: null,
  completedToday: [],

  markEventDone: (eventId: string) => {
    set((state) => ({ completedToday: [...state.completedToday, eventId] }));
    get().refreshToday();
  },

  initialize: async (userId = GUEST_USER_ID) => {
    let rawLayers = await getScheduleLayers(userId);

    // ── Seed default layers for first-time users ──────────────────────────────
    // The DB seeds on boot, but in-memory store might call initialize() before
    // the seed has run (e.g. navigation straight to Planner after parse).
    if (rawLayers.length === 0) {
      const defaults = [
        { layerName: 'Academic', colorCode: '#2F6F6D' },
        { layerName: 'Work',     colorCode: '#A06B1A' },
        { layerName: 'Routine',  colorCode: '#2C7A4B' },
      ];
      for (const d of defaults) {
        await insertScheduleLayer(userId, d.layerName, d.colorCode);
      }
      // Re-fetch now that rows exist
      rawLayers = await getScheduleLayers(userId);
    }

    const layers: ScheduleLayer[] = rawLayers.map((r: any) => ({
      id: r.id,
      layerName: r.layer_name,
      colorCode: r.color_code,
      isActive: r.is_active === 1,
    }));
    const activeLayers = layers.map((l) => l.id);
    set({ layers, activeLayers });
    await get().fetchAllEvents(userId);
    await get().refreshToday(userId);
  },

  fetchAllEvents: async (userId = GUEST_USER_ID) => {
    const allEvents = await getAllEvents(userId);
    set({ allEvents });
  },

  refreshToday: async (userId = GUEST_USER_ID) => {
    set({ isLoading: true });
    try {
      await get().fetchAllEvents(userId);
      const events = await getTodayEvents(userId);
      const detected = detectConflicts(events);
      await persistConflicts(detected);
      const conflicts = await getUnresolvedConflicts();
      const timeline = buildTimeline(events, detected);
      
      const upNextCandidates = events.filter(e => !get().completedToday.includes(e.id));
      const upNextEvent = getUpNextEvent(upNextCandidates);
      const leaveInSeconds = upNextEvent
        ? secondsUntilEvent(upNextEvent)
        : 0;

      set({
        todayEvents: events,
        timeline,
        conflicts,
        upNextEvent,
        leaveInSeconds,
        lastRefreshed: new Date(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleLayer: (layerId) => {
    const { activeLayers } = get();
    const next = activeLayers.includes(layerId)
      ? activeLayers.filter((id) => id !== layerId)
      : [...activeLayers, layerId];
    set({ activeLayers: next });
  },

  setActiveLayers: (ids) => set({ activeLayers: ids }),
}));
