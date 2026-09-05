export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  wordCount: number;
  segments?: TranscriptSegment[];
  words?: TranscriptWord[];
}

export interface TranscriptionInput {
  file: File | Blob;
  fileName?: string;
  prompt?: string;
  language?: string;
}

export interface SpeechToTextProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
