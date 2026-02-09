import { isExcludedPrefecture } from "../lib/excludedPrefectures";

export type PlateColor = "white" | "yellow" | "green" | "black";
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
  photo_url?: string | null;
  capturedAt?: string | null;
};

const KEY_BASE = "plates_v1";

function key(userId: string) {
  return `${KEY_BASE}:${userId}`;
}

function loadAll(userId: string): Plate[] {
  const keyNew = `plates:${userId}`;
  const keyOld = `plates`; // ← 旧仕様がこれだった場合

  const read = (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]") as Plate[];
    } catch {
      return [];
    }
  };

  const arrNew = read(keyNew);
  if (arrNew.length > 0) return arrNew;

  // ✅ 新キーが空なら旧キーも見る（移行期間）
  const arrOld = read(keyOld);

  // （任意）旧 → 新へ移行しておくと次回から速い
  if (arrOld.length > 0) {
    localStorage.setItem(keyNew, JSON.stringify(arrOld));
    // localStorage.removeItem(keyOld); // 消したいなら
  }

  return arrOld;
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
  // ✅ 沖縄県は登録不可（ローカル側）
  const pref = (plate.regionId ?? "").split(":")[0];
  if (isExcludedPrefecture(pref)) {
    throw new Error("沖縄県のナンバープレートは登録対象外です");
  }

  const all = loadAll(userId);
  all.push(plate);
  saveAll(userId, all);
}

export function clearPlates(userId: string) {
  localStorage.removeItem(key(userId));
}
