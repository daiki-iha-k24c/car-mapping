import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";

type Profile = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

type FriendshipRow = {
  id: number;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  created_at: string;
  accepted_at: string | null;
};

type FriendItem = {
  friendshipId: number;
  other: Profile;
  status: "pending" | "accepted";
  direction: "outgoing" | "incoming";
};

type FriendStats = {
  achieved_regions: number;
  achieved_numbers: number;
  total_plates: number;
};

function debounceWait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}

function resolveAvatarUrl(avatarUrl: string | null) {
  if (!avatarUrl) return null;

  // すでにURLならそのまま
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

  // avatar_url が user_id だけ入ってる暫定ケース
  // → user_id.png として扱う
  const path = avatarUrl.endsWith(".png")
    ? avatarUrl
    : `${avatarUrl}.png`;

  const { data } = supabase.storage
    .from("avatars") // ← バケット名
    .getPublicUrl(path);

  return data.publicUrl ?? null;
}

function Avatar({
  username,
  avatarUrl,
  size = 34,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  const src = useMemo(() => {
    if (!avatarUrl) return null;
    if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;

    // avatar_url が user_id だけの暫定を許容（userId.png 想定）
    const path = avatarUrl.endsWith(".png") ? avatarUrl : `${avatarUrl}.png`;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl ?? null;
  }, [avatarUrl]);

  const initial = (username?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: "rgba(0,0,0,0.06)",
        overflow: "hidden",
        flex: "0 0 auto",
        display: "grid",
        placeItems: "center",
      }}
    >
      {!broken && src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setBroken(true)} // ✅ 壊れたらimgを消して頭文字だけ
        />
      ) : (
        <div style={{ fontWeight: 800, opacity: 0.7, lineHeight: 1 }}>{initial}</div>
      )}
    </div>
  );
}



