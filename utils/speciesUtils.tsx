import { colours } from "../theme/colours";

export const formatScientificName = (name?: string) => {
  if (!name) return "";
  return name.trim();
};

export const hasIncompatible = (species: any) =>
  Array.isArray(species?.incompatibleWith) &&
  species.incompatibleWith.length > 0;

export const getIncompatibleList = (species: any) =>
  hasIncompatible(species) ? species.incompatibleWith : [];

export const formatRange = (range?: [number, number]) => {
  if (!range || range.length !== 2) return "";
  return `${range[0]}–${range[1]}`;
};

export const formatPH = (pH?: [number, number]) =>
  pH ? `pH ${formatRange(pH)}` : "";

export const formatTemp = (temp?: [number, number]) =>
  temp ? `Temp ${formatRange(temp)}°C` : "";

export const formatSize = (size?: number) =>
  size ? `Size ${size} cm` : "";

export const formatOxygen = (oxygenNeed?: string) =>
  oxygenNeed ? `O₂ ${oxygenNeed}` : "";

export const formatTempShort = (t: number) => {
  if (t === undefined || t === null) return "";
  return `${t.toFixed(1)}°C`;
};

export const formatOxygenShort = (oxy: number) => {
  if (oxy === undefined || oxy === null) return "";
  return `${Math.round(oxy)}%`;
};

export const formatEnv = (env: "freshwater" | "saltwater") => {
  if (!env) return "";
  return env === "freshwater" ? "Fresh" : "Salt";
};


export const toSlug = (k: string) =>
  (k || "")
    .trim()
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// canonical ID for species & tank items
export const canonicalId = (s: any) =>
  toSlug(s?.assetKey || s?.speciesId || s?.id || s?.name || "");

export const asRange = (r?: any) => {
  if (!r) return undefined;

  if (Array.isArray(r)) return { min: r[0], max: r[1] };

  if (typeof r === "object" && r !== null && "0" in r && "1" in r) {
    return { min: r[0], max: r[1] };
  }

  if (typeof r.min === "number" && typeof r.max === "number") {
    return r;
  }

  return undefined;
};

export const normalizeSpecies = (s: any) => {
  // Accept "ph" or "pH" or weird Firestore keys
  const rawPh =
    s.ph ??
    s.pH ??
    (s as any)["Ph"] ??
    (s as any)["PH"] ??
    (s as any)["phRange"];

  const ph =
    typeof rawPh === "number"
      ? rawPh
      : asRange(rawPh);

  const temp = asRange(s.temp);

  // assetKey fallback
  const assetKey = s.assetKey ? toSlug(s.assetKey) : toSlug(s.name || s.id || "");

  // incompatible list cleanup
  const rawIncompat = s.incompatibleWith ?? [];
  let arr: string[] = [];

  if (Array.isArray(rawIncompat)) arr = rawIncompat;
  else if (typeof rawIncompat === "string") arr = rawIncompat.split(/[,\n;]/);
  else if (rawIncompat && typeof rawIncompat === "object")
    arr = Object.values(rawIncompat).map(String);

  const incompatibleWith = arr.map((v) => toSlug(String(v))).filter(Boolean);

  // Normalise water type
  const rawType = (s.type ?? "freshwater")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "");

  const type =
    rawType.startsWith("salt") || rawType.startsWith("marine")
      ? "saltwater"
      : "freshwater";

  const kind = s.kind ?? undefined;

  return {
    ...s,
    ph,
    temp,
    assetKey,
    incompatibleWith,
    type,
    kind,
  };
};

export const SELF_AVOID = new Set(["betta"]);

// Explicit incompatibility: A incompatibleWith B OR B incompatibleWith A
export const isExplicitlyIncompatible = (a: any, b: any) => {
  const aId = canonicalId(a);
  const bId = canonicalId(b);

  const A = Array.isArray(a.incompatibleWith)
    ? a.incompatibleWith
    : [];

  const B = Array.isArray(b.incompatibleWith)
    ? b.incompatibleWith
    : [];

  return A.includes(bId) || B.includes(aId);
};

// Main compatibility function for left sidebar pills
export const simpleCompatAgainstTank = (candidate: any, tank: any[]) => {
  const GOOD = colours.compatGood;
  const BAD = colours.compatBad;

  if (!tank || tank.length === 0)
    return { label: "Good", color: GOOD };

  const candKey = canonicalId(candidate);

  if (SELF_AVOID.has(candKey)) {
    if (tank.some((t) => canonicalId(t) === candKey))
      return { label: "Avoid", color: BAD };
  }

  for (const t of tank) {
    if (isExplicitlyIncompatible(candidate, t))
      return { label: "Avoid", color: BAD };
  }

  return { label: "Good", color: GOOD };
};

// Build conflict list for modals
export const addConflicts = (candidate: any, tankItems: any[]) => {
  const msgs: string[] = [];
  const candId = canonicalId(candidate);

  // Self-avoid duplicates (e.g., bettas)
  if (SELF_AVOID.has(candId)) {
    const clashes = tankItems.filter(
      (t) => canonicalId(t) === candId
    );
    clashes.forEach((c) => {
      msgs.push(
        `• ${c.nickname || c.name} — another ${
          candidate.name
        } is already in your tank`
      );
    });
  }

  // Explicit incompatibilities
  for (const t of tankItems) {
    if (isExplicitlyIncompatible(candidate, t)) {
      msgs.push(
        `• ${t.nickname || t.name} — incompatible with ${candidate.name}`
      );
    }
  }

  return msgs;
};