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

  // ✅ 追加：セッション復元中フラグ（ここがないと復帰で /login に飛ぶ）
  authChecking: boolean;

  // 既存
  loading: boolean; // ←これはプロフィール取得中などに使っててOK（ただしガードには使わない）
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

  // ✅ ここは「復帰体験」を良くするため、キャッシュがあればそれを初期値にする
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");

  const lastRetryAtRef = useRef<number>(0);
  const [authChecking, setAuthChecking] = useState(true);

  const hydrateFromCache = useCallback((uid: string) => {
    const cached = readProfileCache(uid);
    if (!cached) return;

    // ✅ すでに表示できる情報があるなら即反映
    if (cached.username !== undefined) setUsername(cached.username ?? null);
    if (cached.avatarUrl !== undefined) setAvatarUrl(cached.avatarUrl ?? null);
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    setProfileStatus("loading");

    // まずキャッシュから即復元（通信待ちしない）
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

      if (error) {
        console.warn("profiles read error:", error);
        // ✅ 重要：ここで username/avatarUrl を null にしない（UI維持）
        setProfileStatus("error");
        return;
      }

      if (!data) { // ✅ 追加
        setProfileStatus("missing");
        setUsername(null);
        setAvatarUrl(null);
        return;
      }

      const nextUsername = data?.username ?? null;
      const nextAvatar = data?.avatar_url ?? null;

      setUsername(nextUsername);
      setAvatarUrl(nextAvatar);

      writeProfileCache(uid, { username: nextUsername, avatarUrl: nextAvatar });

      setProfileStatus("ready");
    } catch (e) {
      console.warn("profiles read timeout/error:", e);
      // ✅ 重要：ここでも UI は維持
      setProfileStatus("error");
    }
  }, [hydrateFromCache]);

  const retryProfile = useCallback(async () => {
    // 復帰時に連打されるのを防ぐ（1.5秒以内は無視）
    const now = Date.now();
    if (now - lastRetryAtRef.current < 1500) return;
    lastRetryAtRef.current = now;

    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000);
      const uid = data.session?.user?.id;
      if (!uid) return;

      setUserId(uid);
      await loadProfile(uid);
    } catch (e) {
      console.warn("retryProfile timeout/error:", e);
      setProfileStatus("error");
    }
  }, [loadProfile]);

  useEffect(() => {
    let alive = true;

    const applySession = async (session: any) => {
      // auth state change は頻繁に来るので、UIを壊さないよう慎重に
      setLoading(true);
      try {
        if (!session?.user) {
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
          setProfileStatus("loading");
          return;
        }

        const uid = session.user.id as string;
        setUserId(uid);

        // キャッシュで即表示→裏で最新化
        hydrateFromCache(uid);
        await loadProfile(uid);
      } catch (e) {
        console.warn("applySession error:", e);
        // ログイン状態が確定で壊れてる時だけ落とす
        setUserId(null);
        setUsername(null);
        setAvatarUrl(null);
        setProfileStatus("error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    // 初回ブートストラップ
    (async () => {
      setAuthChecking(true);
      try {
        // 1) ローカルから userId を復元（ネット不要）
        const localUid = readLocalSessionUserId();
        if (localUid) {
          setUserId(localUid);
          hydrateFromCache(localUid);
          // ✅ ここで loading を false にして「即描画」を優先
          // （裏で getSession / loadProfile が走る）
          if (alive) setLoading(false);
        }

        // 2) 正規ルートでセッション取得（遅くてもOK）
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
            setLoading(false);
          }
          return;
        }

        const uid = sess.user.id;
        setUserId(uid);
        hydrateFromCache(uid);

        // ここから最新化
        await loadProfile(uid);
      } catch (e) {
        console.warn("auth bootstrap timeout/error:", e);

        // ✅ 重要：ここで userId を null にしない（ログイン維持）
        // ローカル復元が無い場合だけ未ログインにする
        const localUid = readLocalSessionUserId();
        if (!localUid) {
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
        }

        setProfileStatus("error");
      } finally {
        if (!alive) return;
        setAuthChecking(false);
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
        setUserId(null);
        setUsername(null);
        setAvatarUrl(null);
        setProfileStatus("error");
        setLoading(false);
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromCache, loadProfile]);

  // ✅ iOS復帰対策：タブ/アプリに戻ったタイミングで裏で再同期
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        retryProfile();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
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
    [userId, username, avatarUrl, loading, authChecking, profileStatus, retryProfile] // ✅ authChecking追加
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
