export type WorkType = 'ordinary' | 'on_call' | 'extraordinary';

export interface DailyReport {
  id: string;
  technicianName: string;
  location: string; // Cantiere/Luogo
  description: string; // Operazioni eseguite
  date: string;
  workType: WorkType;
  interventionHours: number; // Ore intervento
  travelHours: number; // Ore viaggio (only for on_call, default 0 for ordinary)
  photos?: string[]; // Array of base64 strings
  createdAt: number;
}

export interface SmartExtractResponse {
  technicianName?: string;
  location?: string;
  description?: string;
  interventionHours?: number;
  travelHours?: number;
  workType?: WorkType;
}