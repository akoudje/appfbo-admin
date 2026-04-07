import { useEffect, useRef } from "react";
import { getAdminToken } from "../services/auth";
import { getCountryCode } from "../services/api";

const DEFAULT_API =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://appfbo-backend.onrender.com/api";

function getApiBase() {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API;
}

function getEventsStreamUrl() {
  const token = getAdminToken();
  const country = getCountryCode();
  if (!token || !country) return null;

  const apiBase = getApiBase().replace(/\/+$/, "");
  const backendOrigin = apiBase.replace(/\/api\/?$/, "");
  const url = new URL(`${backendOrigin}/api/admin/events/stream`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", country);
  return url.toString();
}

function computeReconnectDelay(attempt = 0) {
  const boundedAttempt = Math.min(6, Math.max(0, Number(attempt) || 0));
  const base = 1000 * 2 ** boundedAttempt;
  const jitter = Math.floor(Math.random() * 300);
  return Math.min(30000, base + jitter);
}

export function useRealtimeAlerts({ onEvent, onConnectionChange } = {}) {
  const onEventRef = useRef(onEvent);
  const onConnectionChangeRef = useRef(onConnectionChange);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const lastPingAtRef = useRef(0);
  const retryAttemptRef = useRef(0);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
  }, [onConnectionChange]);

  useEffect(() => {
    const streamUrl = getEventsStreamUrl();
    if (!streamUrl || typeof window === "undefined") return undefined;

    let closed = false;
    let eventSource = null;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearHeartbeatWatch = () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) return;
      clearReconnect();
      const waitMs = computeReconnectDelay(retryAttemptRef.current);
      reconnectTimerRef.current = setTimeout(connect, waitMs);
      retryAttemptRef.current += 1;
      onConnectionChangeRef.current?.({
        state: "reconnecting",
        retryInMs: waitMs,
      });
    };

    const connect = () => {
      if (closed) return;
      clearReconnect();
      clearHeartbeatWatch();

      eventSource = new EventSource(streamUrl);
      onConnectionChangeRef.current?.({ state: "connecting" });

      eventSource.addEventListener("alert", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          onEventRef.current?.(payload);
        } catch {
          // Ignore malformed event payloads.
        }
      });

      eventSource.addEventListener("connected", () => {
        retryAttemptRef.current = 0;
        lastPingAtRef.current = Date.now();
        onConnectionChangeRef.current?.({ state: "connected" });
      });

      eventSource.addEventListener("ping", () => {
        lastPingAtRef.current = Date.now();
      });

      eventSource.onerror = () => {
        if (closed) return;
        try {
          eventSource?.close();
        } catch {
          // Ignore close failures.
        }
        onConnectionChangeRef.current?.({ state: "disconnected" });
        scheduleReconnect();
      };

      heartbeatTimerRef.current = setInterval(() => {
        const lastPingAt = Number(lastPingAtRef.current || 0);
        if (!lastPingAt) return;
        if (Date.now() - lastPingAt <= 70000) return;
        try {
          eventSource?.close();
        } catch {
          // Ignore close failures.
        }
        onConnectionChangeRef.current?.({
          state: "disconnected",
          reason: "heartbeat_timeout",
        });
        scheduleReconnect();
      }, 12000);
    };

    connect();

    return () => {
      closed = true;
      clearReconnect();
      clearHeartbeatWatch();
      try {
        eventSource?.close();
      } catch {
        // Ignore close failures.
      }
    };
  }, []);
}

export default useRealtimeAlerts;
