import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getOrCreateSharedAudioContext,
  isSoundSessionUnlocked,
  unlockGlobalSoundSession,
} from "../lib/soundEngine";

const STORAGE_PREFIX = "workspace_sound_alert_v1";
const DEFAULT_SOUND_ENABLED = true;
const DEFAULT_SOUND_VOLUME = 1;

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
      { freq: 988, duration: 0.09, gap: 0.035, type: "triangle", layerFreq: 1480 },
      { freq: 1318, duration: 0.12, gap: 0.05, type: "triangle", layerFreq: 1760 },
    ];
  }
  if (key.includes("preparation")) {
    return [
      { freq: 1046, duration: 0.08, gap: 0.035, type: "triangle", layerFreq: 1567 },
      { freq: 1396, duration: 0.11, gap: 0.045, type: "triangle", layerFreq: 1760 },
    ];
  }
  if (key.includes("escalated")) {
    return [
      { freq: 1174, duration: 0.09, gap: 0.04, type: "square", layerFreq: 1567 },
      { freq: 1174, duration: 0.09, gap: 0.04, type: "square", layerFreq: 1567 },
      { freq: 1567, duration: 0.16, gap: 0.06, type: "triangle", layerFreq: 2093 },
    ];
  }
  if (key.includes("ready") || key.includes("launch")) {
    return [
      { freq: 1046, duration: 0.085, gap: 0.035, type: "triangle", layerFreq: 1318 },
      { freq: 1567, duration: 0.14, gap: 0.06, type: "triangle", layerFreq: 2093 },
    ];
  }
  return [
    { freq: 1046, duration: 0.085, gap: 0.03, type: "triangle", layerFreq: 1318 },
    { freq: 1318, duration: 0.1, gap: 0.04, type: "triangle", layerFreq: 1760 },
    { freq: 1567, duration: 0.12, gap: 0.05, type: "triangle", layerFreq: 2093 },
  ];
}

function playBeepPattern(audioContext, pattern, volume = 0.6) {
  if (!audioContext) return;

  const now = audioContext.currentTime;
  let cursor = now + 0.01;

  pattern.forEach((step) => {
    const gainNode = audioContext.createGain();
    const stepVolume = Math.max(0, Math.min(1, Number(volume || 0.6)));
    const attack = Number(step.attack || 0.008);
    const duration = Number(step.duration || 0.12);
    const releaseAt = cursor + Math.max(0.02, duration);
    const primary = audioContext.createOscillator();
    primary.type = step.type || "triangle";
    primary.frequency.value = Number(step.freq || 700);

    const shimmer = audioContext.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = Number(step.layerFreq || Number(step.freq || 700) * 1.5);

    const shimmerGain = audioContext.createGain();

    gainNode.gain.setValueAtTime(0.0001, cursor);
    gainNode.gain.exponentialRampToValueAtTime(stepVolume, cursor + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      releaseAt,
    );

    shimmerGain.gain.setValueAtTime(0.0001, cursor);
    shimmerGain.gain.exponentialRampToValueAtTime(stepVolume * 0.28, cursor + attack);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, releaseAt);

    primary.connect(gainNode);
    gainNode.connect(audioContext.destination);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(audioContext.destination);

    primary.start(cursor);
    shimmer.start(cursor);
    primary.stop(releaseAt + 0.03);
    shimmer.stop(releaseAt + 0.03);

    cursor += duration + Number(step.gap || 0.06);
  });
}

export function useSoundAlerts(workspaceKey) {
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${String(workspaceKey || "default").toLowerCase()}`,
    [workspaceKey],
  );

  const [enabled, setEnabled] = useState(DEFAULT_SOUND_ENABLED);
  const [volume, setVolume] = useState(DEFAULT_SOUND_VOLUME);
  const [mutedUntil, setMutedUntil] = useState(0);
  const [unlocked, setUnlocked] = useState(() => isSoundSessionUnlocked());

  const audioContextRef = useRef(null);
  const cooldownRef = useRef(new Map());
  const signatureRef = useRef(new Map());

  useEffect(() => {
    const saved = safeReadStorage(storageKey, {
      enabled: DEFAULT_SOUND_ENABLED,
      volume: DEFAULT_SOUND_VOLUME,
      mutedUntil: 0,
    });
    const nextEnabled =
      typeof saved.enabled === "boolean" ? saved.enabled : DEFAULT_SOUND_ENABLED;
    const parsedVolume = Number(saved.volume);
    const nextVolume =
      Number.isFinite(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1
        ? parsedVolume
        : DEFAULT_SOUND_VOLUME;
    setEnabled(nextEnabled);
    setVolume(nextVolume);
    setMutedUntil(Number(saved.mutedUntil || 0));
  }, [storageKey]);

  useEffect(() => {
    safeWriteStorage(storageKey, {
      enabled,
      volume,
      mutedUntil,
    });
  }, [storageKey, enabled, volume, mutedUntil]);

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
      playBeepPattern(ctx, eventPattern(eventKey), volume);
      return true;
    },
    [ensureAudioContext, volume],
  );

  const notify = useCallback(
    async (eventKey, options = {}) => {
      const {
        signature = null,
        cooldownMs = 45000,
      } = options || {};

      if (!enabled) return false;
      if (Number(mutedUntil || 0) > Date.now()) return false;
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
    [enabled, mutedUntil, play, unlocked],
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
    enabled,
    setEnabled,
    volume,
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
