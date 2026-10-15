import type { DriverOrder, RegularDriver } from "../results-source/results-source";

// A Session's Top 10 in order. An empty grid slot keeps its number and is shown empty (ADR-0008).
export const Top10List = ({ top10, regularDrivers }: { top10: DriverOrder; regularDrivers: RegularDriver[] }) => {
  const nameOf = new Map(regularDrivers.map((driver) => [driver.driverId, `${driver.name} (${driver.code})`]));
  return (
    <ol>
      {/* A position is unique, and an empty slot has no driver to key on, so the index is the key. */}
      {top10.map((driverId, index) => (
        <li key={index}>{driverId === null ? "Empty slot" : (nameOf.get(driverId) ?? driverId)}</li>
      ))}
    </ol>
  );
};
