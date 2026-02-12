import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";

type ProfileStatus = "loading" | "ready" | "missing" | "error";

type UserState = {
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;

  authChecking: boolean;

  loading: boolean;
  profileStatus: ProfileStatus;

  retryProfile: () => Promise<void>;
};

const UserContext = createContext<UserState | null>(null);

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// PostgrestBuilder(thenable) を Promise に変換
function asPromise<T>(thenable: any): Promise<T> {
  return Promise.resolve(thenable as any) as Promise<T>;
}

function readLocalSessionUserId(): string | null {
  try {
    const storageKey = (supabase as any)?.auth?.storageKey as string | undefined;
    if (!storageKey) return null;

    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** =========================
 *  Profile cache (localStorage)
 *  ========================= */
const PROFILE_CACHE_PREFIX = "cm_profile_cache_v1:";

function cacheKey(uid: string) {
  return `${PROFILE_CACHE_PREFIX}${uid}`;
}

function readProfileCache(uid: string): { username: string | null; avatarUrl: string | null } | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeProfileCache(uid: string, v: { username: string | null; avatarUrl: string | null }) {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(v));
  } catch {
    // ignore
  }
}

type ProfileRow = { username: string | null; avatar_url: string | null };

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);

  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");

  const lastRetryAtRef = useRef<number>(0);

  const hydrateFromCache = useCallback((uid: string) => {
    const cached = readProfileCache(uid);
    if (!cached) return;
    if (cached.username !== undefined) setUsername(cached.username ?? null);
    if (cached.avatarUrl !== undefined) setAvatarUrl(cached.avatarUrl ?? null);
  }, []);

  const loadProfile = useCallback(
    async (uid: string) => {
      // 既に ready のときは落とさない。そうでなければ loading に。
      setProfileStatus((prev) => (prev === "ready" ? "ready" : "loading"));

      // まずキャッシュから即復元（UX優先）
      hydrateFromCache(uid);

      try {
        const { data, error } = await withTimeout(
          asPromise<{ data: ProfileRow | null; error: any }>(
            supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("user_id", uid)
              .maybeSingle<ProfileRow>()
          ),
          8000
        );

        // ---- soft error（RLS / ネットワーク等）----
        if (error) {
          console.warn("profiles read error (soft):", error);
          // ✅ missing にしない（通信揺れで onboarding に飛ばない）
          setProfileStatus((prev) => (prev === "ready" ? "ready" : "loading"));
          return;
        }

        // ---- プロフィール行が無い（= 確定 missing）----
        if (!data) {
          setUsername(null);
          setAvatarUrl(null);
          setProfileStatus("missing"); // ← ここだけが missing
          return;
        }

        // ---- 正常 ----
        const nextUsername = data.username ?? null;
        const nextAvatar = data.avatar_url ?? null;

        setUsername(nextUsername);
        setAvatarUrl(nextAvatar);
        writeProfileCache(uid, { username: nextUsername, avatarUrl: nextAvatar });

        setProfileStatus("ready");
      } catch (e: any) {
        const msg = String(e?.message ?? e);

        // ---- timeout は soft ----
        if (msg.toLowerCase().includes("timeout")) {
          console.warn("profiles read timeout (soft):", e);
          // ✅ ready を落とさず、それ以外は loading 維持
          setProfileStatus((prev) => (prev === "ready" ? "ready" : "loading"));
          return;
        }

        // ---- それ以外の例外のみ error ----
        console.error("profiles read exception:", e);
        setProfileStatus("error");
      }
    },
    [hydrateFromCache]
  );



  const retryProfile = useCallback(async () => {
    const now = Date.now();
    if (now - lastRetryAtRef.current < 1500) return;
    lastRetryAtRef.current = now;

    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000);
      const uid = data.session?.user?.id;

      if (!uid) {
        // ✅ ここで error にしない（瞬断・重さで落ちる）
        console.warn("retryProfile: no uid (soft)");
        setProfileStatus((prev) => (prev === "ready" ? "ready" : prev));
        return;
      }

      // setUserId(uid);
      setUserId((prev) => (prev === uid ? prev : uid));
      if (profileStatus === "ready") return;

      await loadProfile(uid);
    } catch (e: any) {
      const msg = String(e?.message ?? e);

      if (msg.toLowerCase().includes("timeout")) {
        console.warn("retryProfile timeout (soft):", e);
        setProfileStatus((prev) => (prev === "ready" ? "ready" : "loading"));
        return;
      }

      console.error("retryProfile error:", e);
      setProfileStatus("error");
    }
  }, [loadProfile]);

  useEffect(() => {
    console.log("[UC]", { userId, profileStatus, authChecking });
  }, [userId, profileStatus, authChecking]);


  useEffect(() => {
    let alive = true;

    // ✅ 復帰最強：applySessionは「落とさない」
    const applySession = async (session: any) => {
      setLoading(true);
      try {
        if (!session?.user) {
          // ✅ ここだけはログアウト確定
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
          setProfileStatus("loading");
          return;
        }

        const uid = session.user.id as string;
        setUserId(uid);

        // キャッシュ即表示→裏で最新化
        hydrateFromCache(uid);
        await loadProfile(uid);
      } catch (e) {
        console.warn("applySession error:", e);
        // ✅ 重要：ここで userId を null にしない（復帰最強）
        setProfileStatus("error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    // 初回ブートストラップ
    (async () => {
      setAuthChecking(true); // ✅ 追加：ここから復元期間

      try {
        // 1) ローカルから userId を復元（ネット不要）
        const localUid = readLocalSessionUserId();
        if (localUid) {
          setUserId(localUid);
          hydrateFromCache(localUid);
          // 即描画優先
          if (alive) setLoading(false);
        }

        // 2) 正規ルートでセッション取得
        const { data } = await withTimeout(supabase.auth.getSession(), 8000);
        if (!alive) return;

        const sess = data.session;

        if (!sess?.user) {
          // ローカル復元が無い場合だけ未ログイン確定
          if (!localUid) {
            setUserId(null);
            setUsername(null);
            setAvatarUrl(null);
            setProfileStatus("loading");
          }
          return;
        }

        const uid = sess.user.id;
        setUserId(uid);
        hydrateFromCache(uid);

        await loadProfile(uid);
      } catch (e) {
        console.warn("auth bootstrap timeout/error:", e);

        function isInvalidRefreshToken(err: any) {
          const msg = String(err?.message ?? err);
          return msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found");
        }


        // ✅ refresh token が死んでたら、残骸を消して「未ログイン」に揃える
        if (isInvalidRefreshToken(e)) {
          try {
            const storageKey = (supabase as any)?.auth?.storageKey as string | undefined;
            if (storageKey) localStorage.removeItem(storageKey);
            // プロフィールキャッシュも消す（任意だけどおすすめ）
            // localStorage.removeItem(`cm_profile_cache_v1:${readLocalSessionUserId() ?? ""}`);
            await supabase.auth.signOut();
          } catch { }
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
        }

        setProfileStatus((prev) => (prev === "ready" ? "ready" : "loading"));
      }
      finally {
        if (!alive) return;
        setAuthChecking(false); // ✅ 追加：復元期間終了
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return;
      try {
        await withTimeout(applySession(session), 9000);
      } catch (e) {
        console.warn("auth change handler timeout/error:", e);
        if (!alive) return;
        // ✅ ここでも userId を落とさない（復帰最強）
        setProfileStatus("error");
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromCache, loadProfile]);

  // ✅ iOS復帰対策：戻ったタイミングで裏で再同期
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        retryProfile();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", retryProfile);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", retryProfile);
    };
  }, [retryProfile]);

  const value = useMemo(
    () => ({
      userId,
      username,
      avatarUrl,
      loading,
      authChecking,
      profileStatus,
      retryProfile,
    }),
    [userId, username, avatarUrl, loading, authChecking, profileStatus, retryProfile]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
