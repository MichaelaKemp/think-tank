export const filterSpeciesList = (speciesList: any[], search: string) => {
  const q = search.trim().toLowerCase();
  if (!q) return speciesList;

  return speciesList.filter((s) => {
    const n = (s.name || "").toLowerCase();
    const sci = (s.scientificName || "").toLowerCase();
    return n.includes(q) || sci.includes(q);
  });
};

export const filterByKind = (all: any[], kind: "all" | "fish" | "plant") => {
  if (kind === "all") return all;
  return all.filter((s) => s.kind === kind);
};