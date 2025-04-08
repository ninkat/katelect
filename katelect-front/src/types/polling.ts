// type for raw poll data (matches original Poll interface + backend format)
export interface RawPoll {
  date: string; // YYYY-MM-DD
  pollster: string;
  sampleSize: number;
  liberal: number;
  conservative: number;
  ndp: number;
  bloc: number;
  green: number;
  ppc: number;
  other: number;
  // these might be missing in some raw files, handle optional?
  // the backend script adds 0 if missing, so they should exist
}

// type for a single averaged data point from /api/averages/{region}
export interface AveragedDataPoint {
  date: string; // YYYY-MM-DD
  liberal: number;
  conservative: number;
  ndp: number;
  bloc: number;
  green: number;
  ppc: number;
  other: number;
}

// type for party keys used in averages and latest data
export type PartyKey = keyof Omit<AveragedDataPoint, 'date'>;

// type for the latest polling data from /api/latest/{region}
// matches the PollingTrends interface previously defined in PollingChart
export interface LatestPollingData {
  latestValues: Record<PartyKey, number>;
  changes: Record<PartyKey, number | null>; // changes can be null if only one data point
}
