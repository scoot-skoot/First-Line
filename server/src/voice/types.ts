export interface SpeechToText {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
}

export interface TtsOptions {
  voiceId: string;
  distress?: number;
  emotion?: string;
}

export interface TextToSpeech {
  stream(text: string, opts: TtsOptions): Promise<NodeJS.ReadableStream>;
}
