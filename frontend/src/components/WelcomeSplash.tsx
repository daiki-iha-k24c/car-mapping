import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./welcomeSplash.css";

type Phase = "type" | "swap" | "ballize" | "drop" | "puff" | "out";

export default function WelcomeSplash({ totalMs = 4200 }: { totalMs?: number }) {
    const [phase, setPhase] = useState<Phase>("type");

    const rootRef = useRef<HTMLDivElement | null>(null);
    const aRef = useRef<HTMLSpanElement | null>(null);
    const splashRef = useRef<HTMLSpanElement | null>(null);
    const ballRef = useRef<HTMLSpanElement | null>(null);

    const t = useMemo(() => {
        const type = 1100;
        const swap = 150;     // 詰まり対策で少し長め推奨
        const ballize = 175;
        const puff = 1000;
        const out = Math.max(400, totalMs - type - swap - ballize - puff);
        return { type, swap, ballize, puff, out };
    }, [totalMs]);

    const placeAtA = () => {
        const root = rootRef.current;
        const a = aRef.current;
        const ball = ballRef.current;
        if (!root || !a || !ball) return;

        const rr = root.getBoundingClientRect();
        const ar = a.getBoundingClientRect();

        const cx = ar.left + ar.width / 2 - rr.left;
        const cy = ar.top + ar.height / 2 - rr.top;

        // ball を a の中心に配置（transformで中心合わせ）
        ball.style.left = `${cx}px`;
        ball.style.top = `${cy}px`;
    };

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
        placeAtA();
        const onResize = () => {
            placeAtA();
            setFloodOriginAtBall();
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const s1 = window.setTimeout(() => setPhase("swap"), t.type);
        const s2 = window.setTimeout(() => setPhase("ballize"), t.type + t.swap);

        // ✅ drop を挟まずに puff へ
        const s3 = window.setTimeout(() => {
            setFloodOriginAtBall(); // puff直前に起点セットはそのまま
            setPhase("puff");
        }, t.type + t.swap + t.ballize);

        const s4 = window.setTimeout(
            () => setPhase("out"),
            t.type + t.swap + t.ballize + t.puff
        );

        return () => {
            window.clearTimeout(s1);
            window.clearTimeout(s2);
            window.clearTimeout(s3);
            window.clearTimeout(s4);
        };
    }, [t.type, t.swap, t.ballize, t.puff]);

    useEffect(() => {
        // swap/ballize で位置を確実に合わせる
        if (phase === "swap" || phase === "ballize") placeAtA();
    }, [phase]);

    return (
        <div ref={rootRef} className={`ws-root ws-${phase}`} aria-label="起動中">
            {/* Practical puff（起点は ball の位置） */}
            {/* 全画面の広がり（clip-path） */}
            <div className="ws-flood" aria-hidden="true" />

            {/* a→ball 変換用のボール（fixedで絶対位置） */}
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
                    <span ref={aRef} className="ws-a">
                        a
                    </span>
                    pping
                </span>
            </div>
        </div>
    );
}
