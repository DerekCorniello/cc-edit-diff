export type EditEvent = {
  file: string;
  timestamp: number;
};

export type Session = {
  id: string;
  start: number;
  end: number;
  edits: EditEvent[];
};
