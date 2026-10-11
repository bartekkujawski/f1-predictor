import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import {
  getPlayerPredictions,
  type PlayerPredictionsOutcome,
  type PredictionInput,
  savePrediction,
  type SavePredictionOutcome,
} from "./prediction";

export const getCurrentPlayerPredictions = (playerId: string, roundNumber: number): Promise<PlayerPredictionsOutcome> =>
  getPlayerPredictions({ db, clock: systemClock }, playerId, roundNumber);

export const saveCurrentPrediction = (playerId: string, input: PredictionInput): Promise<SavePredictionOutcome> =>
  savePrediction({ db, clock: systemClock }, playerId, input);
