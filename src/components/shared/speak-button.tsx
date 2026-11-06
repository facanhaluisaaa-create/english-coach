"use client";

import { Volume2Icon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/lib/speech/use-speech";

export function SpeakButton({
  text,
  label = "Play audio",
  rate,
  size = "sm",
  variant = "outline",
  onPlayed,
}: {
  text: string;
  label?: string;
  rate?: number;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "default" | "secondary" | "ghost";
  onPlayed?: () => void;
}) {
  const tts = useTextToSpeech();
  if (!tts.supported) return null;
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={async () => {
        if (tts.speaking) return tts.stop();
        await tts.speak(text, { rate });
        onPlayed?.();
      }}
    >
      {tts.speaking ? <SquareIcon /> : <Volume2Icon />}
      {tts.speaking ? "Stop" : label}
    </Button>
  );
}
