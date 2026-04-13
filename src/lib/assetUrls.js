export function withBaseUrl(assetPath = "") {
  const normalizedBase = import.meta.env.BASE_URL || "/";
  const cleanBase = normalizedBase.endsWith("/")
    ? normalizedBase
    : `${normalizedBase}/`;
  const cleanPath = String(assetPath || "").replace(/^\/+/, "");
  return `${cleanBase}${cleanPath}`;
}

export const foreverLogoHomeUrl = withBaseUrl("logo-forever-home.png");
export const foreverLogoUrl = withBaseUrl("logo-forever.png");