export default function FriendPage() {
  const { userId } = useUser();

  // ------- friends list -------
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendItem[]>([]);

  // ------- search -------
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<Profile[]>([]);

  // 追加/承認/削除の処理中
  const [busyId, setBusyId] = useState<string | number | null>(null);

  // info modal
  const TOTAL_REGIONS = 133;
  const TOTAL_NUMBERS = 9999;

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoUser, setInfoUser] = useState<Profile | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoStats, setInfoStats] = useState<FriendStats | null>(null);

  // 自分のフレンド関係をロード
  async function loadFriends() {
    if (!userId) return;

    setFriendsLoading(true);
    setFriendsError(null);

    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("id,user_id,friend_id,status,created_at,accepted_at")
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .returns<FriendshipRow[]>();

      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) {
        setFriends([]);
        return;
      }

      // 相手のuser_id一覧を作る
      const otherIds = rows.map((r) => (r.user_id === userId ? r.friend_id : r.user_id));

      // profiles をまとめて取る
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_url")
        .in("user_id", otherIds)
        .returns<Profile[]>();

      if (pErr) throw pErr;

      const map = new Map((profs ?? []).map((p) => [p.user_id, p]));

      const items: FriendItem[] = rows
        .map((r) => {
          const otherId = r.user_id === userId ? r.friend_id : r.user_id;
          const other = map.get(otherId);
          if (!other) return null;

          const direction: FriendItem["direction"] =
            r.user_id === userId ? "outgoing" : "incoming";

          return {
            friendshipId: r.id,
            other,
            status: r.status,
            direction,
          };
        })
        .filter(Boolean) as FriendItem[];

      // 表示：accepted → pending(incoming) → pending(outgoing)
      items.sort((a, b) => {
        const rank = (x: FriendItem) => {
          if (x.status === "accepted") return 0;
          if (x.direction === "incoming") return 1;
          return 2;
        };
        return rank(a) - rank(b) || a.other.username.localeCompare(b.other.username);
      });

      setFriends(items);
    } catch (e: any) {
      setFriendsError(e?.message ?? "フレンド一覧の取得に失敗しました");
    } finally {
      setFriendsLoading(false);
    }
  }

  async function openInfo(p: Profile) {
    setInfoOpen(true);
    setInfoUser(p);
    setInfoLoading(true);
    setInfoError(null);
    setInfoStats(null);

    try {
      const { data, error } = await supabase.rpc("get_friend_stats", {
        target_user: p.user_id,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("統計が取得できませんでした");

      setInfoStats({
        achieved_regions: Number(row.achieved_regions ?? 0),
        achieved_numbers: Number(row.achieved_numbers ?? 0),
        total_plates: Number(row.total_plates ?? 0),
      });
    } catch (e: any) {
      setInfoError(e?.message ?? "情報取得に失敗しました");
    } finally {
      setInfoLoading(false);
    }
  }

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 検索（username 部分一致）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const keyword = q.trim();
      if (!userId) return;

      if (!keyword) {
        setResults([]);
        setSearchError(null);
        setSearching(false);
        return;
      }

      setSearching(true);
      setSearchError(null);

      await debounceWait(250);
      if (cancelled) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id,username,avatar_url")
          .ilike("username", `%${keyword}%`)
          .neq("user_id", userId)
          .order("username", { ascending: true })
          .limit(20)
          .returns<Profile[]>();

        if (error) throw error;
        if (cancelled) return;

        setResults(data ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setSearchError(e?.message ?? "検索に失敗しました");
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, userId]);

  const friendIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of friends) set.add(f.other.user_id);
    return set;
  }, [friends]);

  // 申請（pending）
  async function requestFriend(targetUserId: string) {
    if (!userId) return;
    if (targetUserId === userId) return;

    setBusyId(targetUserId);
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: userId,           // ✅ 申請者は必ず自分
        friend_id: targetUserId,   // ✅ 相手
        status: "pending",
      });
      if (error) throw error;

      await loadFriends();
      setQ("");
      setResults([]);
    } catch (e: any) {
      alert(e?.message ?? "申請に失敗しました");
    } finally {
      setBusyId(null);
    }
  }


  // 承認（pending → accepted）
  async function acceptFriend(friendshipId: number) {
    setBusyId(friendshipId);
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", friendshipId);
      if (error) throw error;

      await loadFriends();
    } catch (e: any) {
      alert(e?.message ?? "承認に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  // 削除
  async function removeFriend(friendshipId: number) {
    if (!confirm("このフレンドを削除しますか？")) return;

    setBusyId(friendshipId);
    try {
      const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
      if (error) throw error;

      await loadFriends();
    } catch (e: any) {
      alert(e?.message ?? "削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>フレンド</h2>
        </div>
        <div className="header-actions">
          <Link to="/" className="btn">
            ホームへ戻る
          </Link>
        </div>
      </div>

      {/* 検索 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>ユーザー検索</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ユーザーネームで検索"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />

        {searchError && <div style={{ marginTop: 8, color: "#b00020" }}>{searchError}</div>}

        {(searching || results.length > 0) && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {searching ? "検索中…" : `結果：${results.length}件`}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {results.map((p) => {
                const already = friendIdSet.has(p.user_id);
                const src = resolveAvatarUrl(p.avatar_url);
                return (
                  <div
                    key={p.user_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar username={p.username} avatarUrl={p.avatar_url} />

                      <div>
                        <div style={{ fontWeight: 700 }}>{p.username}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {already ? "すでにフレンド関係があります" : "フレンド申請できます"}
                        </div>
                      </div>
                    </div>


                    {already ? (
                      <button className="btn" disabled>
                        追加済み
                      </button>
                    ) : (
                      <button
                        className="btn"
                        onClick={() => requestFriend(p.user_id)}
                        disabled={busyId === p.user_id}
                      >
                        {busyId === p.user_id ? "送信中…" : "フレンド追加"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 一覧 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700 }}>フレンド一覧</div>
          <button className="btn" onClick={loadFriends} disabled={friendsLoading}>
            更新
          </button>
        </div>

        {friendsError && <div style={{ marginTop: 8, color: "#b00020" }}>{friendsError}</div>}

        {friendsLoading ? (
          <div style={{ padding: 12, opacity: 0.7 }}>読み込み中…</div>
        ) : friends.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.7 }}>
            まだフレンドがいません。上の検索から追加できます。
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {friends.map((f) => {
              const pending = f.status === "pending";
              const incoming = pending && f.direction === "incoming";
              const src = resolveAvatarUrl(f.other.avatar_url);
              return (
                <div
                  key={f.friendshipId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar
                      username={f.other.username}
                      avatarUrl={f.other.avatar_url}
                    />

                    <div>
                      <div style={{ fontWeight: 700 }}>{f.other.username}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {f.status === "accepted"
                          ? "フレンド"
                          : incoming
                            ? "申請が届いています"
                            : "申請中"}
                      </div>
                    </div>
                  </div>


                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {f.status === "accepted" ? (
                      <button className="btn" onClick={() => openInfo(f.other)}>
                        情報
                      </button>
                    ) : incoming ? (
                      <button
                        className="btn"
                        onClick={() => acceptFriend(f.friendshipId)}
                        disabled={busyId === f.friendshipId}
                      >
                        {busyId === f.friendshipId ? "承認中…" : "承認"}
                      </button>
                    ) : (
                      <button className="btn" disabled>
                        申請中
                      </button>
                    )}

                    <button
                      className="btn"
                      onClick={() => removeFriend(f.friendshipId)}
                      disabled={busyId === f.friendshipId}
                      style={{ opacity: 0.85 }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 情報モーダル */}
      {infoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 3000,
          }}
          onClick={() => setInfoOpen(false)}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {infoUser?.username ?? "情報"}
              </div>
              <button className="btn" onClick={() => setInfoOpen(false)}>
                閉じる
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {infoLoading ? (
                <div style={{ opacity: 0.7 }}>取得中…</div>
              ) : infoError ? (
                <div style={{ color: "#b00020" }}>{infoError}</div>
              ) : infoStats ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <StatRow
                    label="達成地域数"
                    value={`${infoStats.achieved_regions}/${TOTAL_REGIONS}`}
                  />
                  <StatRow
                    label="達成ナンバー数"
                    value={`${infoStats.achieved_numbers}/${TOTAL_NUMBERS}`}
                  />
                  <StatRow label="総登録プレート数" value={`${infoStats.total_plates}`} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
