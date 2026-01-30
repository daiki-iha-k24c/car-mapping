import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegionListPage from "./pages/RegionListPage";
import RegionPage from "./pages/RegionPage";
import RegionPlatesPage from "./pages/RegionPlatesPage";

export default function App() {
  return (
    <Routes>
      {/* 既存 */}
      <Route path="/" element={<HomePage />} />
      <Route path="/regions" element={<RegionListPage />} />

      {/* 追加 */}
      <Route path="/region/:regionId" element={<RegionPage />} />
      <Route
        path="/region/:regionId/plates"
        element={<RegionPlatesPage />}
      />

      {/* フォールバック */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
