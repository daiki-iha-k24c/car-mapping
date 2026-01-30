import type { Region } from "../lib/region";
import { useState } from "react";

export default function CompleteModal({
    open,
    region,
    defaultMemo,
    onClose,
    onConfirm,
    alreadyDone,
}: {
    open: boolean;
    region: Region | null;
    alreadyDone: boolean;
    defaultMemo?: string;
    onClose: () => void;
    onConfirm: (memo: string) => void;
}) {
    const [memo, setMemo] = useState(defaultMemo ?? "");

    if (!open || !region) return null;

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <div className="row spread" style={{ marginBottom: 8 }}>
                    <strong>{region.name} を記録</strong>
                    <span className={`badge ${alreadyDone ? "done" : "todo"}`}>
                        {alreadyDone ? "記録済み" : "未記録"}
                    </span>
                </div>

                <div className="small" style={{ marginBottom: 10 }}>
                    都道府県：{region.pref}
                </div>


                <div className="stack">
                    <input
                        className="input"
                        placeholder="メモ（任意）例：見かけた場所、車種など"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                    />

                    <div className="row" style={{ justifyContent: "flex-end" }}>
                        <button className="btn" onClick={onClose}>キャンセル</button>
                        <button
                            className="btn primary"
                            onClick={() => onConfirm(memo)}
                        >
                            記録済みにする
                        </button>
                    </div>

                    <div className="small">
                        ※MVPでは「記録済みにする」だけ。解除は一覧ページで可能にしてあります。
                    </div>
                </div>
            </div>
        </div>
    );
}
