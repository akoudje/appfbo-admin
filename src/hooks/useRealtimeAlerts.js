import { useEffect, useMemo, useRef } from "react";
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

export function useRealtimeAlerts({ onEvent } = {}) {
  const onEventRef = useRef(onEvent);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const streamUrl = useMemo(() => getEventsStreamUrl(), []);

  useEffect(() => {
    if (!streamUrl || typeof window === "undefined") return undefined;

    let closed = false;
    let eventSource = null;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (closed) return;
      clearReconnect();

      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener("alert", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          onEventRef.current?.(payload);
        } catch {
          // Ignore malformed event payloads.
        }
      });

      eventSource.onerror = () => {
        if (closed) return;
        try {
          eventSource?.close();
        } catch {
          // Ignore close failures.
        }
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      closed = true;
      clearReconnect();
      try {
        eventSource?.close();
      } catch {
        // Ignore close failures.
      }
    };
  }, [streamUrl]);
}

export default useRealtimeAlerts;

