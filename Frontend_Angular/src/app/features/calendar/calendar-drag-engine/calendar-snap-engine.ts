export const SNAP_INTERVALS = [5, 10, 15, 30] as const;
export type SnapInterval = (typeof SNAP_INTERVALS)[number];

export const DEFAULT_SNAP_INTERVAL: SnapInterval = 15;

export const MIN_DURATION_MINUTES = 15;
export const MAX_DURATION_MINUTES = 480;

export function snapMinutes(minutes: number, interval: SnapInterval = DEFAULT_SNAP_INTERVAL): number {
  return Math.round(minutes / interval) * interval;
}

export function snapDate(date: Date, interval: SnapInterval = DEFAULT_SNAP_INTERVAL): Date {
  const ms = 60 * 1000 * interval;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

export function snapTimeString(timeStr: string, interval: SnapInterval = DEFAULT_SNAP_INTERVAL): string {
  const date = new Date(timeStr);
  return snapDate(date, interval).toISOString();
}

export function snapMinutesFloor(minutes: number, interval: SnapInterval): number {
  return Math.floor(minutes / interval) * interval;
}

export function snapMinutesCeil(minutes: number, interval: SnapInterval): number {
  return Math.ceil(minutes / interval) * interval;
}

export function clampDuration(minutes: number, min = MIN_DURATION_MINUTES, max = MAX_DURATION_MINUTES): number {
  return Math.max(min, Math.min(max, minutes));
}

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

export function msToMinutes(ms: number): number {
  return Math.round(ms / 60000);
}

export function getNewEndTimeFromDuration(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  return new Date(start.getTime() + minutesToMs(durationMinutes)).toISOString();
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
