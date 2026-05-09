import { useEffect, useMemo, useState, useCallback } from "react";
import { marketingCampaignsService } from "../services/marketingCampaignsService";
import { Permission } from "../auth/permissions";
import { usePermission } from "../hooks/usePermission";
import {
  DEFAULT_SETTINGS,
  SmsCampaignWorkspace,
  createSmsCampaign,
} from "./MarketingCampaignsPage";

// Imports des icônes Lucide React
import {
  MessageCircle,
  Target,
  Users,
  CheckCircle,
  Send,
  AlertCircle,
  ThumbsUp,
  Clock,
  Plus,
  Grid3X3,
  List,
  Search,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

// Alias des icônes pour la compatibilité
const MessageIcon = MessageCircle;
const CampaignIcon = Target;
const UsersIcon = Users;
const CheckCircleIcon = CheckCircle;
const SendIcon = Send;
const AlertCircleIcon = AlertCircle;
const ThumbsUpIcon = ThumbsUp;
const ClockIcon = Clock;
const PlusIcon = Plus;
const GridIcon = Grid3X3;
const ListIcon = List;
const SearchIcon = Search;
const AlertTriangleIcon = AlertTriangle;
const InfoIcon = Info;
const XIcon = X;

// Types et constantes
const STATUS_DEFINITIONS = {
  SENT: { label: "Envoyé", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Échec", color: "bg-red-100 text-red-800" },
  CONFIRMED: { label: "Confirmé", color: "bg-blue-100 text-blue-800" },
  SKIPPED: { label: "Ignoré", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
};

function getCampaignStats(campaign = {}) {
  const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
  return recipients.reduce(
    (acc, recipient) => {
      acc.total += 1;
      const status = String(recipient.status || "").toUpperCase();
      if (recipient.phoneNormalized && status !== "SKIPPED") acc.valid += 1;
      if (status === "SENT") acc.sent += 1;
      if (status === "FAILED") acc.failed += 1;
      if (status === "CONFIRMED") acc.confirmed += 1;
      return acc;
    },
    { total: 0, valid: 0, sent: 0, failed: 0, confirmed: 0 },
  );
}

// Hooks personnalisés
function useCampaignStats(campaigns = []) {
  return useMemo(() => {
    const stats = campaigns.reduce(
      (acc, campaign) => {
        acc.campaigns += 1;
        const recipients = campaign.recipients || [];
        
        const statusCounts = recipients.reduce((statusAcc, recipient) => {
          const status = String(recipient.status || "PENDING").toUpperCase();
          const isValid = recipient.phoneNormalized && status !== "SKIPPED";
          
          return {
            ...statusAcc,
            contacts: statusAcc.contacts + 1,
            valid: statusAcc.valid + (isValid ? 1 : 0),
            sent: statusAcc.sent + (status === "SENT" ? 1 : 0),
            failed: statusAcc.failed + (status === "FAILED" ? 1 : 0),
            confirmed: statusAcc.confirmed + (status === "CONFIRMED" ? 1 : 0),
            pending: statusAcc.pending + (status === "PENDING" ? 1 : 0),
          };
        }, { contacts: 0, valid: 0, sent: 0, failed: 0, confirmed: 0, pending: 0 });
        
        return {
          campaigns: acc.campaigns + 1,
          contacts: acc.contacts + statusCounts.contacts,
          valid: acc.valid + statusCounts.valid,
          sent: acc.sent + statusCounts.sent,
          failed: acc.failed + statusCounts.failed,
          confirmed: acc.confirmed + statusCounts.confirmed,
          pending: acc.pending + statusCounts.pending,
        };
      },
      { campaigns: 0, contacts: 0, valid: 0, sent: 0, failed: 0, confirmed: 0, pending: 0 }
    );
    
    // Calculs additionnels pour les métriques avancées
    return {
      ...stats,
      deliveryRate: stats.valid > 0 ? ((stats.sent + stats.confirmed) / stats.valid * 100).toFixed(1) : 0,
      failureRate: stats.valid > 0 ? (stats.failed / stats.valid * 100).toFixed(1) : 0,
      responseRate: stats.sent > 0 ? (stats.confirmed / stats.sent * 100).toFixed(1) : 0,
    };
  }, [campaigns]);
}

// Composants UI améliorés
function MetricCard({ label, value, subValue, icon, trend }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-[#FFC600] hover:-translate-y-1">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFC600] to-[#FFD700] opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {subValue && (
              <span className="text-sm text-gray-500">{subValue}</span>
            )}
          </div>
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-[#FFF9E6] transition-colors">
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-gray-400">vs mois dernier</span>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreateCampaign, canWrite }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF9E6] mb-4">
        <MessageCircle className="w-8 h-8 text-[#FFC600]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Aucune campagne SMS
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Commencez par créer votre première campagne SMS pour envoyer des messages à vos contacts.
      </p>
      {canWrite && (
        <button
          onClick={onCreateCampaign}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFC600] text-black font-semibold rounded-lg hover:bg-[#e6b200] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Créer ma première campagne
        </button>
      )}
    </div>
  );
}

function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirmer", type = "warning" }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            {type === 'danger' ? (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            ) : (
              <Info className="w-6 h-6 text-yellow-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              type === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-[#FFC600] hover:bg-[#e6b200] text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant principal
export default function SmsCampaignsPage() {
  const canWrite = usePermission(Permission.MARKETING_WRITE);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedSmsCampaignId, setSelectedSmsCampaignId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, config: {} });
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState("grid");

  const smsCampaigns = settings.smsCampaigns || [];
  const stats = useCampaignStats(smsCampaigns);
  
  // Filtrage et tri des campagnes
  const filteredCampaigns = useMemo(() => {
    let result = [...smsCampaigns];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        [
          c.name,
          c.description,
          c.eventName,
          c.eventDate,
          c.location,
          c.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      result = result.filter(c => String(c.status || "DRAFT").toUpperCase() === statusFilter);
    }
    
    switch (sortBy) {
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "recipients":
        result.sort((a, b) => (b.recipients?.length || 0) - (a.recipients?.length || 0));
        break;
      case "date":
      default:
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
    }
    
    return result;
  }, [smsCampaigns, searchQuery, statusFilter, sortBy]);

  const hiddenCampaignsCount = Math.max(0, smsCampaigns.length - filteredCampaigns.length);
  const hasActiveCampaignFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";
  const campaignStatusCounts = useMemo(() => {
    return smsCampaigns.reduce((acc, campaign) => {
      const status = String(campaign.status || "DRAFT").toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [smsCampaigns]);

  const resetCampaignFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
  }, []);

  const handleSave = useCallback(async () => {
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
  }, [settings]);

  const handleCreateSmsCampaign = useCallback(() => {
    const nextCampaign = createSmsCampaign();
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: [nextCampaign, ...(prev.smsCampaigns || [])],
    }));
    setSelectedSmsCampaignId(nextCampaign.id);
  }, []);

  const handleUpdateSmsCampaign = useCallback((nextCampaign) => {
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: (prev.smsCampaigns || []).map((campaign) =>
        campaign.id === nextCampaign.id ? nextCampaign : campaign,
      ),
    }));
  }, []);

  const handleDeleteSmsCampaign = useCallback((campaign) => {
    setConfirmDialog({
      isOpen: true,
      config: {
        title: "Supprimer la campagne",
        message: `Êtes-vous sûr de vouloir supprimer la campagne "${campaign.name}" ? Cette action est irréversible.`,
        type: "danger",
        confirmLabel: "Supprimer",
        onConfirm: () => {
          const nextCampaigns = smsCampaigns.filter((item) => item.id !== campaign.id);
          setSettings((prev) => ({ ...prev, smsCampaigns: nextCampaigns }));
          setSelectedSmsCampaignId(nextCampaigns[0]?.id || "");
          setInfo("Campagne supprimée. Cliquez sur Enregistrer pour confirmer.");
          setConfirmDialog({ isOpen: false, config: {} });
        },
        onClose: () => setConfirmDialog({ isOpen: false, config: {} }),
      },
    });
  }, [smsCampaigns]);

  const handleDuplicateSmsCampaign = useCallback((campaign) => {
    const now = new Date().toISOString();
    const duplicated = {
      ...campaign,
      id: `sms-${Date.now()}`,
      name: `${campaign.name || "Campagne SMS"} - copie`,
      status: "DRAFT",
      recipients: (campaign.recipients || []).map((recipient, index) => ({
        ...recipient,
        id: `recipient-${Date.now()}-${index + 1}`,
        status: recipient.phoneNormalized ? "READY" : "INVALID",
        providerMessageId: "",
        lastError: recipient.phoneNormalized ? "" : recipient.lastError || "",
        sentAt: null,
      })),
      createdAt: now,
      updatedAt: now,
      lastSentAt: null,
      lastTestAt: null,
    };
    setSettings((prev) => ({
      ...prev,
      smsCampaigns: [duplicated, ...(prev.smsCampaigns || [])],
    }));
    setSelectedSmsCampaignId(duplicated.id);
    setInfo("Campagne dupliquée. Vérifiez le contenu puis enregistrez.");
  }, []);

  const handleSendSmsTest = useCallback(async (campaign) => {
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
  }, [settings, handleUpdateSmsCampaign]);

  const handleSendSmsCampaign = useCallback(async (campaign) => {
    const stats = getCampaignStats(campaign);
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Envoyer cette campagne SMS a ${stats.valid} destinataires valides ?`);
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
        response?.sending
          ? `Envoi en cours pour ${response.total || stats.valid} destinataires.`
          : `Envoi terminé : ${response?.sentCount || 0} envoyés, ${response?.failedCount || 0} échecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'envoyer la campagne SMS.");
    } finally {
      setSendingSms(false);
    }
  }, [settings, handleUpdateSmsCampaign]);

  const handleResendFailedSms = useCallback(async (campaign) => {
    const stats = getCampaignStats(campaign);
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Renvoyer uniquement aux ${stats.failed} destinataires en échec ?`);
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
        response?.sending
          ? `Renvoi en cours pour ${response.total || stats.failed} destinataires.`
          : `Renvoi terminé : ${response?.sentCount || 0} envoyés, ${response?.failedCount || 0} échecs.`,
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de renvoyer les SMS en échec.");
    } finally {
      setSendingSms(false);
    }
  }, [settings, handleUpdateSmsCampaign]);

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

  useEffect(() => {
    if (info || error) {
      const timer = setTimeout(() => {
        setInfo("");
        setError("");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [info, error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* En-tête */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC600] opacity-5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <MessageCircle className="w-6 h-6 text-[#FFC600]" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC600]">
                Marketing SMS
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-3">Campagnes SMS</h1>
            <p className="text-gray-300 max-w-2xl">
              Créez, gérez et suivez vos campagnes SMS en temps réel. 
              Analysez les performances et optimisez votre stratégie de communication mobile.
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <MetricCard
            label="Campagnes"
            value={stats.campaigns}
            subValue={`${filteredCampaigns.length} affichée${filteredCampaigns.length > 1 ? "s" : ""}`}
            icon={<Target className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="Contacts"
            value={stats.contacts}
            icon={<Users className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="Valides"
            value={stats.valid}
            subValue={`${stats.deliveryRate}% livrés`}
            icon={<CheckCircle className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="Envoyés"
            value={stats.sent}
            icon={<Send className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="Échecs"
            value={stats.failed}
            subValue={`${stats.failureRate}%`}
            icon={<AlertCircle className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="Confirmés"
            value={stats.confirmed}
            subValue={`${stats.responseRate}% de réponse`}
            icon={<ThumbsUp className="w-5 h-5 text-gray-400" />}
          />
          <MetricCard
            label="En attente"
            value={stats.pending}
            icon={<Clock className="w-5 h-5 text-gray-400" />}
          />
        </div>

        {/* Notifications */}
        <AnimatedNotification type="success" message={info} isVisible={!!info} />
        <AnimatedNotification type="error" message={error} isVisible={!!error} />
        
        {/* Barre d'actions et filtres */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une campagne..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FFC600] focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FFC600]"
              >
                <option value="all">Tous les statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="SENDING">En cours</option>
                <option value="SENT">Envoyée</option>
                <option value="PARTIAL">Partielle</option>
                <option value="FAILED">Échec</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FFC600]"
              >
                <option value="date">Plus récent</option>
                <option value="name">Nom</option>
                <option value="recipients">Destinataires</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow" : ""}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow" : ""}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              {canWrite && (
                <button
                  onClick={handleCreateSmsCampaign}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFC600] text-black font-semibold rounded-lg hover:bg-[#e6b200] transition-all hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouvelle campagne</span>
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-gray-600">
              {filteredCampaigns.length} affichée{filteredCampaigns.length > 1 ? "s" : ""} sur {smsCampaigns.length} enregistrée{smsCampaigns.length > 1 ? "s" : ""}
            </span>
            {["DRAFT", "SENDING", "SENT", "PARTIAL", "FAILED"].map((status) => (
              <span key={status} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-gray-600">
                {status}: {campaignStatusCounts[status] || 0}
              </span>
            ))}
            {hasActiveCampaignFilters ? (
              <button
                type="button"
                onClick={resetCampaignFilters}
                className="rounded-full border border-[#FFC600] bg-[#fff7df] px-2.5 py-1 font-medium text-black hover:bg-[#ffefbd]"
              >
                Réinitialiser filtres
              </button>
            ) : null}
          </div>
        </div>

        {hiddenCampaignsCount > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {hiddenCampaignsCount} campagne{hiddenCampaignsCount > 1 ? "s" : ""} existe{hiddenCampaignsCount > 1 ? "nt" : ""} dans le total mais {hiddenCampaignsCount > 1 ? "sont masquées" : "est masquée"} par la recherche ou le filtre de statut.
          </div>
        ) : null}

        {/* Contenu principal */}
        {loading ? (
          <LoadingSkeleton />
        ) : smsCampaigns.length === 0 ? (
          <EmptyState onCreateCampaign={handleCreateSmsCampaign} canWrite={canWrite} />
        ) : (
          <SmsCampaignWorkspace
            campaigns={filteredCampaigns}
            selectedCampaignId={selectedSmsCampaignId}
            onSelectCampaign={setSelectedSmsCampaignId}
            onCreateCampaign={handleCreateSmsCampaign}
            onUpdateCampaign={handleUpdateSmsCampaign}
            onSave={handleSave}
            onSendTest={handleSendSmsTest}
            onSendCampaign={handleSendSmsCampaign}
            onResendFailed={handleResendFailedSms}
            onDuplicateCampaign={handleDuplicateSmsCampaign}
            onDeleteCampaign={handleDeleteSmsCampaign}
            canWrite={canWrite}
            saving={saving}
            sending={sendingSms}
            viewMode={viewMode}
          />
        )}

        {/* Dialogue de confirmation */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={confirmDialog.config.onClose}
          onConfirm={confirmDialog.config.onConfirm}
          title={confirmDialog.config.title}
          message={confirmDialog.config.message}
          confirmLabel={confirmDialog.config.confirmLabel}
          type={confirmDialog.config.type}
        />
      </div>
    </div>
  );
}

// Composants d'interface supplémentaires
function AnimatedNotification({ type, message, isVisible }) {
  if (!isVisible || !message) return null;
  
  return (
    <div
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
          type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
        <p className="text-sm font-medium flex-1">{message}</p>
        <button className="text-current opacity-50 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
