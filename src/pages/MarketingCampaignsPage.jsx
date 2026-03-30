import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "appfbo-admin-marketing-campaigns-draft";

const DEFAULT_SETTINGS = {
  slides: [
    {
      id: "slide-1",
      title: "Slide 1",
      image: "/Slide1.png",
      link: "",
      active: true,
      note: "Slide principal du catalogue FBO.",
    },
    {
      id: "slide-2",
      title: "Slide 2",
      image: "/Slide2.png",
      link: "",
      active: true,
      note: "Slide secondaire du catalogue FBO.",
    },
    {
      id: "slide-3",
      title: "Slide 3",
      image: "/Slide3.png",
      link: "",
      active: true,
      note: "Slide tertiaire du catalogue FBO.",
    },
  ],
  sidePanels: {
    left: {
      title: "Panneau gauche",
      image: "",
      link: "",
      active: false,
      note: "Zone desktop pour future campagne.",
    },
    right: {
      title: "Panneau droit",
      image: "",
      link: "",
      active: false,
      note: "Zone desktop pour future campagne.",
    },
  },
  publishing: {
    frontendTarget: "frontend",
    environment: "preview",
    lastUpdatedBy: "",
    releaseNote: "",
  },
};

function loadInitialState() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      sidePanels: {
        ...DEFAULT_SETTINGS.sidePanels,
        ...(parsed?.sidePanels || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Card({ title, description, actions, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {children}
      {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-gray-100 text-gray-600"
      }`}
    >
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function SlideEditor({ slide, onChange }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{slide.title}</div>
          <div className="text-xs text-gray-500">{slide.id}</div>
        </div>
        <StatusBadge active={slide.active} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {slide.image ? (
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-gray-400">
              Aperçu image
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre interne">
            <TextInput
              value={slide.title}
              onChange={(e) => onChange({ ...slide, title: e.target.value })}
            />
          </Field>

          <Field label="Image" hint="Ex: /Slide1.png">
            <TextInput
              value={slide.image}
              onChange={(e) => onChange({ ...slide, image: e.target.value })}
            />
          </Field>

          <Field label="Lien cible" hint="Optionnel">
            <TextInput
              value={slide.link}
              onChange={(e) => onChange({ ...slide, link: e.target.value })}
              placeholder="https://..."
            />
          </Field>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={slide.active}
              onChange={(e) => onChange({ ...slide, active: e.target.checked })}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Slide actif</div>
              <div className="text-xs text-gray-500">
                Visible dans le slider du catalogue frontend.
              </div>
            </div>
          </label>

          <div className="md:col-span-2">
            <Field label="Note interne">
              <TextArea
                rows={3}
                value={slide.note}
                onChange={(e) => onChange({ ...slide, note: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidePanelEditor({ title, value, onChange }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <StatusBadge active={value.active} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre interne">
          <TextInput
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
          />
        </Field>

        <Field label="Image / visuel" hint="Ex: /campaign-left.png">
          <TextInput
            value={value.image}
            onChange={(e) => onChange({ ...value, image: e.target.value })}
          />
        </Field>

        <Field label="Lien cible" hint="Optionnel">
          <TextInput
            value={value.link}
            onChange={(e) => onChange({ ...value, link: e.target.value })}
            placeholder="https://..."
          />
        </Field>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => onChange({ ...value, active: e.target.checked })}
          />
          <div>
            <div className="text-sm font-medium text-gray-900">Panneau actif</div>
            <div className="text-xs text-gray-500">
              Affiché sur desktop à côté de la grille produit.
            </div>
          </div>
        </label>

        <div className="md:col-span-2">
          <Field label="Note interne">
            <TextArea
              rows={3}
              value={value.note}
              onChange={(e) => onChange({ ...value, note: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export default function MarketingCampaignsPage() {
  const [settings, setSettings] = useState(loadInitialState);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [settings]);

  const activeSlides = useMemo(
    () => settings.slides.filter((slide) => slide.active).length,
    [settings.slides],
  );

  const activePanels = useMemo(
    () =>
      Number(Boolean(settings.sidePanels.left.active)) +
      Number(Boolean(settings.sidePanels.right.active)),
    [settings.sidePanels],
  );

  return (
    <div className="space-y-6">
      <Card
        title="Campagnes marketing"
        description="Gère ici les visuels promotionnels du frontend utilisateur: slider catalogue, panneaux latéraux desktop et préparation de publication."
        actions={
          <div className="flex items-center gap-3">
            {saved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Brouillon sauvegardé
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm text-gray-500">Slides actifs</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{activeSlides}/3</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm text-gray-500">Panneaux actifs</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{activePanels}/2</div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="text-sm text-gray-500">Environnement</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {settings.publishing.environment}
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Slides frontend"
        description="Prépare les 3 visuels principaux affichés dans le catalogue utilisateur."
      >
        <div className="space-y-4">
          {settings.slides.map((slide, index) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              onChange={(nextSlide) =>
                setSettings((prev) => {
                  const slides = [...prev.slides];
                  slides[index] = nextSlide;
                  return { ...prev, slides };
                })
              }
            />
          ))}
        </div>
      </Card>

      <Card
        title="Panneaux latéraux"
        description="Prépare les deux espaces visuels desktop autour de la grille catalogue."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <SidePanelEditor
            title="Panneau gauche"
            value={settings.sidePanels.left}
            onChange={(next) =>
              setSettings((prev) => ({
                ...prev,
                sidePanels: { ...prev.sidePanels, left: next },
              }))
            }
          />
          <SidePanelEditor
            title="Panneau droit"
            value={settings.sidePanels.right}
            onChange={(next) =>
              setSettings((prev) => ({
                ...prev,
                sidePanels: { ...prev.sidePanels, right: next },
              }))
            }
          />
        </div>
      </Card>

      <Card
        title="Préparation de publication"
        description="Conserve ici le contexte de diffusion des contenus marketing avant branchement sur une API."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Projet cible">
            <TextInput
              value={settings.publishing.frontendTarget}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  publishing: { ...prev.publishing, frontendTarget: e.target.value },
                }))
              }
            />
          </Field>

          <Field label="Environnement">
            <select
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={settings.publishing.environment}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  publishing: { ...prev.publishing, environment: e.target.value },
                }))
              }
            >
              <option value="preview">Preview</option>
              <option value="production">Production</option>
            </select>
          </Field>

          <Field label="Dernière mise à jour par">
            <TextInput
              value={settings.publishing.lastUpdatedBy}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  publishing: { ...prev.publishing, lastUpdatedBy: e.target.value },
                }))
              }
            />
          </Field>

          <Field label="Note de publication">
            <TextArea
              rows={5}
              value={settings.publishing.releaseNote}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  publishing: { ...prev.publishing, releaseNote: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
