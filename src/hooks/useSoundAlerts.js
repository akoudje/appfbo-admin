import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getOrCreateSharedAudioContext,
  isSoundSessionUnlocked,
  unlockGlobalSoundSession,
} from "../lib/soundEngine";

const STORAGE_PREFIX = "workspace_sound_alert_v1";
const FORCED_SOUND_ENABLED = true;
const FORCED_SOUND_VOLUME = 1;

function safeReadStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function eventPattern(eventKey) {
  const key = String(eventKey || "").toLowerCase();
  if (key.includes("cashier")) {
    return [
      { freq: 560, duration: 0.1, gap: 0.06 },
      { freq: 620, duration: 0.1, gap: 0.06 },
    ];
  }
  if (key.includes("preparation")) {
    return [
      { freq: 520, duration: 0.08, gap: 0.05 },
      { freq: 680, duration: 0.1, gap: 0.06 },
    ];
  }
  if (key.includes("escalated")) {
    return [
      { freq: 980, duration: 0.12, gap: 0.06 },
      { freq: 980, duration: 0.12, gap: 0.06 },
      { freq: 1240, duration: 0.18, gap: 0.08 },
    ];
  }
  if (key.includes("ready") || key.includes("launch")) {
    return [
      { freq: 720, duration: 0.1, gap: 0.05 },
      { freq: 860, duration: 0.14, gap: 0.07 },
    ];
  }
  return [
    { freq: 640, duration: 0.12, gap: 0.06 },
    { freq: 780, duration: 0.14, gap: 0.08 },
  ];
}

function playBeepPattern(audioContext, pattern, volume = 0.6) {
  if (!audioContext) return;

  const now = audioContext.currentTime;
  let cursor = now + 0.01;

  pattern.forEach((step) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = Number(step.freq || 700);

    const gainNode = audioContext.createGain();
    const stepVolume = Math.max(0, Math.min(1, Number(volume || 0.6)));

    gainNode.gain.setValueAtTime(0.0001, cursor);
    gainNode.gain.exponentialRampToValueAtTime(stepVolume, cursor + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      cursor + Number(step.duration || 0.12),
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(cursor);
    oscillator.stop(cursor + Number(step.duration || 0.12) + 0.02);

    cursor += Number(step.duration || 0.12) + Number(step.gap || 0.06);
  });
}

export function useSoundAlerts(workspaceKey) {
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${String(workspaceKey || "default").toLowerCase()}`,
    [workspaceKey],
  );

  const [enabled, setEnabled] = useState(FORCED_SOUND_ENABLED);
  const [volume, setVolume] = useState(FORCED_SOUND_VOLUME);
  const [mutedUntil, setMutedUntil] = useState(0);
  const [unlocked, setUnlocked] = useState(() => isSoundSessionUnlocked());

  const audioContextRef = useRef(null);
  const cooldownRef = useRef(new Map());
  const signatureRef = useRef(new Map());

  useEffect(() => {
    const saved = safeReadStorage(storageKey, { mutedUntil: 0 });
    setEnabled(FORCED_SOUND_ENABLED);
    setVolume(FORCED_SOUND_VOLUME);
    setMutedUntil(Number(saved.mutedUntil || 0));
  }, [storageKey]);

  useEffect(() => {
    safeWriteStorage(storageKey, {
      enabled: FORCED_SOUND_ENABLED,
      volume: FORCED_SOUND_VOLUME,
      mutedUntil,
    });
  }, [storageKey, mutedUntil]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = getOrCreateSharedAudioContext();
    }
    if (!audioContextRef.current) return null;
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const unlockSound = useCallback(async () => {
    try {
      const ok = await unlockGlobalSoundSession();
      if (!ok) return false;
      const ctx = await ensureAudioContext();
      if (!ctx) return false;
      setUnlocked(true);
      return true;
    } catch {
      setUnlocked(false);
      return false;
    }
  }, [ensureAudioContext]);

  const play = useCallback(
    async (eventKey = "default") => {
      const ctx = await ensureAudioContext();
      if (!ctx) return false;
      playBeepPattern(ctx, eventPattern(eventKey), FORCED_SOUND_VOLUME);
      return true;
    },
    [ensureAudioContext],
  );

  const notify = useCallback(
    async (eventKey, options = {}) => {
      const {
        signature = null,
        cooldownMs = 45000,
      } = options || {};

      if (!unlocked) return false;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return false;
      }

      const key = String(eventKey || "default");
      const now = Date.now();
      const lastAt = Number(cooldownRef.current.get(key) || 0);
      if (now - lastAt < cooldownMs) return false;

      if (signature !== null) {
        const lastSignature = signatureRef.current.get(key);
        if (lastSignature === signature) return false;
        signatureRef.current.set(key, signature);
      }

      const ok = await play(key);
      if (ok) {
        cooldownRef.current.set(key, now);
      }
      return ok;
    },
    [play, unlocked],
  );

  const testSound = useCallback(async () => {
    if (!unlocked) {
      const ok = await unlockSound();
      if (!ok) return false;
    }
    return play("test");
  }, [play, unlockSound, unlocked]);

  const muteForMinutes = useCallback((minutes = 15) => {
    const ttl = Date.now() + Math.max(1, Number(minutes || 15)) * 60 * 1000;
    setMutedUntil(ttl);
  }, []);

  const clearMute = useCallback(() => setMutedUntil(0), []);

  useEffect(() => {
    if (unlocked || typeof window === "undefined") return undefined;
    const tryUnlock = () => {
      unlockSound().catch(() => {});
    };
    window.addEventListener("pointerdown", tryUnlock, { passive: true });
    window.addEventListener("keydown", tryUnlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", tryUnlock);
      window.removeEventListener("keydown", tryUnlock);
    };
  }, [unlockSound, unlocked]);

  return {
    enabled: FORCED_SOUND_ENABLED,
    setEnabled,
    volume: FORCED_SOUND_VOLUME,
    setVolume,
    mutedUntil,
    unlocked,
    unlockSound,
    notify,
    testSound,
    muteForMinutes,
    clearMute,
  };
}

export default useSoundAlerts;
