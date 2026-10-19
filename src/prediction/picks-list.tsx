import type { Prediction } from "../scoring/session-score";
import type { RegularDriver } from "../results-source/results-source";

// A Prediction's Picks in order, each Regular Driver by name and code.
export const PicksList = ({ prediction, regularDrivers }: { prediction: Prediction; regularDrivers: RegularDriver[] }) => {
  const nameOf = new Map(regularDrivers.map((driver) => [driver.driverId, `${driver.name} (${driver.code})`]));
  return (
    <ol className="list-decimal space-y-1 pl-8 marker:text-text-muted marker:tabular-nums">
      {prediction.map((driverId) => (
        <li key={driverId}>{nameOf.get(driverId) ?? driverId}</li>
      ))}
    </ol>
  );
};
