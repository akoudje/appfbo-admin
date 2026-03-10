import { useEffect, useMemo, useState } from "react";
import { gradeDiscountsService } from "../services/gradeDiscountsService";

const COUNTRY_OPTIONS = [
  { code: "CIV", name: "Côte d’Ivoire" },
  { code: "BFA", name: "Burkina Faso" },
  { code: "TGO", name: "Togo" },
  { code: "BEN", name: "Bénin" },
  { code: "NER", name: "Niger" },
];

const GRADE_LABELS = {
  CLIENT_PRIVILEGIE: "Client Privilégié",
  ANIMATEUR_ADJOINT: "Animateur Adjoint",
  ANIMATEUR: "Animateur",
  MANAGER_ADJOINT: "Manager Adjoint",
  MANAGER: "Manager",
};

function Card({ title, children, actions }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Alert({ tone = "blue", children }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    red: "border-red-200 bg-red-50 text-red-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.blue}`}>
      {children}
    </div>
  );
}

export default function AdminGradeDiscountsPage() {
  const [countryCode, setCountryCode] = useState("CIV");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((c) => c.code === countryCode),
    [countryCode]
  );

  const load = async (nextCountryCode = countryCode) => {
    try {
      setLoading(true);
      setError("");
      setInfo("");

      const data = await gradeDiscountsService.getByCountryCode(nextCountryCode);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les remises");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(countryCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  const updateItem = (grade, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.grade === grade ? { ...it, discountPercent: value } : it
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const payload = items.map((it) => ({
        grade: it.grade,
        discountPercent: it.discountPercent,
      }));

      const data = await gradeDiscountsService.saveByCountryCode(
        countryCode,
        payload
      );

      setItems(Array.isArray(data?.items) ? data.items : []);
      setInfo("Remises enregistrées avec succès.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’enregistrer les remises");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Remises par grade"
        actions={
          <div className="flex items-center gap-3">
            <select
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              disabled={loading || saving}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert tone="blue">
            Définis ici les pourcentages de remise appliqués aux produits selon le
            grade FBO pour <strong>{selectedCountry?.name || countryCode}</strong>.
          </Alert>

          {error ? <Alert tone="red">{error}</Alert> : null}
          {info ? <Alert tone="emerald">{info}</Alert> : null}

          {loading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Grade
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Remise (%)
                    </th>
                    <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dernière mise à jour
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.grade}>
                      <td className="border-b border-gray-100 px-4 py-4 text-sm font-medium text-gray-900">
                        {GRADE_LABELS[row.grade] || row.grade}
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="flex max-w-[160px] items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={row.discountPercent}
                            onChange={(e) =>
                              updateItem(row.grade, e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                            disabled={saving}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4 text-sm text-gray-500">
                        {row.updatedAt
                          ? new Date(row.updatedAt).toLocaleString("fr-FR")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}