import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type ProfileStatus = "loading" | "ready" | "error";

type UserState = {
  userId: string | null;
  username: string | null;
  loading: boolean;

  // ✅ ここは「storage path」を持つ（表示側で public URL 化する）
  avatarUrl: string | null;

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

// ✅ avatar_url を追加
type ProfileRow = { username: string | null; avatar_url: string | null };

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("loading");

  async function loadProfile(uid: string) {
    setProfileStatus("loading");
    try {
      const { data, error } = await withTimeout(
        asPromise<{ data: ProfileRow | null; error: any }>(
          supabase
            .from("profiles")
            // ✅ avatar_url を読む
            .select("username, avatar_url")
            .eq("user_id", uid)
            .maybeSingle<ProfileRow>()
        ),
        8000
      );

      if (error) {
        console.warn("profiles read error:", error);
        setUsername(null);
        setAvatarUrl(null);
        setProfileStatus("error");
        return;
      }

      setUsername(data?.username ?? null);
      setAvatarUrl(data?.avatar_url ?? null);
      setProfileStatus("ready");
    } catch (e) {
      console.warn("profiles read timeout/error:", e);
      setUsername(null);
      setAvatarUrl(null);
      setProfileStatus("error");
    }
  }

  const retryProfile = async () => {
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 8000);
      const uid = data.session?.user?.id;
      if (!uid) return;
      await loadProfile(uid);
    } catch (e) {
      console.warn("retryProfile timeout/error:", e);
      setProfileStatus("error");
    }
  };

  useEffect(() => {
    let alive = true;

    const applySession = async (session: any) => {
      setLoading(true);
      try {
        if (!session?.user) {
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
          setProfileStatus("loading");
          return;
        }

        setUserId(session.user.id);
        await loadProfile(session.user.id);
      } catch (e) {
        console.warn("applySession error:", e);
        setUserId(null);
        setUsername(null);
        setAvatarUrl(null);
        setProfileStatus("error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    (async () => {
      try {
        const localUid = readLocalSessionUserId();
        if (localUid) {
          setUserId(localUid);
          // username / avatarUrl は後で取る
        }

        const { data } = await withTimeout(supabase.auth.getSession(), 8000);
        if (!alive) return;

        const sess = data.session;
        if (!sess?.user) {
          if (!localUid) {
            setUserId(null);
            setUsername(null);
            setAvatarUrl(null);
          }
          return;
        }

        setUserId(sess.user.id);
        await loadProfile(sess.user.id);
      } catch (e) {
        console.warn("auth bootstrap timeout/error:", e);

        const localUid = readLocalSessionUserId();
        if (!localUid) {
          setUserId(null);
          setUsername(null);
          setAvatarUrl(null);
        }
      } finally {
        if (!alive) return;
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
  }, []);

  // ✅ avatarUrl を value に含める（ここが抜けてた）
  const value = useMemo(
    () => ({ userId, username, avatarUrl, loading, profileStatus, retryProfile }),
    [userId, username, avatarUrl, loading, profileStatus]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
