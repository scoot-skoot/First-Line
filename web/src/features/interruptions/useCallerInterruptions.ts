import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InterruptionResponse,
  InterruptionThresholds,
  TurnView,
} from "@shared";
import { interruptionsApi } from "./api";
import {
  DEFAULT_INTERRUPTION_THRESHOLDS,
  pttHoldMsForDistress,
  silenceMsForDistress,
} from "./thresholds";

export type UseCallerInterruptionsOpts = {
  sessionId: string;
  enabled: boolean;
  paused: boolean;
  callEnded: boolean;
  busy: boolean;
  currentDistress: number;
  /** Latest caller turn seq (for barge-in marking). */
  latestCallerSeq: number | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onInterrupted: (result: InterruptionResponse) => void;
  onError?: (message: string) => void;
};

export type CallerInterruptionsApi = {
  thresholds: InterruptionThresholds;
  pttHoldMs: number;
  silenceMs: number;
  /** Call when push-to-talk starts — stops caller audio (barge-in). */
  onPttStart: () => void;
  /** Call when PTT ends normally (release) — resets hold timer. */
  onPttEnd: () => void;
  /** Call when PTT hits max hold — stop recording and flush partial. */
  onPttMaxHold: (blob: Blob) => Promise<void>;
  /** Mark trainee/caller activity so silence timer resets. */
  noteActivity: () => void;
  /** True after barge-in until the next trainee turn is sent. */
  pendingBargeIn: boolean;
  pendingBargeInFromSeq: number | null;
  clearBargeIn: () => void;
};

/**
 * Caller interruptions: PTT hold timeout, silence prompt, barge-in.
 * Thresholds scale with caller distress (higher → faster interrupt).
 */
export function useCallerInterruptions(
  opts: UseCallerInterruptionsOpts,
): CallerInterruptionsApi {
  const {
    sessionId,
    enabled,
    paused,
    callEnded,
    busy,
    currentDistress,
    latestCallerSeq,
    audioRef,
    onInterrupted,
    onError,
  } = opts;

  const [thresholds, setThresholds] = useState<InterruptionThresholds>(
    DEFAULT_INTERRUPTION_THRESHOLDS,
  );
  const [pendingBargeIn, setPendingBargeIn] = useState(false);
  const [pendingBargeInFromSeq, setPendingBargeInFromSeq] = useState<
    number | null
  >(null);
  const [holdingPtt, setHoldingPtt] = useState(false);

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firing = useRef(false);
  const lastActivity = useRef(Date.now());
  const onInterruptedRef = useRef(onInterrupted);
  const onErrorRef = useRef(onError);
  onInterruptedRef.current = onInterrupted;
  onErrorRef.current = onError;

  const pttHoldMs = pttHoldMsForDistress(currentDistress, thresholds);
  const silenceMs = silenceMsForDistress(currentDistress, thresholds);

  useEffect(() => {
    void interruptionsApi
      .thresholds()
      .then((r) => setThresholds(r.thresholds))
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const clearSilence = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const noteActivity = useCallback(() => {
    lastActivity.current = Date.now();
    clearSilence();
  }, [clearSilence]);

  const fireSilence = useCallback(async () => {
    if (firing.current || !enabled || paused || callEnded || busy || holdingPtt) {
      return;
    }
    firing.current = true;
    clearSilence();
    try {
      const result = await interruptionsApi.interrupt(sessionId, {
        kind: "silence",
      });
      onInterruptedRef.current(result);
      lastActivity.current = Date.now();
    } catch (e) {
      onErrorRef.current?.((e as Error).message);
    } finally {
      firing.current = false;
    }
  }, [busy, callEnded, clearSilence, enabled, holdingPtt, paused, sessionId]);

  // Silence watchdog: arm when the call is idle (not recording / busy).
  useEffect(() => {
    clearSilence();
    if (!enabled || paused || callEnded || busy || holdingPtt) return;

    silenceTimer.current = setTimeout(() => {
      void fireSilence();
    }, silenceMs);

    return clearSilence;
  }, [
    busy,
    callEnded,
    clearSilence,
    enabled,
    fireSilence,
    holdingPtt,
    latestCallerSeq,
    paused,
    silenceMs,
  ]);

  const onPttStart = useCallback(() => {
    setHoldingPtt(true);
    noteActivity();
    const audio = audioRef.current;
    // Barge-in: stop caller audio immediately; Gemini learns via bargeIn on the next turn.
    if (audio && !audio.paused) {
      audio.pause();
      setPendingBargeIn(true);
      setPendingBargeInFromSeq(latestCallerSeq);
    }
  }, [audioRef, latestCallerSeq, noteActivity]);

  const onPttEnd = useCallback(() => {
    setHoldingPtt(false);
    noteActivity();
  }, [noteActivity]);

  const onPttMaxHold = useCallback(
    async (blob: Blob) => {
      if (firing.current || !enabled || paused || callEnded) return;
      firing.current = true;
      clearSilence();
      try {
        const result = await interruptionsApi.interrupt(sessionId, {
          kind: "ptt_timeout",
          audio: blob,
        });
        onInterruptedRef.current(result);
        lastActivity.current = Date.now();
      } catch (e) {
        onErrorRef.current?.((e as Error).message);
      } finally {
        firing.current = false;
      }
    },
    [callEnded, clearSilence, enabled, paused, sessionId],
  );

  const clearBargeIn = useCallback(() => {
    setPendingBargeIn(false);
    setPendingBargeInFromSeq(null);
  }, []);

  return {
    thresholds,
    pttHoldMs,
    silenceMs,
    onPttStart,
    onPttEnd,
    onPttMaxHold,
    noteActivity,
    pendingBargeIn,
    pendingBargeInFromSeq,
    clearBargeIn,
  };
}

/** Helper for Call screen: append interruption turns into transcript state. */
export function mergeInterruptionTurns(
  prev: TurnView[],
  result: InterruptionResponse,
): TurnView[] {
  const next = [...prev];
  if (result.traineeTurn) next.push(result.traineeTurn);
  next.push(result.callerTurn);
  return next;
}
