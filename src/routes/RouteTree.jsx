import { Routes, Route, Navigate } from 'react-router-dom';
import TitlePage from './TitlePage/TitlePage.jsx';
import HubPage from './HubPage/HubPage.jsx';
import StagePage from './StagePage/StagePage.jsx';
import EndingPage from './EndingPage/EndingPage.jsx';
import RankingPage from './RankingPage/RankingPage.jsx';

export default function RouteTree() {
  return (
    <Routes>
      <Route path="/"          element={<TitlePage />} />
      <Route path="/hub"       element={<HubPage />} />
      <Route path="/stage/:id" element={<StagePage />} />
      <Route path="/ending/alive"      element={<EndingPage outcome="alive" />} />
      <Route path="/ending/silhouette" element={<EndingPage outcome="silhouette" />} />
      <Route path="/ranking"           element={<RankingPage />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  );
}
