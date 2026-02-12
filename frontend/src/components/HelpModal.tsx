import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;

  // 追加：全クリア処理（親から渡す）
  onClearAll: () => void;
};

export default function HelpModal({ open, onClose, onClearAll }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleClearAll = () => {
    const ok = window.confirm(
      "全クリアを実行します。\n発見済みの記録がすべて未発見に戻ります。\nこの操作は元に戻せません。"
    );
    if (!ok) return;

    onClearAll();
    onClose(); // 実行後は閉じる（好みで外してOK）
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="使い方 / 保存について"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "#fff",
            padding: 16,
            borderBottom: "1px solid #eee",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>使い方 / 保存について</h3>
          <button
            className="btn"
            onClick={onClose}
            style={{ padding: "6px 10px" }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, lineHeight: 1.7 }}>
          <h4 style={{ margin: "14px 0 6px" }}>使い方</h4>
          <ol style={{ marginTop: 0, paddingLeft: 20 }}>
            <li>
              画面上部の検索バーから地域名を検索（例：<b>し</b> → <b>品川</b>）
            </li>
            <li>候補を選ぶと、登録画面が表示されます</li>
            <li>登録すると、地図や都道府県の進捗に反映されます</li>
            <li>
              地図上の都道府県をタップすると、その県の地域一覧を確認できます（※一覧内では登録できません）
            </li>
          </ol>

          <h4 style={{ margin: "14px 0 6px" }}>全クリア（リセット）について（重要）</h4>
          <ul style={{ marginTop: 0, paddingLeft: 20 }}>
            <li>全クリアを実行すると、発見済みの記録がすべて未発見に戻ります</li>
            <li>この操作は元に戻せません（端末内に保存されているため）</li>
          </ul>

          <h4 style={{ margin: "14px 0 6px" }}>データの保存について（重要）</h4>
          <ul style={{ marginTop: 0, paddingLeft: 20 }}>
            <li>
              記録は <b>この端末・このブラウザ</b> の中（localStorage）に保存されます
            </li>
            <li>同じURLを友達が使っても、あなたの記録が共有されたり混ざったりはしません</li>
            <li>ブラウザの「サイトデータ削除」や「履歴削除」をすると記録が消えることがあります</li>
            <li>別端末 / 別ブラウザには引き継がれません（スマホだけで使うなら問題なし）</li>
          </ul>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
            ※ シークレットモードでは記録が保持されない場合があります（閉じると消えることも）
          </div>
        </div>

        {/* Footer：一番下にボタン */}
        <div
          style={{
            padding: 16,
            borderTop: "1px solid #eee",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button className="btn" onClick={onClose}>
            閉じる
          </button>

        </div>
      </div>
    </div>
  );
}
