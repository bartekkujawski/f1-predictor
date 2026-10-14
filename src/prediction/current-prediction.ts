import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import type { SessionKind } from "../calendar/session";
import {
  getPlayerPredictions,
  getSessionPredictions,
  type PlayerPredictionsOutcome,
  type PredictionInput,
  savePrediction,
  type SavePredictionOutcome,
  type SessionPredictionsOutcome,
} from "./prediction";

export const getCurrentPlayerPredictions = (playerId: string, roundNumber: number): Promise<PlayerPredictionsOutcome> =>
  getPlayerPredictions({ db, clock: systemClock }, playerId, roundNumber);

export const getCurrentSessionPredictions = (
  playerId: string,
  roundNumber: number,
  kind: SessionKind,
): Promise<SessionPredictionsOutcome> => getSessionPredictions({ db, clock: systemClock }, playerId, roundNumber, kind);

export const saveCurrentPrediction = (playerId: string, input: PredictionInput): Promise<SavePredictionOutcome> =>
  savePrediction({ db, clock: systemClock }, playerId, input);
