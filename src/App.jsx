import RouteTree from './routes/RouteTree.jsx';
import HudOverlay from './components/HudOverlay/HudOverlay.jsx';
import AudioControls from './components/AudioControls/AudioControls.jsx';
import BgmController from './audio/BgmController.jsx';
import './App.css';

export default function App() {
  return (
    <div className="app-stage">
      <RouteTree />
      <HudOverlay />
      <AudioControls />
      <BgmController />
    </div>
  );
}
