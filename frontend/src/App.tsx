import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegionListPage from "./pages/RegionListPage";
import RegionPage from "./pages/RegionPage";
import RegionPlatesPage from "./pages/RegionPlatesPage";
import OnboardingPage from "./pages/Onboarding";
import MePage from "./pages/MePage";
import { UserProvider } from "./context/UserContext";
import UserMapPage from "./pages/UserMapPage";
import RankingPage from "./pages/RankingPage";
import FriendsPage from "./pages/FriendsPage";
import GroupMapPage from "./pages/GroupMapPage";


export default function App() {
  return (
    <UserProvider>
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
        <Route path="/Onboarding" element={<OnboardingPage />} />
        <Route path="/me" element={<MePage />} />

        <Route path="/u/:username" element={<UserMapPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/group" element={<GroupMapPage />} />
      </Routes>
    </UserProvider>
  );
}

