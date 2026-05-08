import { useEffect, useMemo, useState } from "react";
import { marketingCampaignsService } from "../services/marketingCampaignsService";
import { Permission } from "../auth/permissions";
import { usePermission } from "../hooks/usePermission";

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
  smsCampaigns: [],
};

function Card({ title, description, actions, children }) {
  return (
    <section className="border border-[#e7dec8] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efe7d7] px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-[#000000]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[#6f6a60]">{description}</p>
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
      <div className="text-sm font-medium text-[#5D4B3C]">{label}</div>
      {children}
      {hint ? <div className="text-xs text-[#8d7a5c]">{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full border border-[#e7dec8] px-3 py-2.5 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20 ${
        props.disabled ? "cursor-not-allowed bg-[#f6f2e8] text-[#8d7a5c]" : ""
      }`}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full border border-[#e7dec8] px-3 py-2.5 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20 ${
        props.disabled ? "cursor-not-allowed bg-[#f6f2e8] text-[#8d7a5c]" : ""
      }`}
    />
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-[#bad6a7] bg-[#eef7e8] text-[#587f34]"
          : "border-[#e7dec8] bg-[#fcfbf7] text-[#8d7a5c]"
      }`}
    >
      {active ? "Actif" : "Inactif"}
    </span>
  );
}

function createSmsCampaign() {
  const now = new Date().toISOString();
  return {
    id: `sms-${Date.now()}`,
    name: "Invitation événement",
    type: "EVENT_INVITATION",
    eventName: "",
    eventDate: "",
    location: "",
    confirmationLink: "",
    message:
      "Bonjour {{nom}}, vous etes invite(e) a {{eventName}} le {{eventDate}} a {{location}}. Infos: {{link}}",
    status: "DRAFT",
    testPhone: "",
    recipients: [],
    createdAt: now,
    updatedAt: now,
    lastSentAt: null,
    lastTestAt: null,
  };
}

function normalizePhoneForUi(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+225${digits}`;
  if (digits.startsWith("225") && digits.length === 13) {
    return `+${digits}`;
  }
  if (String(value || "").trim().startsWith("+225") && digits.length === 13) {
    return String(value || "").trim().replace(/\s+/g, "");
  }
  return "";
}

function parseRecipients(rawText = "") {
  const rows = String(rawText || "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const seen = new Set();

  return rows.map((row, index) => {
    const parts = row.split(/[;\t,]/).map((part) => part.trim());
    const phoneCandidate = parts.find((part) => /\d{6,}/.test(part)) || row;
    const phoneNormalized = normalizePhoneForUi(phoneCandidate);
    const duplicateKey = phoneNormalized.replace(/\D/g, "");
    const isDuplicate = duplicateKey && seen.has(duplicateKey);
    if (duplicateKey) seen.add(duplicateKey);

    return {
      id: `recipient-${Date.now()}-${index + 1}`,
      nom: parts[0] && !/\d{6,}/.test(parts[0]) ? parts[0] : "",
      numeroFbo: parts.find((part) => /\d{3}[-\s]?\d{3}[-\s]?\d{3}/.test(part)) || "",
      phoneRaw: phoneCandidate,
      phoneNormalized,
      ville: parts[2] || "",
      grade: parts[3] || "",
      status: !phoneNormalized ? "INVALID" : isDuplicate ? "SKIPPED" : "READY",
      providerMessageId: "",
      lastError: isDuplicate ? "Doublon detecte" : "",
      sentAt: null,
    };
  });
}

function getSmsStats(campaign = {}) {
  const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
  return recipients.reduce(
    (acc, recipient) => {
      acc.total += 1;
      const status = String(recipient.status || "").toUpperCase();
      if (recipient.phoneNormalized && status !== "SKIPPED") acc.valid += 1;
      if (status === "SENT") acc.sent += 1;
      if (status === "FAILED") acc.failed += 1;
      if (status === "INVALID") acc.invalid += 1;
      if (status === "SKIPPED") acc.skipped += 1;
      if (status === "CONFIRMED") acc.confirmed += 1;
      if (status === "DECLINED") acc.declined += 1;
      return acc;
    },
    { total: 0, valid: 0, sent: 0, failed: 0, invalid: 0, skipped: 0, confirmed: 0, declined: 0 },
  );
}

function renderSmsPreview(campaign = {}) {
  const recipient = campaign.recipients?.find((item) => item.phoneNormalized) || {};
  const link = campaign.confirmationLink || "https://forevercivstore.com/e/exemple";
  const rendered = String(campaign.message || "")
    .replace(/{{\s*nom\s*}}/gi, recipient.nom || "FBO")
    .replace(/{{\s*numeroFbo\s*}}/gi, recipient.numeroFbo || "000-000-000")
    .replace(/{{\s*eventName\s*}}/gi, campaign.eventName || campaign.name || "Evenement Forever")
    .replace(/{{\s*eventDate\s*}}/gi, campaign.eventDate || "date a confirmer")
    .replace(/{{\s*location\s*}}/gi, campaign.location || "lieu a confirmer")
    .replace(/{{\s*link\s*}}/gi, link);

  return rendered
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value = "") {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCampaignRecipients(campaign = {}) {
  const rows = Array.isArray(campaign.recipients) ? campaign.recipients : [];
  const header = ["Nom", "Numero FBO", "Telephone", "Ville", "Grade", "Statut", "Envoye le", "Erreur"];
  const body = rows.map((recipient) => [
    recipient.nom,
    recipient.numeroFbo,
    recipient.phoneNormalized || recipient.phoneRaw,
    recipient.ville,
    recipient.grade,
    recipient.status,
    recipient.sentAt,
    recipient.lastError,
  ]);
  const csv = [header, ...body].map((row) => row.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(campaign.name || "campagne-sms")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "campagne-sms"}-suivi.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getRenderableSlides(slides = []) {
  const activeSlides = Array.isArray(slides)
    ? slides.filter((slide) => slide?.active && slide?.image)
    : [];

  return activeSlides.slice(0, 3);
}

function getRenderablePanels(sidePanels = {}) {
  return {
    left:
      sidePanels?.left?.active && sidePanels?.left?.image ? sidePanels.left : null,
    right:
      sidePanels?.right?.active && sidePanels?.right?.image ? sidePanels.right : null,
  };
}

function MiniSlidePreview({ slide, isPrimary = false }) {
  if (!slide?.image) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center bg-[#f6f2e8] text-xs text-[#8d7a5c]">
        Aucun visuel actif
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[160px] overflow-hidden bg-[#f6f2e8]">
      <img
        src={slide.image}
        alt={slide.title || "Slide marketing"}
        className={`h-full w-full object-cover ${isPrimary ? "" : "opacity-90"}`}
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
        <div className="text-sm font-semibold text-white">
          {slide.title || "Slide sans titre"}
        </div>
        {slide.note ? (
          <div className="mt-1 line-clamp-2 text-xs text-white/85">{slide.note}</div>
        ) : null}
      </div>
    </div>
  );
}

function MiniPanelPreview({ panel, label }) {
  return (
    <div className="overflow-hidden border border-[#e7dec8] bg-white">
      {panel?.image ? (
        <div className="relative min-h-[180px]">
          <img
            src={panel.image}
            alt={panel.title || label}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {label}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {panel.title || "Sans titre"}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center bg-[#f6f2e8] px-4 text-center text-xs text-[#8d7a5c]">
          {label} inactif ou sans visuel
        </div>
      )}
    </div>
  );
}

function DeviceToggle({ value, onChange }) {
  return (
    <div className="inline-flex border border-[#e7dec8] bg-[#fcfbf7] p-1">
      {[
        { id: "mobile", label: "Mobile" },
        { id: "desktop", label: "Desktop" },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.id
              ? "bg-[#FFC600] text-black"
              : "text-[#6f6a60] hover:bg-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StorefrontPreview({
  title,
  slides,
  sidePanels,
  variant = "draft",
  device = "desktop",
}) {
  const renderableSlides = useMemo(() => getRenderableSlides(slides), [slides]);
  const renderablePanels = useMemo(
    () => getRenderablePanels(sidePanels),
    [sidePanels],
  );
  const primarySlide = renderableSlides[0] || null;
  const secondarySlides = renderableSlides.slice(1);

  return (
    <div className="border border-[#e7dec8] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#efe7d7] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[#000000]">{title}</div>
          <div className="mt-1 text-xs text-[#8d7a5c]">
            {renderableSlides.length}/3 slides actifs,{" "}
            {Number(Boolean(renderablePanels.left)) + Number(Boolean(renderablePanels.right))}/2
            {" "}panneaux actifs
          </div>
        </div>
        <span
          className={`inline-flex items-center border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${
            variant === "draft"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-[#bad6a7] bg-[#eef7e8] text-[#587f34]"
          }`}
        >
          {variant === "draft" ? "Brouillon" : "Publié"}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div
          className={`overflow-hidden border border-[#e7dec8] bg-[#fcfbf7] ${
            device === "mobile" ? "mx-auto max-w-[380px]" : ""
          }`}
        >
          <div className={device === "mobile" ? "min-h-[220px]" : "min-h-[280px]"}>
            <MiniSlidePreview slide={primarySlide} isPrimary />
          </div>
          {secondarySlides.length ? (
            <div className="grid gap-px border-t border-[#e7dec8] bg-[#e7dec8] sm:grid-cols-2">
              {secondarySlides.map((slide) => (
                <MiniSlidePreview key={slide.id} slide={slide} />
              ))}
            </div>
          ) : null}
          <div className="flex gap-2 border-t border-[#efe7d7] bg-white px-4 py-3">
            {(renderableSlides.length ? renderableSlides : [{ id: "placeholder" }]).map(
              (slide, index) => (
                <span
                  key={slide.id || index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index === 0 ? "bg-[#FFC600]" : "bg-[#d8cfbd]"
                  }`}
                />
              ),
            )}
          </div>
        </div>

        <div
          className={
            device === "mobile"
              ? "mx-auto max-w-[380px] border border-dashed border-[#e7dec8] bg-[#fcfbf7] px-5 py-6"
              : "grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]"
          }
        >
          {device === "desktop" ? (
            <MiniPanelPreview panel={renderablePanels.left} label="Panneau gauche" />
          ) : null}
          <div className="border border-dashed border-[#e7dec8] bg-[#fcfbf7] px-5 py-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7a5c]">
                Zone catalogue
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8d7a5c]">
                {device}
              </span>
            </div>
            <div
              className={`mt-3 grid gap-3 ${
                device === "mobile" ? "grid-cols-1" : "sm:grid-cols-2"
              }`}
            >
              {Array.from({ length: device === "mobile" ? 2 : 4 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-[#e7dec8] bg-white p-3 shadow-sm"
                >
                  <div className="aspect-square bg-[#f6f2e8]" />
                  <div className="mt-3 h-3 w-3/4 bg-[#efe7d7]" />
                  <div className="mt-2 h-2.5 w-1/2 bg-[#f3ecdd]" />
                  <div className="mt-3 h-8 bg-[#fff7df]" />
                </div>
              ))}
            </div>
          </div>
          {device === "desktop" ? (
            <MiniPanelPreview panel={renderablePanels.right} label="Panneau droit" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SlideEditor({ slide, onChange, disabled = false, onUploadError }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await marketingCampaignsService.uploadAsset({
        file,
        slot: slide.id,
      });
      onChange({ ...slide, image: uploaded?.url || "" });
    } catch (error) {
      onUploadError?.(
        error?.response?.data?.message || "Impossible d’uploader ce visuel.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="border border-[#e7dec8] bg-[#fcfbf7] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#000000]">{slide.title}</div>
          <div className="text-xs text-[#8d7a5c]">{slide.id}</div>
        </div>
        <StatusBadge active={slide.active} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="overflow-hidden border border-[#e7dec8] bg-white">
          {slide.image ? (
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-[#8d7a5c]">
              Aperçu image
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre interne">
            <TextInput
              value={slide.title}
              onChange={(e) => onChange({ ...slide, title: e.target.value })}
              disabled={disabled}
            />
          </Field>

          <Field label="Image" hint="Ex: /Slide1.png">
            <div className="space-y-2">
              <TextInput
                value={slide.image}
                onChange={(e) => onChange({ ...slide, image: e.target.value })}
                disabled={disabled}
              />
              <label className={`inline-flex border border-[#e7dec8] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C] ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#fff7df]"
              }`}>
                {uploading ? "Import en cours..." : "Uploader une image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading || disabled}
                />
              </label>
            </div>
          </Field>

          <Field label="Lien cible" hint="Optionnel">
            <TextInput
              value={slide.link}
              onChange={(e) => onChange({ ...slide, link: e.target.value })}
              placeholder="https://..."
              disabled={disabled}
            />
          </Field>

          <label className={`flex items-center gap-3 border border-[#e7dec8] bg-white px-4 py-3 ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          }`}>
            <input
              type="checkbox"
              checked={slide.active}
              onChange={(e) => onChange({ ...slide, active: e.target.checked })}
              disabled={disabled}
            />
            <div>
              <div className="text-sm font-medium text-[#000000]">Slide actif</div>
              <div className="text-xs text-[#8d7a5c]">
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
                disabled={disabled}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidePanelEditor({ title, value, onChange, disabled = false, uploadSlot, onUploadError }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await marketingCampaignsService.uploadAsset({
        file,
        slot: uploadSlot,
      });
      onChange({ ...value, image: uploaded?.url || "" });
    } catch (error) {
      onUploadError?.(
        error?.response?.data?.message || "Impossible d’uploader ce visuel.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="border border-[#e7dec8] bg-[#fcfbf7] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#000000]">{title}</div>
        <StatusBadge active={value.active} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre interne">
          <TextInput
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            disabled={disabled}
          />
        </Field>

        <Field label="Image / visuel" hint="Ex: /campaign-left.png">
          <div className="space-y-2">
            <TextInput
              value={value.image}
              onChange={(e) => onChange({ ...value, image: e.target.value })}
              disabled={disabled}
            />
            <label className={`inline-flex border border-[#e7dec8] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C] ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#fff7df]"
            }`}>
              {uploading ? "Import en cours..." : "Uploader une image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading || disabled}
              />
            </label>
          </div>
        </Field>

        <Field label="Lien cible" hint="Optionnel">
          <TextInput
            value={value.link}
            onChange={(e) => onChange({ ...value, link: e.target.value })}
            placeholder="https://..."
            disabled={disabled}
          />
        </Field>

        <label className={`flex items-center gap-3 border border-[#e7dec8] bg-white px-4 py-3 ${
          disabled ? "cursor-not-allowed opacity-70" : ""
        }`}>
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => onChange({ ...value, active: e.target.checked })}
            disabled={disabled}
          />
          <div>
            <div className="text-sm font-medium text-[#000000]">Panneau actif</div>
            <div className="text-xs text-[#8d7a5c]">
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
              disabled={disabled}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function SmsCampaignWorkspace({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onCreateCampaign,
  onUpdateCampaign,
  onSave,
  onSendTest,
  onSendCampaign,
  onResendFailed,
  onDeleteCampaign,
  canWrite,
  saving,
  sending,
}) {
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0] || null;
  const [importText, setImportText] = useState("");
  const stats = getSmsStats(selectedCampaign || {});
  const preview = renderSmsPreview(selectedCampaign || {});
  const smsParts = Math.max(1, Math.ceil(preview.length / 160));

  function patchCampaign(patch) {
    if (!selectedCampaign) return;
    onUpdateCampaign({
      ...selectedCampaign,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  function handleImportRecipients() {
    const parsed = parseRecipients(importText);
    patchCampaign({ recipients: parsed });
  }

  function handleAppendRecipients() {
    const parsed = parseRecipients(importText);
    const existing = Array.isArray(selectedCampaign.recipients)
      ? selectedCampaign.recipients
      : [];
    const seen = new Set(
      existing
        .map((recipient) => String(recipient.phoneNormalized || "").replace(/\D/g, ""))
        .filter(Boolean),
    );
    const nextRecipients = [
      ...existing,
      ...parsed.map((recipient) => {
        const key = String(recipient.phoneNormalized || "").replace(/\D/g, "");
        const duplicate = key && seen.has(key);
        if (key) seen.add(key);
        return duplicate
          ? { ...recipient, status: "SKIPPED", lastError: "Doublon detecte" }
          : recipient;
      }),
    ];
    patchCampaign({ recipients: nextRecipients });
  }

  if (!selectedCampaign) {
    return (
      <Card
        title="Campagne SMS"
        description="Créez une campagne d'invitation SMS, importez vos destinataires, préparez le message et lancez l'envoi."
      >
        <button
          type="button"
          onClick={onCreateCampaign}
          disabled={!canWrite}
          className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
        >
          Nouvelle campagne SMS
        </button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card
        title="Campagnes SMS"
        description="Brouillons et suivis des invitations envoyées."
        actions={
          <button
            type="button"
            onClick={onCreateCampaign}
            disabled={!canWrite}
            className="bg-[#FFC600] px-3 py-2 text-xs font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
          >
            Nouvelle
          </button>
        }
      >
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const campaignStats = getSmsStats(campaign);
            const active = campaign.id === selectedCampaign.id;
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => onSelectCampaign(campaign.id)}
                className={`block w-full border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-[#FFC600] bg-[#fff7df]"
                    : "border-[#e7dec8] bg-white hover:bg-[#fcfbf7]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[#000000]">{campaign.name}</div>
                  <span className="text-[11px] font-medium text-[#8d7a5c]">
                    {campaign.status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[#6f6a60]">
                  {campaignStats.valid} valides sur {campaignStats.total} contacts
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-6">
        <Card
          title="Préparation SMS"
          description="Configurez l'événement, le message et la liste de destinataires avant envoi."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={!canWrite || saving}
                className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => onSendTest(selectedCampaign)}
                disabled={!canWrite || sending || !selectedCampaign.testPhone}
                className="border border-[#000000] bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#f8f5ea] disabled:opacity-50"
              >
                Test SMS
              </button>
              <button
                type="button"
                onClick={() => onSendCampaign(selectedCampaign)}
                disabled={!canWrite || sending || stats.valid <= 0}
                className="bg-black px-4 py-2 text-sm font-medium text-white hover:bg-[#333333] disabled:opacity-50"
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
              <button
                type="button"
                onClick={() => onResendFailed(selectedCampaign)}
                disabled={!canWrite || sending || stats.failed <= 0}
                className="border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Renvoyer échecs
              </button>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nom de la campagne">
              <TextInput
                value={selectedCampaign.name || ""}
                onChange={(e) => patchCampaign({ name: e.target.value })}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Nom de l'événement">
              <TextInput
                value={selectedCampaign.eventName || ""}
                onChange={(e) => patchCampaign({ eventName: e.target.value })}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Date / heure">
              <TextInput
                value={selectedCampaign.eventDate || ""}
                onChange={(e) => patchCampaign({ eventDate: e.target.value })}
                placeholder="Ex: Samedi 18 mai à 09h00"
                disabled={!canWrite}
              />
            </Field>
            <Field label="Lieu">
              <TextInput
                value={selectedCampaign.location || ""}
                onChange={(e) => patchCampaign({ location: e.target.value })}
                disabled={!canWrite}
              />
            </Field>
            <Field label="Lien de confirmation / info" hint="Optionnel pour cette première version.">
              <TextInput
                value={selectedCampaign.confirmationLink || ""}
                onChange={(e) => patchCampaign({ confirmationLink: e.target.value })}
                placeholder="https://..."
                disabled={!canWrite}
              />
            </Field>
            <Field label="Téléphone de test">
              <TextInput
                value={selectedCampaign.testPhone || ""}
                onChange={(e) => patchCampaign({ testPhone: e.target.value })}
                placeholder="Ex: 0700000000"
                disabled={!canWrite}
              />
            </Field>
            <div className="lg:col-span-2">
              <Field
                label="Message SMS"
                hint="Variables disponibles: {{nom}}, {{numeroFbo}}, {{eventName}}, {{eventDate}}, {{location}}, {{link}}."
              >
                <TextArea
                  rows={4}
                  value={selectedCampaign.message || ""}
                  onChange={(e) => patchCampaign({ message: e.target.value })}
                  disabled={!canWrite}
                />
              </Field>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Destinataires" description="Collez une liste: nom, téléphone, ville, grade. Une ligne par personne.">
            <TextArea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Aka Jean, 0700000000, Abidjan, Manager\nKouassi Awa, 0500000000, Bouake"}
              disabled={!canWrite}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImportRecipients}
                disabled={!canWrite || !importText.trim()}
                className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
              >
                Importer la liste
              </button>
              <button
                type="button"
                onClick={handleAppendRecipients}
                disabled={!canWrite || !importText.trim()}
                className="border border-[#000000] bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#f8f5ea] disabled:opacity-50"
              >
                Ajouter à la liste
              </button>
              <button
                type="button"
                onClick={() => patchCampaign({ recipients: [] })}
                disabled={!canWrite || !selectedCampaign.recipients?.length}
                className="border border-[#e7dec8] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C] hover:bg-[#fcfbf7] disabled:opacity-50"
              >
                Vider
              </button>
              <button
                type="button"
                onClick={() => exportCampaignRecipients(selectedCampaign)}
                disabled={!selectedCampaign.recipients?.length}
                className="border border-[#e7dec8] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C] hover:bg-[#fcfbf7] disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </Card>

          <Card title="Aperçu et contrôle" description="Contrôle avant envoi réel.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Contacts", stats.total],
                ["Valides", stats.valid],
                ["Envoyés", stats.sent],
                ["Échecs", stats.failed],
                ["Invalides", stats.invalid],
                ["Ignorés", stats.skipped],
                ["Confirmés", stats.confirmed],
                ["Indisponibles", stats.declined],
              ].map(([label, value]) => (
                <div key={label} className="border border-[#e7dec8] bg-[#fcfbf7] p-3">
                  <div className="text-xs text-[#8d7a5c]">{label}</div>
                  <div className="mt-1 text-2xl font-semibold text-[#000000]">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 border border-[#e7dec8] bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d7a5c]">
                Aperçu message
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#000000]">{preview}</p>
              <div className="mt-3 text-xs text-[#8d7a5c]">
                {preview.length} caractères, environ {smsParts} SMS par destinataire.
              </div>
            </div>
          </Card>
        </div>

        <Card title="Suivi destinataires" description="Statut individuel après import et envoi.">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[#6f6a60]">
              Dernier test: {selectedCampaign.lastTestAt ? new Date(selectedCampaign.lastTestAt).toLocaleString() : "jamais"}
              {" · "}
              Dernier envoi: {selectedCampaign.lastSentAt ? new Date(selectedCampaign.lastSentAt).toLocaleString() : "jamais"}
            </div>
            <button
              type="button"
              onClick={() => onDeleteCampaign(selectedCampaign)}
              disabled={!canWrite}
              className="border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Supprimer la campagne
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto border border-[#e7dec8]">
            <table className="min-w-full divide-y divide-[#efe7d7] text-sm">
              <thead className="sticky top-0 bg-[#fcfbf7]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-[#5D4B3C]">Nom</th>
                  <th className="px-3 py-2 text-left font-semibold text-[#5D4B3C]">Téléphone</th>
                  <th className="px-3 py-2 text-left font-semibold text-[#5D4B3C]">Ville</th>
                  <th className="px-3 py-2 text-left font-semibold text-[#5D4B3C]">Statut</th>
                  <th className="px-3 py-2 text-left font-semibold text-[#5D4B3C]">Erreur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efe7d7] bg-white">
                {(selectedCampaign.recipients || []).map((recipient) => (
                  <tr key={recipient.id}>
                    <td className="px-3 py-2 text-[#000000]">{recipient.nom || "-"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[#000000]">
                      {recipient.phoneNormalized || recipient.phoneRaw || "-"}
                    </td>
                    <td className="px-3 py-2 text-[#6f6a60]">{recipient.ville || "-"}</td>
                    <td className="px-3 py-2 text-[#6f6a60]">{recipient.status || "PENDING"}</td>
                    <td className="px-3 py-2 text-xs text-red-700">{recipient.lastError || ""}</td>
                  </tr>
                ))}
                {!selectedCampaign.recipients?.length ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-[#8d7a5c]" colSpan={5}>
                      Aucun destinataire importé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function MarketingCampaignsPage() {
  const canWrite = usePermission(Permission.MARKETING_WRITE);
  const [activeTab, setActiveTab] = useState("visuals");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedSmsCampaignId, setSelectedSmsCampaignId] = useState("");
  const [publishedSnapshot, setPublishedSnapshot] = useState({
    slides: DEFAULT_SETTINGS.slides,
    sidePanels: DEFAULT_SETTINGS.sidePanels,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await marketingCampaignsService.get();
        setSettings({
          slides: Array.isArray(data?.slides) ? data.slides : DEFAULT_SETTINGS.slides,
          sidePanels: data?.sidePanels || DEFAULT_SETTINGS.sidePanels,
          publishing: data?.publishing || DEFAULT_SETTINGS.publishing,
          smsCampaigns: Array.isArray(data?.smsCampaigns) ? data.smsCampaigns : [],
        });
        if (Array.isArray(data?.smsCampaigns) && data.smsCampaigns[0]?.id) {
          setSelectedSmsCampaignId(data.smsCampaigns[0].id);
        }
        setPublishedSnapshot({
          slides: Array.isArray(data?.publishedSlides)
            ? data.publishedSlides
            : DEFAULT_SETTINGS.slides,
          sidePanels: data?.publishedSidePanels || DEFAULT_SETTINGS.sidePanels,
        });
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger les campagnes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setInfo("");
      const response = await marketingCampaignsService.save(settings);
      setSettings((prev) => ({
        ...prev,
        publishing: response?.publishing || prev.publishing,
        smsCampaigns: Array.isArray(response?.smsCampaigns)
          ? response.smsCampaigns
          : prev.smsCampaigns,
      }));
      if (response?.publishedSlides || response?.publishedSidePanels) {
        setPublishedSnapshot({
          slides: Array.isArray(response?.publishedSlides)
            ? response.publishedSlides
            : publishedSnapshot.slides,
          sidePanels: response?.publishedSidePanels || publishedSnapshot.sidePanels,
        });
      }
      setInfo("Brouillon enregistré.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’enregistrer les campagnes.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    try {
      setPublishingNow(true);
      setError("");
      setInfo("");
      const response = await marketingCampaignsService.publish(settings);
      setSettings((prev) => ({
        ...prev,
        publishing: response?.publishing || prev.publishing,
        smsCampaigns: Array.isArray(response?.smsCampaigns)
          ? response.smsCampaigns
          : prev.smsCampaigns,
      }));
      setPublishedSnapshot({
        slides: Array.isArray(response?.publishedSlides)
          ? response.publishedSlides
          : settings.slides,
        sidePanels: response?.publishedSidePanels || settings.sidePanels,
      });
      setInfo("Campagnes publiées sur le storefront.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de publier les campagnes.");
    } finally {
      setPublishingNow(false);
    }
  }

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

  const publishedActiveSlides = useMemo(
    () => (publishedSnapshot.slides || []).filter((slide) => slide.active).length,
    [publishedSnapshot.slides],
  );

  const publishedActivePanels = useMemo(
    () =>
      Number(Boolean(publishedSnapshot.sidePanels?.left?.active)) +
      Number(Boolean(publishedSnapshot.sidePanels?.right?.active)),
    [publishedSnapshot.sidePanels],
  );

  function handleCreateSmsCampaign() {
    const nextCampaign = createSmsCampaign();
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: [nextCampaign, ...(prev.smsCampaigns || [])],
    }));
    setSelectedSmsCampaignId(nextCampaign.id);
    setActiveTab("sms");
  }

  function handleUpdateSmsCampaign(nextCampaign) {
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: (prev.smsCampaigns || []).map((campaign) =>
        campaign.id === nextCampaign.id ? nextCampaign : campaign,
      ),
    }));
  }

  function handleDeleteSmsCampaign(campaign) {
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Supprimer la campagne "${campaign.name}" ?`);
    if (!confirmed) return;

    const nextCampaigns = (settings.smsCampaigns || []).filter((item) => item.id !== campaign.id);
    setSettings((prev) => ({ ...prev, smsCampaigns: nextCampaigns }));
    setSelectedSmsCampaignId(nextCampaigns[0]?.id || "");
    setInfo("Campagne supprimée du brouillon. Cliquez sur Enregistrer pour confirmer.");
  }

  async function handleSendSmsTest(campaign) {
    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      const saved = await marketingCampaignsService.save(settings);
      if (Array.isArray(saved?.smsCampaigns)) {
        setSettings((prev) => ({ ...prev, smsCampaigns: saved.smsCampaigns }));
      }
      const response = await marketingCampaignsService.sendSmsTest(campaign.id, {
        phone: campaign.testPhone,
      });
      if (response?.campaign) handleUpdateSmsCampaign(response.campaign);
      setInfo(response?.ok ? "SMS de test envoyé." : "Test SMS traité avec erreur provider.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'envoyer le SMS de test.");
    } finally {
      setSendingSms(false);
    }
  }

  async function handleSendSmsCampaign(campaign) {
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(
        `Envoyer cette campagne SMS a ${getSmsStats(campaign).valid} destinataires valides ?`,
      );
    if (!confirmed) return;

    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      const saved = await marketingCampaignsService.save(settings);
      if (Array.isArray(saved?.smsCampaigns)) {
        setSettings((prev) => ({ ...prev, smsCampaigns: saved.smsCampaigns }));
      }
      const response = await marketingCampaignsService.sendSmsCampaign(campaign.id);
      if (response?.campaign) handleUpdateSmsCampaign(response.campaign);
      setInfo(
        `Envoi termine: ${response?.sentCount || 0} envoyes, ${response?.failedCount || 0} echecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'envoyer la campagne SMS.");
    } finally {
      setSendingSms(false);
    }
  }

  async function handleResendFailedSms(campaign) {
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Renvoyer uniquement aux ${getSmsStats(campaign).failed} destinataires en echec ?`);
    if (!confirmed) return;

    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      const saved = await marketingCampaignsService.save(settings);
      if (Array.isArray(saved?.smsCampaigns)) {
        setSettings((prev) => ({ ...prev, smsCampaigns: saved.smsCampaigns }));
      }
      const response = await marketingCampaignsService.sendSmsCampaign(campaign.id, {
        failedOnly: true,
      });
      if (response?.campaign) handleUpdateSmsCampaign(response.campaign);
      setInfo(
        `Renvoi termine: ${response?.sentCount || 0} envoyes, ${response?.failedCount || 0} echecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de renvoyer les SMS en échec.");
    } finally {
      setSendingSms(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        title="Campagnes marketing"
        description="Gère ici les visuels promotionnels du frontend utilisateur: slider catalogue, panneaux latéraux desktop et préparation de publication."
        actions={
          <div className="flex items-center gap-3">
            {info ? (
              <span className="border border-[#bad6a7] bg-[#eef7e8] px-3 py-1 text-xs font-medium text-[#587f34]">
                {info}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !canWrite}
              className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer le brouillon"}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishingNow || loading || !canWrite}
              className="border border-[#000000] bg-white px-4 py-2 text-sm font-medium text-black hover:bg-[#f8f5ea] disabled:opacity-50"
            >
              {publishingNow ? "Publication..." : "Publier"}
            </button>
          </div>
        }
      >
        {error ? (
          <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {!canWrite ? (
          <div className="mb-4 border border-[#e7dec8] bg-[#fcfbf7] px-4 py-3 text-sm text-[#6f6a60]">
            Accès en lecture seule. Vous pouvez consulter les campagnes, mais pas les modifier.
          </div>
        ) : null}
        <div className="mb-4 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Les visuels uploadés modifient le <span className="font-semibold">brouillon courant</span>.
          Le storefront public continue d’afficher la <span className="font-semibold">version publiée</span>
          jusqu’au clic sur <span className="font-semibold">Publier</span>.
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-[#e7dec8] bg-[#fcfbf7] p-5">
            <div className="text-sm text-[#8d7a5c]">Slides actifs</div>
            <div className="mt-2 text-3xl font-semibold text-[#000000]">{activeSlides}/3</div>
          </div>
          <div className="border border-[#e7dec8] bg-[#fcfbf7] p-5">
            <div className="text-sm text-[#8d7a5c]">Panneaux actifs</div>
            <div className="mt-2 text-3xl font-semibold text-[#000000]">{activePanels}/2</div>
          </div>
          <div className="border border-[#e7dec8] bg-[#fcfbf7] p-5">
            <div className="text-sm text-[#8d7a5c]">Environnement</div>
            <div className="mt-2 text-3xl font-semibold text-[#000000]">
              {settings.publishing.environment}
            </div>
          </div>
          <div className="border border-[#e7dec8] bg-white p-5 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-[#5D4B3C]">État de publication</span>
              <span
                className={`inline-flex items-center border px-2.5 py-1 text-xs font-medium ${
                  settings.publishing.hasUnpublishedChanges
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-[#bad6a7] bg-[#eef7e8] text-[#587f34]"
                }`}
              >
                {settings.publishing.hasUnpublishedChanges
                  ? "Brouillon non publié"
                  : "Storefront synchronisé"}
              </span>
              {settings.publishing.publishedAt ? (
                <span className="text-[#6f6a60]">
                  Publié le {new Date(settings.publishing.publishedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-[#8d7a5c]">Aucune publication effectuée</span>
              )}
              {settings.publishing.publishedBy ? (
                <span className="text-[#6f6a60]">par {settings.publishing.publishedBy}</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 border border-[#e7dec8] bg-white p-2">
        {[
          { id: "visuals", label: "Visuels storefront" },
          { id: "sms", label: "Campagne SMS" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#FFC600] text-black"
                : "text-[#6f6a60] hover:bg-[#fcfbf7]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sms" ? (
        <SmsCampaignWorkspace
          campaigns={settings.smsCampaigns || []}
          selectedCampaignId={selectedSmsCampaignId}
          onSelectCampaign={setSelectedSmsCampaignId}
          onCreateCampaign={handleCreateSmsCampaign}
          onUpdateCampaign={handleUpdateSmsCampaign}
          onSave={handleSave}
          onSendTest={handleSendSmsTest}
          onSendCampaign={handleSendSmsCampaign}
          onResendFailed={handleResendFailedSms}
          onDeleteCampaign={handleDeleteSmsCampaign}
          canWrite={canWrite}
          saving={saving}
          sending={sendingSms}
        />
      ) : (
        <>
      <Card
        title="Slides frontend"
        description="Prépare les 3 visuels principaux affichés dans le catalogue utilisateur."
      >
        <div className="space-y-4">
          {settings.slides.map((slide, index) => (
            <SlideEditor
              key={slide.id}
              slide={slide}
              disabled={!canWrite}
              onUploadError={setError}
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
            disabled={!canWrite}
            uploadSlot="side-panel-left"
            onUploadError={setError}
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
            disabled={!canWrite}
            uploadSlot="side-panel-right"
            onUploadError={setError}
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
        description="Le storefront public lit uniquement la version publiée. Les modifications ci-dessus restent en brouillon jusqu’à publication."
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
              disabled={!canWrite}
            />
          </Field>

          <Field label="Environnement">
            <select
              className="w-full border border-[#e7dec8] px-3 py-2.5 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20"
              value={settings.publishing.environment}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  publishing: { ...prev.publishing, environment: e.target.value },
                }))
              }
              disabled={!canWrite}
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
              disabled={!canWrite}
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
              disabled={!canWrite}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Résumé Draft / Publié"
        description="Contrôle rapide avant diffusion: le brouillon correspond à l’éditeur courant, publié correspond à ce que voit actuellement le storefront."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-[#e7dec8] bg-[#fcfbf7] p-5">
            <div className="text-sm font-semibold text-[#000000]">Brouillon courant</div>
            <div className="mt-3 space-y-2 text-sm text-[#6f6a60]">
              <div>{activeSlides}/3 slides actifs</div>
              <div>{activePanels}/2 panneaux actifs</div>
              <div>Environnement cible: {settings.publishing.environment}</div>
            </div>
          </div>
          <div className="border border-[#e7dec8] bg-white p-5">
            <div className="text-sm font-semibold text-[#000000]">Version publiée</div>
            <div className="mt-3 space-y-2 text-sm text-[#6f6a60]">
              <div>{publishedActiveSlides}/3 slides actifs</div>
              <div>{publishedActivePanels}/2 panneaux actifs</div>
              <div>
                Dernière publication:{" "}
                {settings.publishing.publishedAt
                  ? new Date(settings.publishing.publishedAt).toLocaleString()
                  : "jamais"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Preview storefront"
        description="Lecture visuelle du rendu catalogue avant publication. Le brouillon correspond à l’éditeur courant, la version publiée correspond à ce qui est actuellement visible côté utilisateur."
        actions={
          <DeviceToggle value={previewDevice} onChange={setPreviewDevice} />
        }
      >
        <div className="grid gap-6 2xl:grid-cols-2">
          <StorefrontPreview
            title="Brouillon courant"
            slides={settings.slides}
            sidePanels={settings.sidePanels}
            variant="draft"
            device={previewDevice}
          />
          <StorefrontPreview
            title="Version publiée"
            slides={publishedSnapshot.slides}
            sidePanels={publishedSnapshot.sidePanels}
            variant="published"
            device={previewDevice}
          />
        </div>
      </Card>
        </>
      )}
    </div>
  );
}
