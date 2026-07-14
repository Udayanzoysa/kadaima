"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HEARTBEAT_EVERY_SECONDS = 5;
const MAX_VIOLATIONS = 3;

export type HeartbeatStatus = "active" | "paused";

export interface HeartbeatResponse {
  autoSubmit: boolean;
  reason?: "violations" | "timeout" | null;
  serverSecondsRemaining?: number;
  violationCount?: number;
}

export interface UseResilientTimerOptions {
  attemptId: string | null;
  initialSeconds: number;
  initialViolations?: number;
  enabled?: boolean;
  /** POST heartbeat to NestJS; return parsed JSON or null on failure */
  sendHeartbeat: (
    status: HeartbeatStatus,
    secondsRemaining: number,
    violationCount: number,
  ) => Promise<HeartbeatResponse | null>;
  onAutoSubmit: (reason: "timeout" | "violations") => void;
  onViolation?: (count: number) => void;
  maxViolations?: number;
}

export function useResilientTimer({
  attemptId,
  initialSeconds,
  initialViolations = 0,
  enabled = true,
  sendHeartbeat,
  onAutoSubmit,
  onViolation,
  maxViolations = MAX_VIOLATIONS,
}: UseResilientTimerOptions) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(0, initialSeconds),
  );
  const [isActive, setIsActive] = useState(true);
  const [violationCount, setViolationCount] = useState(
    Math.max(0, initialViolations),
  );

  const secondsRef = useRef(Math.max(0, initialSeconds));
  const isActiveRef = useRef(true);
  const violationsRef = useRef(Math.max(0, initialViolations));
  const pausedByFocusRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const sendHeartbeatRef = useRef(sendHeartbeat);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onViolationRef = useRef(onViolation);

  sendHeartbeatRef.current = sendHeartbeat;
  onAutoSubmitRef.current = onAutoSubmit;
  onViolationRef.current = onViolation;

  // Reset when a new attempt / initial pool arrives (e.g. resume).
  useEffect(() => {
    const next = Math.max(0, initialSeconds);
    const nextViolations = Math.max(0, initialViolations);
    secondsRef.current = next;
    setSecondsRemaining(next);
    autoSubmittedRef.current = false;
    violationsRef.current = nextViolations;
    setViolationCount(nextViolations);
    isActiveRef.current = true;
    setIsActive(true);
    pausedByFocusRef.current = false;
  }, [attemptId, initialSeconds, initialViolations]);

  const triggerAutoSubmit = useCallback((reason: "timeout" | "violations") => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    isActiveRef.current = false;
    setIsActive(false);
    onAutoSubmitRef.current(reason);
  }, []);

  const heartbeat = useCallback(
    async (status: HeartbeatStatus) => {
      if (!attemptId || !enabled || autoSubmittedRef.current) return;

      try {
        const data = await sendHeartbeatRef.current(
          status,
          secondsRef.current,
          violationsRef.current,
        );
        if (!data) return;

        if (
          typeof data.serverSecondsRemaining === "number" &&
          data.serverSecondsRemaining >= 0
        ) {
          // Server is authoritative (including frozen pool after disconnect).
          const next = Math.max(0, data.serverSecondsRemaining);
          secondsRef.current = next;
          setSecondsRemaining(next);
        }

        if (typeof data.violationCount === "number") {
          violationsRef.current = Math.max(violationsRef.current, data.violationCount);
          setViolationCount(violationsRef.current);
        }

        if (data.autoSubmit) {
          triggerAutoSubmit(
            data.reason === "violations" ? "violations" : "timeout",
          );
        }
      } catch {
        // Offline / network blip — pool stays frozen until next successful sync.
      }
    },
    [attemptId, enabled, triggerAutoSubmit],
  );

  // Local countdown while focused & active.
  useEffect(() => {
    if (!enabled || !attemptId || !isActive) return;

    const interval = setInterval(() => {
      if (!isActiveRef.current || autoSubmittedRef.current) return;

      const updated = Math.max(0, secondsRef.current - 1);
      secondsRef.current = updated;
      setSecondsRemaining(updated);

      if (updated <= 0) {
        void heartbeat("active");
        triggerAutoSubmit("timeout");
        return;
      }

      if (updated % HEARTBEAT_EVERY_SECONDS === 0) {
        void heartbeat("active");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, attemptId, isActive, heartbeat, triggerAutoSubmit]);

  // Tab / window focus → pause + violation (Scenario B).
  useEffect(() => {
    if (!enabled || !attemptId) return;

    const pauseForFocusLoss = () => {
      if (autoSubmittedRef.current || pausedByFocusRef.current) return;
      if (document.visibilityState === "hidden" || !document.hasFocus()) {
        pausedByFocusRef.current = true;
        isActiveRef.current = false;
        setIsActive(false);

        violationsRef.current += 1;
        setViolationCount(violationsRef.current);
        onViolationRef.current?.(violationsRef.current);

        void heartbeat("paused");

        if (violationsRef.current >= maxViolations) {
          triggerAutoSubmit("violations");
        }
      }
    };

    const resumeFocus = () => {
      if (autoSubmittedRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) return;
      if (!pausedByFocusRef.current) return;
      if (violationsRef.current >= maxViolations) return;

      pausedByFocusRef.current = false;
      isActiveRef.current = true;
      setIsActive(true);
      void heartbeat("active");
    };

    const onVisibility = () => {
      if (document.hidden) pauseForFocusLoss();
      else resumeFocus();
    };

    window.addEventListener("blur", pauseForFocusLoss);
    window.addEventListener("focus", resumeFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("blur", pauseForFocusLoss);
      window.removeEventListener("focus", resumeFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, attemptId, heartbeat, maxViolations, triggerAutoSubmit]);

  const formatTime = useCallback(() => {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [secondsRemaining]);

  return {
    secondsRemaining,
    timeLeft: secondsRemaining,
    isActive,
    violationCount,
    formatTime,
  };
}
