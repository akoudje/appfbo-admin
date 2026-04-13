// src/pages/Login.jsx

import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { setAdminToken, setAdminUser } from "../services/auth";
import { getDefaultWorkspaceRoute } from "../auth/workspaces";
import { foreverLogoHomeUrl } from "../lib/assetUrls";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const emailInputRef = useRef(null);
  const submitButtonRef = useRef(null);

  // Focus automatique sur le champ email au chargement
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Gestionnaire de touche Entrée pour soumettre plus facilement
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && email && password) {
      e.preventDefault();
      submitButtonRef.current?.click();
    }
  };

  async function onSubmit(e) {
    e.preventDefault();
    
    // Validation basique côté client
    if (!email.trim() || !password.trim()) {
      setErr("Veuillez remplir tous les champs");
      return;
    }

    if (!email.includes('@')) {
      setErr("Format d'email invalide");
      return;
    }

    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/admin/auth/login", {
        email: email.trim().toLowerCase(), // Normalisation en minuscules
        password,
      });

      const { token, user } = res.data || {};

      if (!token || !user) {
        throw new Error("Réponse du serveur incomplète");
      }

      // Stockage des informations
      setAdminToken(token);
      setAdminUser(user);

      // Redirection
      navigate(
        redirectTo && redirectTo !== "/" ? redirectTo : getDefaultWorkspaceRoute(user?.role),
        { replace: true },
      );
    } catch (e) {
      const msg = 
        e?.response?.data?.message ||
        e?.message ||
        "Échec de la connexion. Vérifiez vos identifiants.";
      
      setErr(msg);
      
      // Focus sur le champ email en cas d'erreur
      emailInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,198,0,0.22),_transparent_28%),linear-gradient(180deg,#0b0b0b_0%,#171717_55%,#0b0b0b_100%)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={foreverLogoHomeUrl}
            alt="Forever"
            className="mx-auto h-28 w-auto object-contain sm:h-32"
          />
          <h2 className="mt-4 text-2xl font-bold text-white">Backoffice Forever</h2>
          <p className="text-sm text-[#FFC600]">Connexion à l’espace d’administration</p>
        </div>

        <div className="rounded-2xl border border-[#2e2e2e] bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
          {err && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-shake">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{err}</span>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white focus:border-[#FFC600] focus:ring-2 focus:ring-[#FFC600]/35 transition-colors outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="exemple@forever.ci"
                disabled={loading}
                required
                aria-invalid={err ? "true" : "false"}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-white focus:border-[#FFC600] focus:ring-2 focus:ring-[#FFC600]/35 transition-colors outline-none disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="••••••••"
                  disabled={loading}
                  required
                  aria-invalid={err ? "true" : "false"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              ref={submitButtonRef}
              type="submit"
              disabled={loading}
              className="w-full h-11 px-4 rounded-lg bg-[#FFC600] font-medium text-black hover:bg-[#e6b200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/50 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors relative"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Lien "Mot de passe oublié" (optionnel) */}
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-gray-500 hover:text-black transition-colors">
              Mot de passe oublié ?
            </a>
          </div>
        </div>

        <p className="mt-4 text-xs text-center text-white/50">
          © 2024 Forever. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
