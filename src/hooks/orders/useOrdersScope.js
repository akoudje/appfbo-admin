import { useSyncExternalStore } from "react";
import { getCountryCode } from "../../services/api";
import { getAdminUser } from "../../services/auth";
function subscribe(listener) {
  const events = ["storage", "admin-session-change", "country-code-change"];
  events.forEach((event) => window.addEventListener(event, listener));
  return () =>
    events.forEach((event) => window.removeEventListener(event, listener));
}
export function ordersScopeKey() {
  return `${getAdminUser()?.id || "guest"}:${getCountryCode()}`;
}
export default function useOrdersScope() {
  return useSyncExternalStore(subscribe, ordersScopeKey, () => "guest:CIV");
}
