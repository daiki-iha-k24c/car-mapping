import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
    const [name, setName] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    async function save() {
        setErr(null);

        const username = name.trim();
        console.log("[onboarding] save clicked, username=", username);

        if (username.length < 2 || username.length > 16) {
            setErr("ユーザーネームは2〜16文字にしてね");
            return;
        }

        setSaving(true);
        try {
            // ✅ user を必ず用意
            const { data: s1 } = await supabase.auth.getSession();
            console.log("[onboarding] before ensure session:", !!s1.session);

            let user = s1.session?.user;
            if (!user) {
                const res = await supabase.auth.signInAnonymously();
                console.log("[onboarding] signInAnonymously:", res.error ?? "ok");
                if (res.error) throw res.error;
                user = res.data.user!;
            }

            console.log("[onboarding] userId=", user.id);

            // ✅ profiles 保存
            const { error } = await supabase.from("profiles").upsert({
                user_id: user.id,
                username,
            });

            console.log("[onboarding] upsert error:", error ?? "none");

            if (error) {
                const msg = (error.message || "").toLowerCase();

                // Postgres: duplicate key value violates unique constraint ...
                // Supabaseは code=23505 が多い
                // @ts-ignore
                if (error.code === "23505" || msg.includes("duplicate") || msg.includes("unique")) {
                    setErr("そのユーザーネームは既に使われています。別の名前にしてね。");
                    return;
                }

                throw error;
            }


            // ✅ 保存できたかを再取得で確認
            const { data: p2, error: e2 } = await supabase
                .from("profiles")
                .select("username")
                .eq("user_id", user.id)
                .maybeSingle();

            console.log("[onboarding] profile after upsert:", p2, e2 ?? "ok");

            // ✅ ここで遷移（replace推奨）
            console.log("[onboarding] navigating to /");
            navigate("/", { replace: true });
        } catch (e: any) {
            console.error(e);
            setErr(e?.message ?? "保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }


    return (
        <div style={{ padding: 16 }}>
            <h2>ユーザーネーム登録</h2>
            <p>初回だけ入力してね（後から変更できます）</p>

            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ユーザー名を入力してね"
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
            />

            {err && <div style={{ color: "crimson", marginTop: 8 }}>{err}</div>}

            <button
                onClick={save}
                disabled={saving}
                style={{ marginTop: 12, padding: 12, borderRadius: 10, width: "100%" }}
            >
                {saving ? "保存中..." : "保存する"}
            </button>
        </div>
    );
}
