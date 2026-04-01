const SOUND_SESSION_KEY = "sound_alerts_session_unlocked_v1";

function getAudioContextCtor() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

export function isSoundSessionUnlocked() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SOUND_SESSION_KEY) === "1";
}

export function markSoundSessionUnlocked() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SOUND_SESSION_KEY, "1");
}

export function getOrCreateSharedAudioContext() {
  if (typeof window === "undefined") return null;
  if (window.__APP_SHARED_AUDIO_CONTEXT__) return window.__APP_SHARED_AUDIO_CONTEXT__;

  const Ctx = getAudioContextCtor();
  if (!Ctx) return null;
  const ctx = new Ctx();
  window.__APP_SHARED_AUDIO_CONTEXT__ = ctx;
  return ctx;
}

export async function unlockGlobalSoundSession() {
  const ctx = getOrCreateSharedAudioContext();
  if (!ctx) return false;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  markSoundSessionUnlocked();
  return true;
}

