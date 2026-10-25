export type AudioVoice = {
  id: string;
  name: string;
};

export const AUDIO_VOICES: AudioVoice[] = [
  { id: "pray-more-voice", name: "Narrador 1" },
];

export const DEFAULT_VOICE_ID = "pray-more-voice";

export const AUDIO_VERSIONS = ["ARA"];

export const hasAudioForVersion = (version: string): boolean =>
  AUDIO_VERSIONS.includes(version.toUpperCase());
