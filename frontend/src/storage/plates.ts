export type PlateColor = "white" | "yellow" | "green" | "pink";
export type PlateStyle = "digital" | "illustration";

export type Plate = {
  id: string;
  regionId: string;
  classNumber: string;
  kana: string;
  serial: string;
  color: "white" | "yellow" | "green" | "pink";
  renderSvg: string;
  createdAt: string;
};


const KEY = "plates_v1";

function loadAll(): Plate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(plates: Plate[]) {
  localStorage.setItem(KEY, JSON.stringify(plates));
}

export function listPlatesByRegionId(regionId: string): Plate[] {
  return loadAll()
    .filter((p) => p.regionId === regionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addPlate(plate: Plate) {
  const all = loadAll();
  all.push(plate);
  saveAll(all);
}
