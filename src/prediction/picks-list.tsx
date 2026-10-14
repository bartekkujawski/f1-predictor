import type { Prediction } from "../scoring/session-score";
import type { RegularDriver } from "../results-source/results-source";

// A Prediction's Picks in order, each Regular Driver by name and code.
export const PicksList = ({ prediction, regularDrivers }: { prediction: Prediction; regularDrivers: RegularDriver[] }) => {
  const nameOf = new Map(regularDrivers.map((driver) => [driver.driverId, `${driver.name} (${driver.code})`]));
  return (
    <ol>
      {prediction.map((driverId) => (
        <li key={driverId}>{nameOf.get(driverId) ?? driverId}</li>
      ))}
    </ol>
  );
};
