// src/components/TenSecondsGame/BackgroundElements.jsx

export function Clouds() {
  return (
    <div className="sky-layer" aria-hidden="true">
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />
      <div className="cloud cloud-5" />
    </div>
  );
}

export function FarBg() {
  return (
    <div className="farbg-layer" aria-hidden="true">
      <div className="hill hill-1" />
      <div className="hill hill-2" />
      <div className="hill hill-3" />
      <div className="far-tree far-tree-1">
        <div className="far-canopy far-canopy-md" />
        <div className="far-trunk" />
      </div>
      <div className="far-tree far-tree-2">
        <div className="far-canopy far-canopy-lg" />
        <div className="far-trunk" />
      </div>
      <div className="far-tree far-tree-3">
        <div className="far-canopy far-canopy-md" />
        <div className="far-trunk" />
      </div>
      <div className="far-tree far-tree-4">
        <div className="far-canopy far-canopy-sm" />
        <div className="far-trunk" />
      </div>
    </div>
  );
}

export function Trees() {
  return (
    <div className="tree-layer" aria-hidden="true">
      {/* ── Big Oak Left ── */}
      <div className="oak oak-left">
        <div className="oak-shadow" />
        <div className="oak-blob oak-blob-tl" />
        <div className="oak-blob oak-blob-tr" />
        <div className="oak-blob oak-blob-bl" />
        <div className="oak-blob oak-blob-br" />
        <div className="oak-blob oak-blob-top" />
        <div className="oak-blob oak-blob-center" />
        <div className="oak-trunk">
          <div className="oak-trunk-knot oak-trunk-knot-1" />
          <div className="oak-trunk-knot oak-trunk-knot-2" />
        </div>
        <div className="oak-root oak-root-l" />
        <div className="oak-root oak-root-r" />
      </div>

      {/* ── Skinny Pine Left-Center ── */}
      <div className="pine pine-lc">
        <div className="pine-tier pine-tier-1" />
        <div className="pine-tier pine-tier-2" />
        <div className="pine-tier pine-tier-3" />
        <div className="pine-tier pine-tier-4" />
        <div className="pine-trunk" />
      </div>

      {/* ── Big Oak Right ── */}
      <div className="oak oak-right">
        <div className="oak-shadow" />
        <div className="oak-blob oak-blob-tl" />
        <div className="oak-blob oak-blob-tr" />
        <div className="oak-blob oak-blob-bl" />
        <div className="oak-blob oak-blob-br" />
        <div className="oak-blob oak-blob-top" />
        <div className="oak-blob oak-blob-center" />
        <div className="oak-trunk">
          <div className="oak-trunk-knot oak-trunk-knot-1" />
        </div>
        <div className="oak-root oak-root-l" />
        <div className="oak-root oak-root-r" />
      </div>

      {/* ── Small Pine Far Right ── */}
      <div className="pine pine-fr">
        <div className="pine-tier pine-tier-1" />
        <div className="pine-tier pine-tier-2" />
        <div className="pine-tier pine-tier-3" />
        <div className="pine-trunk" />
      </div>

      {/* ── Ground bushes & tufts ── */}
      <div className="veg-layer">
        <div className="bush2 bush2-a" />
        <div className="bush2 bush2-b" />
        <div className="bush2 bush2-c" />
        <div className="bush2 bush2-d" />
        <div className="bush2 bush2-e" />
        <div className="grass-tuft tuft-1" />
        <div className="grass-tuft tuft-2" />
        <div className="grass-tuft tuft-3" />
        <div className="grass-tuft tuft-4" />
        <div className="grass-tuft tuft-5" />
        <div className="grass-tuft tuft-6" />
        <div className="flower flower-1" />
        <div className="flower flower-2" />
        <div className="flower flower-3" />
      </div>
    </div>
  );
}