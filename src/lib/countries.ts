/** Liste courte des pays les plus pertinents (marché FR/UE + places horlogères). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "LU", name: "Luxembourg" },
  { code: "MC", name: "Monaco" },
  { code: "DE", name: "Allemagne" },
  { code: "AT", name: "Autriche" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "IE", name: "Irlande" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "DK", name: "Danemark" },
  { code: "SE", name: "Suède" },
  { code: "PL", name: "Pologne" },
  { code: "GR", name: "Grèce" },
  { code: "US", name: "États-Unis" },
  { code: "CA", name: "Canada" },
  { code: "AE", name: "Émirats arabes unis" },
  { code: "HK", name: "Hong Kong" },
  { code: "SG", name: "Singapour" },
  { code: "JP", name: "Japon" },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
