export type Region = {
  id: string;          // "tokyo-shinagawa"
  prefectureId: string;// "tokyo"
  prefectureName: string; // "東京都"
  name: string;        // "品川"
  yomi?: string;       // "しながわ"
};

export const regions: Region[] = [
  { id: "tokyo-shinagawa", prefectureId: "tokyo", prefectureName: "東京都", name: "品川", yomi: "しながわ" },
  { id: "tokyo-nerima",   prefectureId: "tokyo", prefectureName: "東京都", name: "練馬", yomi: "ねりま" },
  { id: "tokyo-adachi",   prefectureId: "tokyo", prefectureName: "東京都", name: "足立", yomi: "あだち" },

  { id: "kanagawa-yokohama", prefectureId: "kanagawa", prefectureName: "神奈川県", name: "横浜", yomi: "よこはま" },
  { id: "kanagawa-sagamihara", prefectureId: "kanagawa", prefectureName: "神奈川県", name: "相模原", yomi: "さがみはら" },
];
