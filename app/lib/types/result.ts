export interface ExpertResult {
  expertId: string;
  status: 'compliant' | 'attention' | 'not_relevant' | 'error';
  reasoning?: string;
  lineReferences?: number[];
  fileReferences?: string[];
  error?: {
    message: string;
    type?: string;
    code?: string;
    rawResponse?: any; // Full OpenAI error response
  };
}

