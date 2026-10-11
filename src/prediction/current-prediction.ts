import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import {
  getMyPredictions,
  type MyPredictionsOutcome,
  type PredictionInput,
  savePrediction,
  type SavePredictionOutcome,
} from "./prediction";

export const getCurrentRoundPredictions = (playerId: string, roundNumber: number): Promise<MyPredictionsOutcome> =>
  getMyPredictions({ db, clock: systemClock }, playerId, roundNumber);

export const saveCurrentPrediction = (playerId: string, input: PredictionInput): Promise<SavePredictionOutcome> =>
  savePrediction({ db, clock: systemClock }, playerId, input);
