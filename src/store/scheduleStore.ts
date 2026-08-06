import { create } from 'zustand';
import type { Event, TimelineItem, Conflict } from '../db/types';
import { getTodayEvents, getScheduleLayers } from '../db/repositories/eventRepository';
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
  timeline: TimelineItem[];
  conflicts: Conflict[];
  upNextEvent: Event | null;
  leaveInSeconds: number;
  isLoading: boolean;
  lastRefreshed: Date | null;

  // Actions
  initialize: (userId?: string) => Promise<void>;
  refreshToday: (userId?: string) => Promise<void>;
  toggleLayer: (layerId: string) => void;
  setActiveLayers: (ids: string[]) => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  layers: [],
  activeLayers: [],
  todayEvents: [],
  timeline: [],
  conflicts: [],
  upNextEvent: null,
  leaveInSeconds: 0,
  isLoading: false,
  lastRefreshed: null,

  initialize: async (userId = GUEST_USER_ID) => {
    const rawLayers = await getScheduleLayers(userId);
    const layers: ScheduleLayer[] = rawLayers.map((r: any) => ({
      id: r.id,
      layerName: r.layer_name,
      colorCode: r.color_code,
      isActive: r.is_active === 1,
    }));
    const activeLayers = layers.map((l) => l.id);
    set({ layers, activeLayers });
    await get().refreshToday(userId);
  },

  refreshToday: async (userId = GUEST_USER_ID) => {
    set({ isLoading: true });
    try {
      const events = await getTodayEvents(userId);
      const detected = detectConflicts(events);
      await persistConflicts(detected);
      const conflicts = await getUnresolvedConflicts();
      const timeline = buildTimeline(events, detected);
      const upNextEvent = getUpNextEvent(events);
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
