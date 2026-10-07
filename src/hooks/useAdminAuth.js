import { useMemo, useSyncExternalStore } from "react";
import { getAdminUser, isAuthed } from "../services/auth";
import { getRolePermissions } from "../auth/permissions";
function subscribe(listener) {
  window.addEventListener("storage", listener);
  window.addEventListener("admin-session-change", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("admin-session-change", listener);
  };
}
function snapshot() {
  return JSON.stringify({ admin: getAdminUser(), authed: isAuthed() });
}
const serverSnapshot = () => '{"admin":null,"authed":false}';
export default function useAdminAuth() {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => {
    const { admin, authed } = JSON.parse(value);
    const permissions = Array.isArray(admin?.permissions)
      ? admin.permissions
      : getRolePermissions(admin?.role);
    return {
      admin,
      isAuthenticated: authed,
      role: admin?.role || null,
      permissions,
      fullName: admin?.fullName || null,
      email: admin?.email || null,
      countryId: admin?.countryId || null,
    };
  }, [value]);
}
