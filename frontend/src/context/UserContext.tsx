import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type UserContextValue = {
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  loading: boolean;
};

const UserContext = createContext<UserContextValue>({
  userId: null,
  username: null,
  avatarUrl: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      let { data: sess } = await supabase.auth.getSession();
      let user = sess.session?.user;

      if (!user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) throw res.error;
        user = res.data.user!;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setUsername(profile?.username ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  return (
    <UserContext.Provider value={{ userId, username, avatarUrl, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
