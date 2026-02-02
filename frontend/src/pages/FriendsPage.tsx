import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";

type ProfileRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
};

export default function FriendsPage() {
  const { userId, username: myName, avatarUrl: myAvatar, loading } = useUser();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [results, setResults] = useState<ProfileRow[]>([]);

  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set()); // 自分→相手
  const [myFollowers, setMyFollowers] = useState<Set<string>>(new Set()); // 相手→自分（相互判定用）
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [followErr, setFollowErr] = useState<string | null>(null);

  // ✅ 自分の follow 状態を読み込む（1回＋更新時）
  const reloadFollows = async (uid: string) => {
    setLoadingFollows(true);
    setFollowErr(null);
    try {
      // 自分がフォローしてる相手
      const { data: followingRows, error: e1 } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", uid);

      if (e1) throw e1;

      // 自分をフォローしてる相手（相互判定）
      const { data: followerRows, error: e2 } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", uid);

      if (e2) throw e2;

      setMyFollowing(new Set((followingRows ?? []).map((r: any) => r.following_id)));
      setMyFollowers(new Set((followerRows ?? []).map((r: any) => r.follower_id)));
    } catch (e: any) {
      console.error(e);
      setFollowErr(e?.message ?? "フレンド情報の取得に失敗しました");
    } finally {
      setLoadingFollows(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!userId) return;
    reloadFollows(userId);
  }, [userId, loading]);

  // ✅ 検索（username 部分一致）
  const doSearch = async () => {
    if (!userId) return;
    const keyword = q.trim();
    if (!keyword) {
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchErr(null);

    try {
      // ilike は PostgreSQL の case-insensitive
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .ilike("username", `%${keyword}%`)
        .limit(20);

      if (error) throw error;

      // 自分自身は除外
      const list = (data ?? []).filter((p: any) => p.user_id !== userId) as ProfileRow[];
      setResults(list);
    } catch (e: any) {
      console.error(e);
      setSearchErr(e?.message ?? "検索に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  // Enterで検索
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") doSearch();
  };

  // ✅ follow / unfollow
  const follow = async (targetUserId: string) => {
    if (!userId) return;
    setFollowErr(null);
    try {
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        following_id: targetUserId,
      });
      if (error) throw error;
      await reloadFollows(userId);
    } catch (e: any) {
      console.error(e);
      setFollowErr(e?.message ?? "フォローに失敗しました");
    }
  };

  const unfollow = async (targetUserId: string) => {
    if (!userId) return;
    setFollowErr(null);
    try {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetUserId);
      if (error) throw error;
      await reloadFollows(userId);
    } catch (e: any) {
      console.error(e);
      setFollowErr(e?.message ?? "解除に失敗しました");
    }
  };

  const friendsList = useMemo(() => {
    // 相互（友達）: 自分→相手 & 相手→自分
    const out: string[] = [];
    for (const uid of myFollowing) {
      if (myFollowers.has(uid)) out.push(uid);
    }
    return out;
  }, [myFollowing, myFollowers]);

  if (loading) {
    return <div className="container" style={{ padding: 16, opacity: 0.7 }}>読み込み中...</div>;
  }

  if (!userId) {
    return <div className="container" style={{ padding: 16, opacity: 0.7 }}>ログイン確認中...</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2 style={{ margin: 0 }}>フレンド</h2>
          <div className="small">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid #e5e7eb",
                  background: "#f3f4f6",
                  overflow: "hidden",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#6b7280",
                }}
              >
                {myAvatar ? (
                  <img src={myAvatar} alt="あなたのアイコン" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>{myName?.slice(0, 1) || "?"}</span>
                )}
              </span>
              {myName ? `あなた：${myName}` : "ユーザー名を設定すると探しやすいよ"}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <Link to="/" className="btn">← ホーム</Link>
        </div>
      </div>

      {/* 検索 */}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>ユーザーを探す（ユーザーネーム）</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="相手のユーザー名を入力"
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                outline: "none",
              }}
            />
            <button className="btn" onClick={doSearch} disabled={searching || !q.trim()}>
              {searching ? "検索中..." : "検索"}
            </button>
          </div>
        </div>

        {searchErr && (
          <div style={{ background: "#ffecec", border: "1px solid #ffb4b4", color: "#a40000", padding: 10, borderRadius: 12 }}>
            {searchErr}
          </div>
        )}

        {followErr && (
          <div style={{ background: "#ffecec", border: "1px solid #ffb4b4", color: "#a40000", padding: 10, borderRadius: 12 }}>
            {followErr}
          </div>
        )}

        {/* 検索結果 */}
        {results.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#666" }}>検索結果</div>
            {results.map((p) => {
              const isFollowing = myFollowing.has(p.user_id);
              const isFriend = isFollowing && myFollowers.has(p.user_id);
              return (
                <div
                  key={p.user_id}
                  style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}>
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          border: "1px solid #e5e7eb",
                          background: "#f3f4f6",
                          overflow: "hidden",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#6b7280",
                        }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={`${p.username}のアイコン`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span>{p.username.slice(0, 1) || "?"}</span>
                        )}
                      </span>
                      <span>{p.username}</span>
                      {isFriend && (
                        <span style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          background: "#f8fafc",
                        }}>
                          相互
                        </span>
                      )}
                    </div>

                    {/* <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      <Link to={`/u/${encodeURIComponent(p.username)}`} className="btn" style={{ textDecoration: "none" }}>
                        地図を見る
                      </Link>
                    </div> */}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {isFollowing ? (
                      <button className="btn" onClick={() => unfollow(p.user_id)}>
                        解除
                      </button>
                    ) : (
                      <button className="btn" onClick={() => follow(p.user_id)}>
                        フォロー
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 相互フレンド一覧（user_idだけだと味気ないので username も出すなら追加読みが必要）
            → まずは「検索結果から地図を見る」で運用できる形にしてる */}
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
          相互（友達）数：{loadingFollows ? "…" : friendsList.length}
        </div>

        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>
          ※ 相手もあなたをフォローすると「相互」になります（友達扱い）
        </div>
      </div>
    </div>
  );
}
