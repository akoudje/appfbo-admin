export const DEFAULT_SETTINGS = {
  slides: [
    {
      id: "slide-1",
      title: "Slide 1",
      image: "/Slide1.webp",
      link: "",
      active: true,
      note: "Slide principal du catalogue FBO.",
    },
    {
      id: "slide-2",
      title: "Slide 2",
      image: "/Slide2.webp",
      link: "",
      active: true,
      note: "Slide secondaire du catalogue FBO.",
    },
    {
      id: "slide-3",
      title: "Slide 3",
      image: "/Slide3.webp",
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

export function createSmsCampaign() {
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
      "FOREVER: Bonjour {{nom}}, invitation {{eventDate}} a {{location}}.",
    status: "DRAFT",
    testPhone: "",
    recipients: [],
    createdAt: now,
    updatedAt: now,
    lastSentAt: null,
    lastTestAt: null,
  };
}

