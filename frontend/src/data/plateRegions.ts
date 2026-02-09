export type PlateRegionReading = {
  prefecture: string;
  name: string;
  reading: string;
};

export const PLATE_REGIONS: PlateRegionReading[] = [
  { prefecture: "北海道", name: "札幌", reading: "さっぽろ" },
  { prefecture: "北海道", name: "函館", reading: "はこだて" },
  { prefecture: "北海道", name: "旭川", reading: "あさひかわ" },
  { prefecture: "北海道", name: "室蘭", reading: "むろらん" },
  { prefecture: "北海道", name: "釧路", reading: "くしろ" },
  { prefecture: "北海道", name: "帯広", reading: "おびひろ" },
  { prefecture: "北海道", name: "北見", reading: "きたみ" },
  { prefecture: "北海道", name: "苫小牧", reading: "とまこまい" },
  { prefecture: "北海道", name: "知床", reading: "しれとこ" },

  { prefecture: "青森県", name: "青森", reading: "あおもり" },
  { prefecture: "青森県", name: "八戸", reading: "はちのへ" },
  { prefecture: "青森県", name: "弘前", reading: "ひろさき" },

  { prefecture: "岩手県", name: "岩手", reading: "いわて" },
  { prefecture: "岩手県", name: "盛岡", reading: "もりおか" },
  { prefecture: "岩手県", name: "平泉", reading: "ひらいずみ" },

  { prefecture: "宮城県", name: "宮城", reading: "みやぎ" },
  { prefecture: "宮城県", name: "仙台", reading: "せんだい" },

  { prefecture: "秋田県", name: "秋田", reading: "あきた" },

  { prefecture: "山形県", name: "山形", reading: "やまがた" },
  { prefecture: "山形県", name: "庄内", reading: "しょうない" },

  { prefecture: "福島県", name: "福島", reading: "ふくしま" },
  { prefecture: "福島県", name: "いわき", reading: "いわき" },
  { prefecture: "福島県", name: "会津", reading: "あいづ" },
  { prefecture: "福島県", name: "郡山", reading: "こおりやま" },
  { prefecture: "福島県", name: "白河", reading: "しらかわ" },

  { prefecture: "茨城県", name: "水戸", reading: "みと" },
  { prefecture: "茨城県", name: "土浦", reading: "つちうら" },
  { prefecture: "茨城県", name: "つくば", reading: "つくば" },

  { prefecture: "栃木県", name: "宇都宮", reading: "うつのみや" },
  { prefecture: "栃木県", name: "とちぎ", reading: "とちぎ" },
  { prefecture: "栃木県", name: "那須", reading: "なす" },

  { prefecture: "群馬県", name: "群馬", reading: "ぐんま" },
  { prefecture: "群馬県", name: "前橋", reading: "まえばし" },
  { prefecture: "群馬県", name: "高崎", reading: "たかさき" },

  { prefecture: "埼玉県", name: "大宮", reading: "おおみや" },
  { prefecture: "埼玉県", name: "所沢", reading: "ところざわ" },
  { prefecture: "埼玉県", name: "熊谷", reading: "くまがや" },
  { prefecture: "埼玉県", name: "春日部", reading: "かすかべ" },
  { prefecture: "埼玉県", name: "川越", reading: "かわごえ" },
  { prefecture: "埼玉県", name: "川口", reading: "かわぐち" },
  { prefecture: "埼玉県", name: "越谷", reading: "こしがや" },

  { prefecture: "千葉県", name: "千葉", reading: "ちば" },
  { prefecture: "千葉県", name: "習志野", reading: "ならしの" },
  { prefecture: "千葉県", name: "袖ヶ浦", reading: "そでがうら" },
  { prefecture: "千葉県", name: "野田", reading: "のだ" },
  { prefecture: "千葉県", name: "成田", reading: "なりた" },
  { prefecture: "千葉県", name: "柏", reading: "かしわ" },
  { prefecture: "千葉県", name: "松戸", reading: "まつど" },
  { prefecture: "千葉県", name: "市川", reading: "いちかわ" },
  { prefecture: "千葉県", name: "船橋", reading: "ふなばし" },
  { prefecture: "千葉県", name: "市原", reading: "いちはら" },

  { prefecture: "東京都", name: "品川", reading: "しながわ" },
  { prefecture: "東京都", name: "練馬", reading: "ねりま" },
  { prefecture: "東京都", name: "足立", reading: "あだち" },
  { prefecture: "東京都", name: "八王子", reading: "はちおうじ" },
  { prefecture: "東京都", name: "多摩", reading: "たま" },
  { prefecture: "東京都", name: "世田谷", reading: "せたがや" },
  { prefecture: "東京都", name: "杉並", reading: "すぎなみ" },
  { prefecture: "東京都", name: "板橋", reading: "いたばし" },
  { prefecture: "東京都", name: "江東", reading: "こうとう" },
  { prefecture: "東京都", name: "葛飾", reading: "かつしか" },

  { prefecture: "神奈川県", name: "横浜", reading: "よこはま" },
  { prefecture: "神奈川県", name: "川崎", reading: "かわさき" },
  { prefecture: "神奈川県", name: "相模", reading: "さがみ" },
  { prefecture: "神奈川県", name: "湘南", reading: "しょうなん" },

  { prefecture: "山梨県", name: "山梨", reading: "やまなし" },
  { prefecture: "山梨県", name: "富士山", reading: "ふじさん" },

  { prefecture: "新潟県", name: "新潟", reading: "にいがた" },
  { prefecture: "新潟県", name: "長岡", reading: "ながおか" },
  { prefecture: "新潟県", name: "上越", reading: "じょうえつ" },

  { prefecture: "富山県", name: "富山", reading: "とやま" },

  { prefecture: "石川県", name: "石川", reading: "いしかわ" },
  { prefecture: "石川県", name: "金沢", reading: "かなざわ" },

  { prefecture: "福井県", name: "福井", reading: "ふくい" },

  { prefecture: "長野県", name: "長野", reading: "ながの" },
  { prefecture: "長野県", name: "松本", reading: "まつもと" },
  { prefecture: "長野県", name: "諏訪", reading: "すわ" },

  { prefecture: "岐阜県", name: "岐阜", reading: "ぎふ" },
  { prefecture: "岐阜県", name: "飛騨", reading: "ひだ" },

  { prefecture: "静岡県", name: "静岡", reading: "しずおか" },
  { prefecture: "静岡県", name: "浜松", reading: "はままつ" },
  { prefecture: "静岡県", name: "沼津", reading: "ぬまづ" },
  { prefecture: "静岡県", name: "伊豆", reading: "いず" },
  { prefecture: "静岡県", name: "富士山", reading: "ふじさん" },

  { prefecture: "愛知県", name: "名古屋", reading: "なごや" },
  { prefecture: "愛知県", name: "豊橋", reading: "とよはし" },
  { prefecture: "愛知県", name: "三河", reading: "みかわ" },
  { prefecture: "愛知県", name: "尾張小牧", reading: "おわりこまき" },
  { prefecture: "愛知県", name: "豊田", reading: "とよた" },
  { prefecture: "愛知県", name: "岡崎", reading: "おかざき" },
  { prefecture: "愛知県", name: "一宮", reading: "いちのみや" },
  { prefecture: "愛知県", name: "春日井", reading: "かすがい" },

  { prefecture: "三重県", name: "三重", reading: "みえ" },
  { prefecture: "三重県", name: "鈴鹿", reading: "すずか" },
  { prefecture: "三重県", name: "四日市", reading: "よっかいち" },
  { prefecture: "三重県", name: "伊勢志摩", reading: "いせしま" },

  { prefecture: "滋賀県", name: "滋賀", reading: "しが" },

  { prefecture: "京都府", name: "京都", reading: "きょうと" },

  { prefecture: "大阪府", name: "大阪", reading: "おおさか" },
  { prefecture: "大阪府", name: "なにわ", reading: "なにわ" },
  { prefecture: "大阪府", name: "和泉", reading: "いずみ" },
  { prefecture: "大阪府", name: "堺", reading: "さかい" },

  { prefecture: "兵庫県", name: "神戸", reading: "こうべ" },
  { prefecture: "兵庫県", name: "姫路", reading: "ひめじ" },

  { prefecture: "奈良県", name: "奈良", reading: "なら" },
  { prefecture: "奈良県", name: "飛鳥", reading: "あすか" },

  { prefecture: "和歌山県", name: "和歌山", reading: "わかやま" },

  { prefecture: "鳥取県", name: "鳥取", reading: "とっとり" },

  { prefecture: "島根県", name: "島根", reading: "しまね" },
  { prefecture: "島根県", name: "出雲", reading: "いずも" },

  { prefecture: "岡山県", name: "岡山", reading: "おかやま" },
  { prefecture: "岡山県", name: "倉敷", reading: "くらしき" },

  { prefecture: "広島県", name: "広島", reading: "ひろしま" },
  { prefecture: "広島県", name: "福山", reading: "ふくやま" },

  { prefecture: "山口県", name: "山口", reading: "やまぐち" },
  { prefecture: "山口県", name: "下関", reading: "しものせき" },

  { prefecture: "徳島県", name: "徳島", reading: "とくしま" },

  { prefecture: "香川県", name: "香川", reading: "かがわ" },
  { prefecture: "香川県", name: "高松", reading: "たかまつ" },

  { prefecture: "愛媛県", name: "愛媛", reading: "えひめ" },

  { prefecture: "高知県", name: "高知", reading: "こうち" },

  { prefecture: "福岡県", name: "福岡", reading: "ふくおか" },
  { prefecture: "福岡県", name: "北九州", reading: "きたきゅうしゅう" },
  { prefecture: "福岡県", name: "久留米", reading: "くるめ" },
  { prefecture: "福岡県", name: "筑豊", reading: "ちくほう" },

  { prefecture: "佐賀県", name: "佐賀", reading: "さが" },

  { prefecture: "長崎県", name: "長崎", reading: "ながさき" },
  { prefecture: "長崎県", name: "佐世保", reading: "させぼ" },

  { prefecture: "熊本県", name: "熊本", reading: "くまもと" },

  { prefecture: "大分県", name: "大分", reading: "おおいた" },

  { prefecture: "宮崎県", name: "宮崎", reading: "みやざき" },

  { prefecture: "鹿児島県", name: "鹿児島", reading: "かごしま" },
  { prefecture: "鹿児島県", name: "奄美", reading: "あまみ" },

];
