import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useThemeEffect } from "./hooks/useThemeEffect";
import IntroSplash from "./components/IntroSplash";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import Stats from "./pages/Stats";
import Settings from "./pages/Settings";

export default function App() {
  useThemeEffect();
  const [introVisible, setIntroVisible] = useState(true);

  return (
    <BrowserRouter>
      {introVisible && <IntroSplash onFinish={() => setIntroVisible(false)} />}
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="map" element={<MapPage />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
