import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
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
import SerialCollectionPage from "./pages/SerialCollectionPage";
import AppFooter from "./components/AppFooter";
import WelcomeSplash from "./components/WelcomeSplash";
import { useUser } from "./context/UserContext";
import BootGate from "./components/BootGate";
import { PlatePeekProvider } from "./context/PlatePeekContext";
import WaveBackground from "./components/WaveBackground";
import { useEffect } from "react";
import { applyThemeFromPref, getThemePref } from "./lib/themePref";


export default function App() {
  return (
    <UserProvider>
      <PlatePeekProvider>

        {/* 🌊 波アニメ背景（全ページ共通・最背面） */}
        <WaveBackground />

        {/* アプリ本体（波より前面） */}
        <div className="app-root">
          <AppInner />
        </div>

      </PlatePeekProvider>
    </UserProvider>
  );
}


function AppInner() {
  const { authChecking } = useUser();
   useEffect(() => {
    // 初回適用
    applyThemeFromPref();

    // autoの時だけ定期更新（1時間ごと）
    const id = window.setInterval(() => {
      if (getThemePref() === "auto") applyThemeFromPref();
    }, 60 * 60 * 1000);

    return () => clearInterval(id);
  }, []);

  return (

    <BootGate minimumMs={5000} ready={!authChecking}>
      {/* ここに Routes / Layout / ProtectedRoute 等 */}
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route path="/regions" element={<RegionListPage />} />
            <Route path="/region/:regionId" element={<RegionPage />} />
            <Route path="/region/:regionId/plates" element={<RegionPlatesPage />} />

            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route
              path="/me"
              element={
                <ProtectedRoute>
                  <MePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/collection"
              element={
                <ProtectedRoute>
                  <SerialCollectionPage />
                </ProtectedRoute>
              }
            />

            <Route path="/u/:username" element={<UserMapPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/friends" element={<FriendsPage />} />

            <Route
              path="/group"
              element={
                <ProtectedRoute>
                  <GroupMapPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>

        {/* ✅ 全ページ共通フッター */}
        <AppFooter />
      </div>
    </BootGate>
  );
}