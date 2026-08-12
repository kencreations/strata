import { isRunningInExpoGo } from 'expo';
import { Alert } from 'react-native';
import type { Event } from '../db/types';

let notificationsModulePromise: Promise<typeof import('expo-notifications')> | null = null;

async function loadNotificationsModule() {
  if (isRunningInExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  return notificationsModulePromise;
}

export async function requestNotificationPermissions() {
  try {
    const Notifications = await loadNotificationsModule();
    if (!Notifications) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Notification permissions request failed:', e);
    return false;
  }
}

/**
 * For a recurring event, finds the nearest future Date that matches one of the
 * event's daysOfWeek, using the wall-clock HH:mm encoded in the stored ISO startTime.
 */
function getNextRecurringOccurrence(event: Event): Date | null {
  let targetDays: number[] = [];
  try {
    targetDays = JSON.parse(event.daysOfWeek || '[]');
  } catch {
    console.warn(`[Notifications] Could not parse daysOfWeek for "${event.title}":`, event.daysOfWeek);
    return null;
  }

  if (targetDays.length === 0) {
    console.warn(`[Notifications] Recurring event "${event.title}" has no days set — skipping.`);
    return null;
  }

  // Extract the wall-clock HH:mm from the stored ISO startTime
  const storedStart = new Date(event.startTime);
  if (isNaN(storedStart.getTime())) {
    console.warn(`[Notifications] Invalid startTime for "${event.title}":`, event.startTime);
    return null;
  }
  const hours = storedStart.getHours();
  const minutes = storedStart.getMinutes();

  // Walk forward day-by-day (up to 7 days) to find the next matching weekday in the future
  const now = new Date();
  for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + daysAhead);
    candidate.setHours(hours, minutes, 0, 0);

    if (targetDays.includes(candidate.getDay()) && candidate.getTime() > now.getTime()) {
      return candidate;
    }
  }

  console.warn(`[Notifications] Could not find a future occurrence for recurring event "${event.title}".`);
  return null;
}

/**
 * For a specific-date event, parses the ISO startTime directly.
 */
function getSpecificEventOccurrence(event: Event): Date | null {
  const d = new Date(event.startTime);
  if (isNaN(d.getTime())) {
    console.warn(`[Notifications] Invalid startTime for "${event.title}":`, event.startTime);
    return null;
  }
  return d;
}

export async function scheduleEventNotification(event: Event, offsetMinutes: number) {
  try {
    const Notifications = await loadNotificationsModule();
    if (!Notifications) return;

    console.log(
      `[Notifications] Scheduling "${event.title}" | isRecurring=${event.isRecurring}` +
      ` | startTime=${event.startTime} | offset=${offsetMinutes}min`
    );

    // 1. Determine the next occurrence based on event type
    const nextOccurrence = event.isRecurring
      ? getNextRecurringOccurrence(event)
      : getSpecificEventOccurrence(event);

    if (!nextOccurrence) {
      console.warn(`[Notifications] Skipping "${event.title}" — could not determine next occurrence.`);
      return;
    }

    console.log(`[Notifications] Next occurrence: ${nextOccurrence.toString()}`);

    // 2. Subtract the notification offset to get the trigger time
    const triggerDate = new Date(nextOccurrence.getTime() - offsetMinutes * 60_000);
    console.log(`[Notifications] Trigger date:   ${triggerDate.toString()}`);

    if (triggerDate.getTime() <= Date.now()) {
      console.warn(`[Notifications] Trigger date is in the past — skipping scheduling for "${event.title}".`);
      return;
    }

    // 3. Schedule the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${event.title}`,
        body: `Starts in ${offsetMinutes} minutes at ${event.location || 'Unknown Location'}`,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log(`[Notifications] ✅ Scheduled "${event.title}" for ${triggerDate.toLocaleString()}`);
  } catch (e) {
    console.warn(`[Notifications] Failed to schedule notification for "${event.title}":`, e);
  }
}

export async function triggerTestNotification() {
  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    Alert.alert(
      'Sandbox Warning', 
      'Expo Go says permission is denied, but we will try sending it anyway!'
    );
  } else {
    Alert.alert('Sent!', 'Check your notification drawer in 5 seconds.');
  }

  try {
    const Notifications = await loadNotificationsModule();
    if (!Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Successful! 🎉",
        body: "Your local notifications are working perfectly.",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
    });
  } catch (error) {
    console.warn("Notification failed to send:", error);
  }
}
