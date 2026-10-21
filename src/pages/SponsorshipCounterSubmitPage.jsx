// src/pages/SponsorshipCounterSubmitPage.jsx
// Soumission d'un parrainage au comptoir, pour un parrain dont le numéro
// n'est pas (encore) reconnu par FBO Service (non synchronisé AS400) et qui
// ne peut donc pas se connecter à son espace client pour le faire lui-même.
// Le facturier saisit les informations comme si le parrain se présentait en
// personne, avec sa pièce d'identité et celle du filleul.

import { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { sponsorshipsService } from "../services/sponsorshipsService";
import { formatFboNumber, defaultFboNumberPrefix } from "../utils/fboNumber";

const SPONSOR_GRADE_OPTIONS = [
  { value: "ANIMATEUR_ADJOINT", label: "Animateur adjoint" },
  { value: "ANIMATEUR", label: "Animateur" },
  { value: "MANAGER_ADJOINT", label: "Manager adjoint" },
  { value: "MANAGER", label: "Manager" },
];

const ID_DOCUMENT_OPTIONS = [
  { value: "CNI", label: "Carte nationale d'identité" },
  { value: "PASSPORT", label: "Passeport" },
  { value: "DRIVING_LICENSE", label: "Permis de conduire" },
  { value: "CONSULAR_CARD", label: "Carte consulaire" },
  { value: "OTHER", label: "Autre pièce officielle" },
];

function emptyForm() {
  return {
    sponsorNumero: defaultFboNumberPrefix(),
    sponsorNom: "",
    sponsorGrade: "",
    sponsorCity: "",
    sponsorPhone: "",
    lastName: "",
    firstNames: "",
    birthDate: "",
    birthPlace: "",
    idDocumentType: "CNI",
    idDocumentNumber: "",
    passportNumber: "",
    mobile: "",
    email: "",
    addressArea: "",
    city: "",
    postalBox: "",
    zoneCode: "",
    homeCountry: "CI",
    maritalStatus: "",
    childrenCount: "",
    bankRib: "",
    spouseLastName: "",
    spouseFirstNames: "",
    spouseBirthDate: "",
    spouseBirthPlace: "",
    profession: "",
    businessSector: "",
    tradeRegisterNumber: "",
    tradeRegisterDate: "",
    tradeRegisterPlace: "",
    consentAccepted: false,
  };
}

function inputClass() {
  return "min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:text-gray-500";
}

function Field({ label, required = false, children, hint = "" }) {
  const id = `field-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="text-xs font-semibold text-gray-600">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {typeof children === "function" ? children(id) : children}
      {hint ? <span className="block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function SponsorshipCounterSubmitPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({ idFront: null, idBack: null, passport: null, other: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = useCallback((key, value) => setForm((prev) => ({ ...prev, [key]: value })), []);
  const setFile = useCallback(
    (key, file) => setFiles((prev) => ({ ...prev, [key]: file })),
    [],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!form.consentAccepted) {
      setError("Le parrain doit attester disposer de l'accord et de la procuration du filleul.");
      return;
    }
    const requiredUpload = form.idDocumentType === "PASSPORT" ? files.passport : files.idFront;
    if (!requiredUpload) {
      setError(
        form.idDocumentType === "PASSPORT"
          ? "Joignez la page d'identité du passeport du filleul."
          : "Joignez le recto de la pièce d'identité du filleul.",
      );
      return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (key === "consentAccepted") {
        formData.append(key, value ? "true" : "false");
      } else if (value !== "" && value != null) {
        formData.append(key, value);
      }
    }
    for (const [key, file] of Object.entries(files)) {
      if (file) formData.append(key, file);
    }

    try {
      setSaving(true);
      const result = await sponsorshipsService.counterSubmit(formData);
      navigate(`/sponsorships/${result.id}`, {
        state: { notice: "Parrainage soumis au comptoir avec succès." },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Soumission du parrainage impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/sponsorships" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Parrainages
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
            <UserPlus className="h-6 w-6" /> Nouveau parrainage au comptoir
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            À utiliser quand le parrain ne peut pas se connecter à son espace client (numéro FBO
            pas encore reconnu par FBO Service). Saisissez ses informations comme s'il se
            présentait en personne, avec les pièces d'identité du filleul.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Parrain" description="Identité du FBO qui parraine, saisie en personne.">
          <Field label="Numéro FBO" required>
            {(id) => (
              <input
                id={id}
                className={inputClass()}
                value={form.sponsorNumero}
                onChange={(e) => set("sponsorNumero", formatFboNumber(e.target.value))}
                placeholder="221-000-250-359"
                inputMode="numeric"
                maxLength={15}
                required
              />
            )}
          </Field>
          <Field label="Nom complet" required>
            {(id) => (
              <input id={id} className={inputClass()} value={form.sponsorNom} onChange={(e) => set("sponsorNom", e.target.value)} required />
            )}
          </Field>
          <Field label="Grade" required hint="Réservé à Animateur adjoint et plus.">
            {(id) => (
              <select id={id} className={inputClass()} value={form.sponsorGrade} onChange={(e) => set("sponsorGrade", e.target.value)} required>
                <option value="">Sélectionner…</option>
                {SPONSOR_GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Téléphone du parrain" required>
            {(id) => (
              <input id={id} className={inputClass()} value={form.sponsorPhone} onChange={(e) => set("sponsorPhone", e.target.value)} required />
            )}
          </Field>
          <Field label="Ville du parrain">
            {(id) => (
              <input id={id} className={inputClass()} value={form.sponsorCity} onChange={(e) => set("sponsorCity", e.target.value)} />
            )}
          </Field>
        </Section>

        <Section title="Filleul — identité">
          <Field label="Nom" required>
            {(id) => <input id={id} className={inputClass()} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />}
          </Field>
          <Field label="Prénoms" required>
            {(id) => <input id={id} className={inputClass()} value={form.firstNames} onChange={(e) => set("firstNames", e.target.value)} required />}
          </Field>
          <Field label="Date de naissance" required>
            {(id) => (
              <input id={id} type="date" className={inputClass()} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} required />
            )}
          </Field>
          <Field label="Lieu de naissance" required>
            {(id) => <input id={id} className={inputClass()} value={form.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} required />}
          </Field>
          <Field label="Type de pièce d'identité" required>
            {(id) => (
              <select id={id} className={inputClass()} value={form.idDocumentType} onChange={(e) => set("idDocumentType", e.target.value)} required>
                {ID_DOCUMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="N° de la pièce d'identité" required>
            {(id) => (
              <input id={id} className={inputClass()} value={form.idDocumentNumber} onChange={(e) => set("idDocumentNumber", e.target.value)} required />
            )}
          </Field>
          <Field label="N° de passeport" hint="Si différent de la pièce ci-dessus.">
            {(id) => (
              <input id={id} className={inputClass()} value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} />
            )}
          </Field>
        </Section>

        <Section title="Filleul — coordonnées">
          <Field label="Téléphone mobile" required>
            {(id) => <input id={id} className={inputClass()} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />}
          </Field>
          <Field label="Email" required hint="Doit être unique à ce parrainage.">
            {(id) => <input id={id} type="email" className={inputClass()} value={form.email} onChange={(e) => set("email", e.target.value)} required />}
          </Field>
          <Field label="Ville" required>
            {(id) => <input id={id} className={inputClass()} value={form.city} onChange={(e) => set("city", e.target.value)} required />}
          </Field>
          <Field label="Quartier / zone">
            {(id) => <input id={id} className={inputClass()} value={form.addressArea} onChange={(e) => set("addressArea", e.target.value)} />}
          </Field>
          <Field label="Boîte postale">
            {(id) => <input id={id} className={inputClass()} value={form.postalBox} onChange={(e) => set("postalBox", e.target.value)} />}
          </Field>
          <Field label="Code zone">
            {(id) => <input id={id} className={inputClass()} value={form.zoneCode} onChange={(e) => set("zoneCode", e.target.value)} />}
          </Field>
          <Field label="Pays d'origine">
            {(id) => <input id={id} className={inputClass()} value={form.homeCountry} onChange={(e) => set("homeCountry", e.target.value)} />}
          </Field>
        </Section>

        <Section title="Filleul — pièces d'identité" description="Photos ou scans (JPEG, PNG, WEBP ou PDF, 8 Mo max chacun).">
          <Field label={form.idDocumentType === "PASSPORT" ? "Page d'identité du passeport" : "Pièce d'identité — recto"} required>
            {(id) => (
              <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className={inputClass()}
                onChange={(e) => setFile(form.idDocumentType === "PASSPORT" ? "passport" : "idFront", e.target.files?.[0] || null)}
              />
            )}
          </Field>
          {form.idDocumentType !== "PASSPORT" ? (
            <Field label="Pièce d'identité — verso">
              {(id) => (
                <input
                  id={id}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className={inputClass()}
                  onChange={(e) => setFile("idBack", e.target.files?.[0] || null)}
                />
              )}
            </Field>
          ) : null}
          <Field label="Autre pièce (optionnel)">
            {(id) => (
              <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className={inputClass()}
                onChange={(e) => setFile("other", e.target.files?.[0] || null)}
              />
            )}
          </Field>
        </Section>

        <Section title="Conjoint (optionnel)">
          <Field label="Statut matrimonial">
            {(id) => <input id={id} className={inputClass()} value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)} />}
          </Field>
          <Field label="Nombre d'enfants">
            {(id) => (
              <input id={id} type="number" min="0" max="50" className={inputClass()} value={form.childrenCount} onChange={(e) => set("childrenCount", e.target.value)} />
            )}
          </Field>
          <Field label="Nom du conjoint">
            {(id) => <input id={id} className={inputClass()} value={form.spouseLastName} onChange={(e) => set("spouseLastName", e.target.value)} />}
          </Field>
          <Field label="Prénoms du conjoint">
            {(id) => <input id={id} className={inputClass()} value={form.spouseFirstNames} onChange={(e) => set("spouseFirstNames", e.target.value)} />}
          </Field>
          <Field label="Date de naissance du conjoint">
            {(id) => <input id={id} type="date" className={inputClass()} value={form.spouseBirthDate} onChange={(e) => set("spouseBirthDate", e.target.value)} />}
          </Field>
          <Field label="Lieu de naissance du conjoint">
            {(id) => <input id={id} className={inputClass()} value={form.spouseBirthPlace} onChange={(e) => set("spouseBirthPlace", e.target.value)} />}
          </Field>
        </Section>

        <Section title="Activité commerciale (optionnel)">
          <Field label="Profession">
            {(id) => <input id={id} className={inputClass()} value={form.profession} onChange={(e) => set("profession", e.target.value)} />}
          </Field>
          <Field label="Secteur d'activité">
            {(id) => <input id={id} className={inputClass()} value={form.businessSector} onChange={(e) => set("businessSector", e.target.value)} />}
          </Field>
          <Field label="N° registre de commerce">
            {(id) => <input id={id} className={inputClass()} value={form.tradeRegisterNumber} onChange={(e) => set("tradeRegisterNumber", e.target.value)} />}
          </Field>
          <Field label="Date du registre de commerce">
            {(id) => <input id={id} type="date" className={inputClass()} value={form.tradeRegisterDate} onChange={(e) => set("tradeRegisterDate", e.target.value)} />}
          </Field>
          <Field label="Lieu du registre de commerce">
            {(id) => <input id={id} className={inputClass()} value={form.tradeRegisterPlace} onChange={(e) => set("tradeRegisterPlace", e.target.value)} />}
          </Field>
          <Field label="RIB bancaire">
            {(id) => <input id={id} className={inputClass()} value={form.bankRib} onChange={(e) => set("bankRib", e.target.value)} />}
          </Field>
        </Section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <label className="flex items-start gap-3 text-sm text-amber-900">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={form.consentAccepted}
              onChange={(e) => set("consentAccepted", e.target.checked)}
            />
            <span>
              Le parrain atteste disposer de l'accord et de la procuration du filleul pour
              l'inscrire comme distributeur et transmettre ses informations et sa pièce
              d'identité à Forever Living Products.
            </span>
          </label>
        </section>

        <div className="flex justify-end gap-3">
          <Link to="/sponsorships" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#FFC600] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#e6b200] disabled:opacity-50"
          >
            {saving ? "Soumission…" : "Soumettre le parrainage"}
          </button>
        </div>
      </form>
    </div>
  );
}
