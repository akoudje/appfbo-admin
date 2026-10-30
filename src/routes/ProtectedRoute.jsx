// src/routes/ProtectedRoute.jsx
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import api, { setCountryCode } from "../services/api";
import { isAuthed, setAdminUser } from "../services/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const authed = isAuthed();

  useEffect(() => {
    if (!authed) return;

    let mounted = true;
    api.get("/admin/auth/me")
      .then((res) => {
        if (!mounted) return;
        const user = res.data?.user;
        if (!user) return;
        setAdminUser(user);
        // Un super admin garde le pays choisi dans la topbar : le pays de
        // son compte n'est qu'un défaut appliqué à la connexion (Login.jsx).
        if (user.countryCode && user.role !== "SUPER_ADMIN") setCountryCode(user.countryCode);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [authed]);

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
