"use client";

import { useSyncExternalStore } from "react";

const format = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(new Date(iso));

// The time zone never changes while the page is open, so there is nothing to subscribe to.
const subscribe = () => () => {};

// A moment in the reader's time zone. The server does not know that zone, so it renders UTC,
// and the browser switches to local time right after hydration.
export const LocalTime = ({ iso }: { iso: string }) => {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso),
    () => format(iso, "UTC"),
  );
  return <time dateTime={iso}>{text}</time>;
};
