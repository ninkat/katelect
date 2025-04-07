// interface for poll data
export interface Poll {
  id: number;
  date: string;
  pollster: string;
  sampleSize: number;
  liberal: number;
  conservative: number;
  ndp: number;
  bloc: number;
  green: number;
  ppc: number;
  other: number;
  lead: string;
}
