import { Routes, Route, Navigate } from 'react-router-dom';
import TitlePage from './TitlePage/TitlePage.jsx';
import OpeningPage from './OpeningPage/OpeningPage.jsx';
import HubPage from './HubPage/HubPage.jsx';
import StagePage from './StagePage/StagePage.jsx';
import EndingPage from './EndingPage/EndingPage.jsx';
import RankingPage from './RankingPage/RankingPage.jsx';

export default function RouteTree() {
  return (
    <Routes>
      <Route path="/"          element={<TitlePage />} />
      <Route path="/opening"   element={<OpeningPage />} />
      <Route path="/hub"       element={<HubPage />} />
      <Route path="/stage/:id" element={<StagePage />} />
      <Route path="/ending"    element={<EndingPage />} />
      <Route path="/ranking"   element={<RankingPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
