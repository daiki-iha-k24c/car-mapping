export type PlateColor = "white" | "yellow" | "green" | "pink";
export type PlateStyle = "digital" | "illustration";

export type Plate = {
  id: string;
  regionId: string;
  classNumber: string;
  kana: string;
  serial: string;
  color: PlateColor;
  renderSvg: string;
  createdAt: string;
};

const KEY_BASE = "plates_v1";

function key(userId: string) {
  return `${KEY_BASE}:${userId}`;
}

function loadAll(userId: string): Plate[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(userId: string, plates: Plate[]) {
  localStorage.setItem(key(userId), JSON.stringify(plates));
}

export function listPlatesByRegionId(userId: string, regionId: string): Plate[] {
  return loadAll(userId)
    .filter((p) => p.regionId === regionId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addPlate(userId: string, plate: Plate) {
  const all = loadAll(userId);
  all.push(plate);
  saveAll(userId, all);
}

export function clearPlates(userId: string) {
  localStorage.removeItem(key(userId));
}
