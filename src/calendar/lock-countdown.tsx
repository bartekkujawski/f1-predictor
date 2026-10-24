"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import { Badge } from "../ui/badge";
import { lockStateAt } from "./lock";

const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

// Days and hours, then minutes and seconds in the last hour, when every minute counts.
const formatTimeLeft = (seconds: number) => {
  if (seconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  }
  const days = Math.floor(seconds / SECONDS_PER_DAY);
  const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
};

// Whole seconds until the Lock, rounded up, so it reads 0 only once the Session is locked.
const secondsLeftAt = (locksAt: Date, now: Date) =>
  lockStateAt(locksAt, now) === "locked"
    ? 0
    : Math.ceil((locksAt.getTime() - now.getTime()) / 1000);

const subscribeToSeconds = (onTick: () => void) => {
  const interval = setInterval(onTick, 1000);
  return () => clearInterval(interval);
};

// An Open Session's badge, counting down to its Lock. The server does not know when the page will
// reach the reader, so it renders "Open" alone and the browser adds the time left after hydration.
// At the Lock the badge turns into `locked` without a reload. Display only: the save use-case
// still refuses a late save.
export const LockCountdown = ({ locksAt, locked }: { locksAt: string; locked: ReactNode }) => {
  const secondsLeft = useSyncExternalStore(
    subscribeToSeconds,
    () => secondsLeftAt(new Date(locksAt), new Date()),
    () => null,
  );
  if (secondsLeft === null) {
    return <Badge tone="accent">Open</Badge>;
  }
  if (secondsLeft === 0) {
    return locked;
  }
  return (
    <Badge tone="accent">Open · locks in {formatTimeLeft(secondsLeft)}</Badge>
  );
};
