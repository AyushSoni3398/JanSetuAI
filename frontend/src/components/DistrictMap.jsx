import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

// Leaflet measures its container once, on init. Inside a CSS grid the
// container has not reached its final width at that moment, so the map
// computes too few tiles and paints only a block in the middle.
// invalidateSize() re-measures; the observer also covers window resizes.
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

// Priority bands. Deliberately only three colours: a continuous gradient looks
// precise but the score is a comparative ranking, not a measurement, so coarse
// bands are the honest encoding.
export function scoreColor(score) {
  if (score >= 70) return "#ef4444"; // red - urgent
  if (score >= 40) return "#f59e0b"; // amber - watch
  return "#22c55e"; // green - served
}

// Radius encodes the same score as colour, so the eye picks out hotspots
// without having to read the legend.
function scoreRadius(score) {
  return 8 + (score / 100) * 20;
}

export default function DistrictMap({ priorities, selectedId, onSelect }) {
  if (!priorities.length) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm text-slate-400">
        No district data
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <MapContainer
        center={[22.5, 80.0]}
        zoom={5}
        // The map sits inside a scrolling page: wheel-zoom would swallow
        // the page scroll whenever the cursor crossed it. Zoom via the
        // +/- control or double-click instead.
        scrollWheelZoom={false}
        style={{ height: "420px", width: "100%", background: "#0f172a" }}
      >
        <ResizeFix />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {priorities.map((p) => {
          const selected = p.district.id === selectedId;
          return (
            <CircleMarker
              key={p.district.id}
              center={[p.district.latitude, p.district.longitude]}
              radius={scoreRadius(p.priority_score)}
              pathOptions={{
                color: selected ? "#ffffff" : scoreColor(p.priority_score),
                weight: selected ? 3 : 1,
                fillColor: scoreColor(p.priority_score),
                fillOpacity: 0.55,
              }}
              eventHandlers={{ click: () => onSelect(p.district.id) }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <div className="text-xs">
                  <div className="font-semibold">
                    #{p.rank} {p.district.name}
                  </div>
                  <div>{p.district.state}</div>
                  <div>
                    Priority {p.priority_score} &middot; {p.complaint_count} issues
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="flex items-center gap-4 border-t border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400">
        <span className="font-medium text-slate-300">Priority</span>
        {[
          ["#ef4444", "70+ urgent"],
          ["#f59e0b", "40-69 watch"],
          ["#22c55e", "under 40"],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto">Circle size also scales with priority</span>
      </div>
    </div>
  );
}
