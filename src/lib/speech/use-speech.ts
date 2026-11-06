"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const ttsSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;
const sttSupported = () => getRecognition() !== null;

/* ---------------------------------------------------------------- TTS */

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => /^en(-|_)?/i.test(v.lang));
  const preferred =
    english.find((v) => /Google US English|Samantha|Daniel|Karen|Microsoft (Aria|Jenny|Guy|Ryan)/i.test(v.name)) ??
    english.find((v) => v.lang.toLowerCase() === "en-us") ??
    english[0];
  return preferred ?? null;
}

export function useTextToSpeech() {
  const supported = useSyncExternalStore(noopSubscribe, ttsSupported, () => false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Warm the voice list (Chrome loads it asynchronously).
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Speaks text (lines like "Name: text" are read without the speaker label). */
  const speak = useCallback(
    (text: string, opts: { rate?: number } = {}) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
        window.speechSynthesis.cancel();
        const cleaned = text
          .split("\n")
          .map((line) => line.replace(/^[A-Z][\w .'-]{0,30}:\s*/, ""))
          .join("\n");
        const u = new SpeechSynthesisUtterance(cleaned);
        const voice = pickVoice();
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? "en-US";
        u.rate = opts.rate ?? 0.98;
        u.onend = () => {
          setSpeaking(false);
          resolve();
        };
        u.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        utteranceRef.current = u;
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  return { supported, speaking, speak, stop };
}

/* ---------------------------------------------------------------- STT */

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const supported = useSyncExternalStore(noopSubscribe, sttSupported, () => false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    const rec = recRef;
    return () => rec.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalRef.current += (finalRef.current ? " " : "") + t.trim();
        else interimText += t;
      }
      setTranscript(finalRef.current);
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone access was blocked. Allow the microphone or type your answer." : `Speech recognition error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}

/* ---------------------------------------------------------------- Timer */

export function useCountdown(seconds: number | null, running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  const startRef = useRef<number | null>(null);

  // Reset when the limit changes (state adjustment during render, per React guidance).
  if (prevSeconds !== seconds) {
    setPrevSeconds(seconds);
    setElapsed(0);
  }

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    startRef.current = start;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, [running, seconds]);

  const remaining = seconds != null ? Math.max(0, seconds - elapsed) : null;
  return { remaining, elapsed, expired: seconds != null && remaining === 0 };
}

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
