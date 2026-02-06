import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./welcomeSplash.css";

type Phase = "type" | "swap" | "ballize" | "drop" | "flood" | "out";

export default function WelcomeSplash({ totalMs = 6200 }: { totalMs?: number }) {
    const [phase, setPhase] = useState<Phase>("type");

    const rootRef = useRef<HTMLDivElement | null>(null);
    const aRef = useRef<HTMLSpanElement | null>(null);
    const ballRef = useRef<HTMLSpanElement | null>(null);

    const t = useMemo(() => {
        const type = 2200;
        const swap = 220;
        const ballize = 350;
        const drop = 1400;  // 少しゆっくり落とす
        const flood = 1000; // 1秒で広がる（指定）
        const out = Math.max(400, totalMs - type - swap - ballize - drop - flood);
        return { type, swap, ballize, drop, flood, out };
    }, [totalMs]);

    const placeBallAtA = () => {
        const root = rootRef.current;
        const a = aRef.current;
        const ball = ballRef.current;
        if (!root || !a || !ball) return;

        const rr = root.getBoundingClientRect();
        const ar = a.getBoundingClientRect();

        const cx = ar.left + ar.width / 2 - rr.left;
        const cy = ar.top + ar.height / 2 - rr.top;

        ball.style.left = `${cx}px`;
        ball.style.top = `${cy}px`;
    };

    // floodの起点を「ボールの中心」に設定（着地点）
    const setFloodOriginAtBall = () => {
        const root = rootRef.current;
        const ball = ballRef.current;
        if (!root || !ball) return;

        const rr = root.getBoundingClientRect();
        const br = ball.getBoundingClientRect();

        const cx = br.left + br.width / 2 - rr.left;
        const cy = br.top + br.height / 2 - rr.top;

        root.style.setProperty("--fx", `${cx}px`);
        root.style.setProperty("--fy", `${cy}px`);
    };

    useLayoutEffect(() => {
        placeBallAtA();
        const onResize = () => {
            placeBallAtA();
            setFloodOriginAtBall();
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const s1 = window.setTimeout(() => setPhase("swap"), t.type);
        const s2 = window.setTimeout(() => setPhase("ballize"), t.type + t.swap);
        const s3 = window.setTimeout(() => setPhase("drop"), t.type + t.swap + t.ballize);

        const s4 = window.setTimeout(() => {
            // ✅ 落下が終わるタイミングで起点を取得して flood 開始
            setFloodOriginAtBall();
            requestAnimationFrame(() => setPhase("flood"));
        }, t.type + t.swap + t.ballize + t.drop);

        const s5 = window.setTimeout(
            () => setPhase("out"),
            t.type + t.swap + t.ballize + t.drop + t.flood
        );

        return () => {
            window.clearTimeout(s1);
            window.clearTimeout(s2);
            window.clearTimeout(s3);
            window.clearTimeout(s4);
            window.clearTimeout(s5);
        };
    }, [t.type, t.swap, t.ballize, t.drop, t.flood]);

    useEffect(() => {
        if (phase === "swap" || phase === "ballize") placeBallAtA();
    }, [phase]);

    return (
        <div ref={rootRef} className={`ws-root ws-${phase}`} aria-label="起動中">
            {/* 着地点から広がる青 */}
            <div className="ws-flood" aria-hidden="true" />

            {/* a→ボール */}
            <span ref={ballRef} className="ws-ball" aria-hidden="true" />

            {/* type中だけ */}
            <div className="ws-line ws-typeLine" aria-hidden={phase !== "type"}>
                <span className="ws-typeText">car-mapping</span>
                <span className="ws-caret" />
            </div>

            {/* 完成形（swap以降） */}
            <div className="ws-line ws-finalLine" aria-hidden={phase === "type"}>
                <span className="ws-finalText">
                    car-m
                    <span ref={aRef} className="ws-a">a</span>
                    pping
                </span>
            </div>
        </div>
    );
}
