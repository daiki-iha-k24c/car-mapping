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
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* 既存 */}
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
          } />
        <Route path="/regions" element={<RegionListPage />} />

        {/* 追加 */}
        <Route path="/region/:regionId" element={<RegionPage />} />
        <Route
          path="/region/:regionId/plates"
          element={<RegionPlatesPage />}
        />

        {/* フォールバック */}
        <Route path="/Onboarding" element={<OnboardingPage />} />
        <Route path="/me" element={
          <ProtectedRoute>
            <MePage />
          </ProtectedRoute>
          } />

        <Route path="/u/:username" element={<UserMapPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/group" element={
          <ProtectedRoute>
            <GroupMapPage />
          </ProtectedRoute>
          } />
         <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
}

