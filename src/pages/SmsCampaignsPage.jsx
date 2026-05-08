import { useEffect, useMemo, useState } from "react";
import { marketingCampaignsService } from "../services/marketingCampaignsService";
import { Permission } from "../auth/permissions";
import { usePermission } from "../hooks/usePermission";
import {
  DEFAULT_SETTINGS,
  SmsCampaignWorkspace,
  createSmsCampaign,
} from "./MarketingCampaignsPage";

function getCampaignStats(campaigns = []) {
  return campaigns.reduce(
    (acc, campaign) => {
      acc.campaigns += 1;
      for (const recipient of campaign.recipients || []) {
        acc.contacts += 1;
        const status = String(recipient.status || "").toUpperCase();
        if (recipient.phoneNormalized && status !== "SKIPPED") acc.valid += 1;
        if (status === "SENT") acc.sent += 1;
        if (status === "FAILED") acc.failed += 1;
        if (status === "CONFIRMED") acc.confirmed += 1;
      }
      return acc;
    },
    { campaigns: 0, contacts: 0, valid: 0, sent: 0, failed: 0, confirmed: 0 },
  );
}

function Metric({ label, value }) {
  return (
    <div className="border border-[#e7dec8] bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d7a5c]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
    </div>
  );
}

export default function SmsCampaignsPage() {
  const canWrite = usePermission(Permission.MARKETING_WRITE);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedSmsCampaignId, setSelectedSmsCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const smsCampaigns = settings.smsCampaigns || [];
  const stats = useMemo(() => getCampaignStats(smsCampaigns), [smsCampaigns]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await marketingCampaignsService.get();
        const nextSettings = {
          slides: Array.isArray(data?.slides) ? data.slides : DEFAULT_SETTINGS.slides,
          sidePanels: data?.sidePanels || DEFAULT_SETTINGS.sidePanels,
          publishing: data?.publishing || DEFAULT_SETTINGS.publishing,
          smsCampaigns: Array.isArray(data?.smsCampaigns) ? data.smsCampaigns : [],
        };
        setSettings(nextSettings);
        setSelectedSmsCampaignId(nextSettings.smsCampaigns[0]?.id || "");
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger les campagnes SMS.");
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
      setInfo("Campagnes SMS enregistrées.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'enregistrer les campagnes SMS.");
    } finally {
      setSaving(false);
    }
  }

  function handleCreateSmsCampaign() {
    const nextCampaign = createSmsCampaign();
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: [nextCampaign, ...(prev.smsCampaigns || [])],
    }));
    setSelectedSmsCampaignId(nextCampaign.id);
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

    const nextCampaigns = smsCampaigns.filter((item) => item.id !== campaign.id);
    setSettings((prev) => ({ ...prev, smsCampaigns: nextCampaigns }));
    setSelectedSmsCampaignId(nextCampaigns[0]?.id || "");
    setInfo("Campagne supprimée du brouillon. Cliquez sur Enregistrer pour confirmer.");
  }

  async function saveBeforeSend() {
    const saved = await marketingCampaignsService.save(settings);
    if (Array.isArray(saved?.smsCampaigns)) {
      setSettings((prev) => ({ ...prev, smsCampaigns: saved.smsCampaigns }));
    }
  }

  async function handleSendSmsTest(campaign) {
    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      await saveBeforeSend();
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
    const validCount = (campaign.recipients || []).filter(
      (recipient) => recipient.phoneNormalized && recipient.status !== "SKIPPED",
    ).length;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Envoyer cette campagne SMS à ${validCount} destinataires valides ?`);
    if (!confirmed) return;

    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      await saveBeforeSend();
      const response = await marketingCampaignsService.sendSmsCampaign(campaign.id);
      if (response?.campaign) handleUpdateSmsCampaign(response.campaign);
      setInfo(
        response?.sending
          ? `Envoi lancé pour ${response.total || validCount} destinataires.`
          : `Envoi terminé: ${response?.sentCount || 0} envoyés, ${response?.failedCount || 0} échecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'envoyer la campagne SMS.");
    } finally {
      setSendingSms(false);
    }
  }

  async function handleResendFailedSms(campaign) {
    const failedCount = (campaign.recipients || []).filter(
      (recipient) => String(recipient.status || "").toUpperCase() === "FAILED",
    ).length;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Renvoyer uniquement aux ${failedCount} destinataires en échec ?`);
    if (!confirmed) return;

    try {
      setSendingSms(true);
      setError("");
      setInfo("");
      await saveBeforeSend();
      const response = await marketingCampaignsService.sendSmsCampaign(campaign.id, {
        failedOnly: true,
      });
      if (response?.campaign) handleUpdateSmsCampaign(response.campaign);
      setInfo(
        response?.sending
          ? `Renvoi lancé pour ${response.total || failedCount} destinataires.`
          : `Renvoi terminé: ${response?.sentCount || 0} envoyés, ${response?.failedCount || 0} échecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de renvoyer les SMS en échec.");
    } finally {
      setSendingSms(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="border border-[#e7dec8] bg-[#fcfbf7] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7a5c]">
              Communication
            </p>
            <h1 className="mt-2 text-2xl font-bold text-black">Campagnes SMS</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#6f6a60]">
              Préparez les invitations, contrôlez les destinataires, lancez les envois
              et suivez les résultats par contact.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateSmsCampaign}
            disabled={!canWrite}
            className="bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6b200] disabled:opacity-50"
          >
            Nouvelle campagne SMS
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Campagnes" value={stats.campaigns} />
          <Metric label="Contacts" value={stats.contacts} />
          <Metric label="Valides" value={stats.valid} />
          <Metric label="Envoyés" value={stats.sent} />
          <Metric label="Échecs" value={stats.failed} />
          <Metric label="Confirmés" value={stats.confirmed} />
        </div>
      </section>

      {info ? (
        <div className="border border-[#bad6a7] bg-[#eef7e8] px-4 py-3 text-sm text-[#587f34]">
          {info}
        </div>
      ) : null}
      {error ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {!canWrite ? (
        <div className="border border-[#e7dec8] bg-white px-4 py-3 text-sm text-[#6f6a60]">
          Accès en lecture seule. Vous pouvez consulter les campagnes SMS, mais pas les modifier.
        </div>
      ) : null}

      {loading ? (
        <div className="border border-[#e7dec8] bg-white p-6 text-sm text-[#6f6a60]">
          Chargement des campagnes SMS...
        </div>
      ) : (
        <SmsCampaignWorkspace
          campaigns={smsCampaigns}
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
      )}
    </div>
  );
}
