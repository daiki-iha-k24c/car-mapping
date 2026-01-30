export type Region = {
  id: string;        // 例: "tokyo-shinagawa"
  name: string;      // 例: "品川"
  pref: string;      // 例: "東京都"
  areaOrder: number; // 並び用
};

export type RegionRecord = {
  regionId: string;
  completed: boolean;
  completedAt?: string;
  memo?: string;
};

export type PrefStatus = "none" | "partial" | "complete";
