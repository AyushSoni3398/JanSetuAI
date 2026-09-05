import { useCallback, useEffect, useRef, useState } from "react";

// The browser's built-in speech recognition. Chromium exposes it as
// webkitSpeechRecognition; the unprefixed name is the standard one.
//
// This is Google's speech engine reached through the browser - not Bhashini,
// and not a model we run. It needs an internet connection, and it returns
// NATIVE SCRIPT for Indian languages (hi-IN gives Devanagari), which drops
// straight into the native-script path the analyser already handles.
const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export const speechSupported = Boolean(SpeechRecognition);

// Brave ships the API object but blocks the speech service behind it, so it
// always fails with a "network" error and never returns a result. Feature
// detection therefore passes while the feature does not work - the browser has
// to be identified directly. navigator.brave.isBrave() is async and only
// exists in Brave.
export async function isBraveBrowser() {
  try {
    return Boolean(await navigator.brave?.isBrave?.());
  } catch {
    return false;
  }
}

const ERROR_MESSAGES = {
  "not-allowed": "Microphone access was blocked. Allow it in the address bar and try again.",
  "service-not-allowed": "Microphone access was blocked by the browser.",
  "no-speech": "Nothing was heard. Try again and speak a little louder.",
  // "network" is also what Brave returns when it blocks the speech service
  // entirely, which is far more common than actually being offline.
  network:
    "The speech service could not be reached. Brave blocks it entirely - " +
    "open this page in Chrome or Edge, or check your connection.",
  aborted: null, // user stopped deliberately - not an error worth showing
  "audio-capture": "No microphone was found.",
};

export function useSpeechRecognition(languageTag) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(
    (onFinalText) => {
      if (!SpeechRecognition) return;

      setError(null);
      setInterim("");
      onResultRef.current = onFinalText;

      const recognition = new SpeechRecognition();
      recognition.lang = languageTag;
      // Continuous so a citizen can pause mid-sentence without it cutting off;
      // interim results so the words appear while they are still speaking.
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalText = "";
        let pending = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else pending += result[0].transcript;
        }
        setInterim(pending);
        if (finalText) onResultRef.current?.(finalText);
      };

      recognition.onerror = (event) => {
        const message = ERROR_MESSAGES[event.error];
        if (message !== null) {
          setError(message ?? `Speech recognition failed (${event.error}).`);
        }
      };

      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setListening(true);
      } catch {
        // start() throws if called while already running.
        setListening(false);
      }
    },
    [languageTag]
  );

  // Never leave the microphone open when the page navigates away.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported: speechSupported, listening, interim, error, start, stop };
}
