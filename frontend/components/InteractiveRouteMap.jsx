import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const routePoints = [
  {
    key: 'pickup',
    label: 'ホアンキエム湖',
    meta: '出発地',
    time: '18:30',
    position: [21.02878, 105.85204],
    type: 'pickup',
  },
  {
    key: 'turn-1',
    label: 'チャンティエン通り',
    meta: '直進 1.1 km',
    time: '+4分',
    position: [21.02482, 105.85672],
    type: 'waypoint',
  },
  {
    key: 'turn-2',
    label: 'キムマー通り',
    meta: '右折して 2.7 km 進む',
    time: '+8分',
    position: [21.03162, 105.82084],
    type: 'waypoint',
  },
  {
    key: 'destination',
    label: 'ロッテホテル ハノイ',
    meta: '目的地',
    time: '18:42',
    position: [21.03205, 105.81283],
    type: 'destination',
  },
];

const routeLine = [
  [21.02878, 105.85204],
  [21.02812, 105.85046],
  [21.02672, 105.84817],
  [21.02482, 105.85672],
  [21.02621, 105.84666],
  [21.02942, 105.83628],
  [21.03162, 105.82084],
  [21.03205, 105.81283],
];

const alternateRoute = [
  [21.02878, 105.85204],
  [21.03282, 105.84628],
  [21.03544, 105.83308],
  [21.03448, 105.82091],
  [21.03205, 105.81283],
];

const driverPosition = [21.03046, 105.82418];
const currentPosition = [21.02878, 105.85204];
const center = [21.0296, 105.8324];

function createMarkerIcon(type, label, active = false) {
  return L.divIcon({
    className: `leaflet-route-marker ${type} ${active ? 'active' : ''}`,
    html: `<span>${label}</span>`,
    iconSize: active ? [42, 42] : [34, 34],
    iconAnchor: active ? [21, 21] : [17, 17],
  });
}

function createDriverIcon(active = false) {
  return L.divIcon({
    className: `leaflet-route-driver ${active ? 'active' : ''}`,
    html: '<span>Taxi</span>',
    iconSize: active ? [66, 40] : [56, 34],
    iconAnchor: active ? [33, 20] : [28, 17],
  });
}

function createNearbyDriverIcon(active = false) {
  return L.divIcon({
    className: `leaflet-nearby-driver ${active ? 'active' : ''}`,
    html: '<span>Taxi</span>',
    iconSize: active ? [62, 38] : [52, 32],
    iconAnchor: active ? [31, 19] : [26, 16],
  });
}

function createCurrentLocationIcon() {
  return L.divIcon({
    className: 'leaflet-current-location',
    html: '<span><i></i></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function RouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    map.fitBounds(positions, { padding: [44, 44] });
  }, [map, positions]);

  return null;
}

function FixedMapView({ centerPosition, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(centerPosition, zoom, { animate: false });
  }, [centerPosition, map, zoom]);

  return null;
}

function MapInteractionLock({ disabled, scrollWheelZoom }) {
  const map = useMap();

  useEffect(() => {
    const handlers = [
      map.dragging,
      map.boxZoom,
      map.keyboard,
      map.touchZoom,
      map.tap,
    ].filter(Boolean);

    handlers.forEach((handler) => {
      if (disabled) {
        handler.disable();
      } else {
        handler.enable();
      }
    });

    if (map.scrollWheelZoom) {
      if (disabled || !scrollWheelZoom) {
        map.scrollWheelZoom.disable();
      } else {
        map.scrollWheelZoom.enable();
      }
    }
  }, [disabled, map, scrollWheelZoom]);

  return null;
}

function RouteControls({ currentLocationPosition, fitCurrentLocation, mapZoom, positions }) {
  const map = useMap();
  const handleFit = () => {
    if (fitCurrentLocation) {
      map.setView(currentLocationPosition, mapZoom, { animate: true });
      return;
    }

    map.fitBounds(positions, { padding: [44, 44] });
  };

  useEffect(() => {
    if (!fitCurrentLocation) return undefined;

    const originalFitBounds = map.fitBounds.bind(map);
    map.fitBounds = () => {
      map.setView(currentLocationPosition, mapZoom, { animate: true });
      return map;
    };

    return () => {
      map.fitBounds = originalFitBounds;
    };
  }, [currentLocationPosition, fitCurrentLocation, map, mapZoom]);

  return (
    <div className="route-map-controls leaflet-route-controls" aria-label="地図操作">
      <button type="button" aria-label="拡大" onClick={() => map.zoomIn()}>+</button>
      <button type="button" aria-label="縮小" onClick={() => map.zoomOut()}>-</button>
      <button type="button" aria-label="地図を戻す" onClick={() => map.fitBounds(positions, { padding: [44, 44] })}>Fit</button>
    </div>
  );
}

export default function InteractiveRouteMap({
  className = '',
  fitToRoute = true,
  interactive = true,
  route = routePoints,
  showCurrentLocation = false,
  showDriver = true,
  showRoute = true,
  showControls = true,
  showDetails = true,
  showMarkers = true,
  compact = false,
  mapCenter = center,
  mapZoom = 14,
  nearbyDrivers = [],
  driverLocation = null,
  currentLocation = null,
  centerOnCurrentLocation = false,
  routePath = routeLine,
  alternateRoutePath = alternateRoute,
  routeSummary = null,
  scrollWheelZoom = interactive,
  currentLocationLabel = 'Vị trí của bạn',
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [routeHovered, setRouteHovered] = useState(false);
  const [browserLocation, setBrowserLocation] = useState(currentPosition);
  const driverLocationPosition = driverLocation ?? driverPosition;
  const positions = useMemo(() => route.map((point) => point.position), [route]);
  const routeBoundsPositions = useMemo(
    () => {
      const basePositions = routePath?.length ? [...routePath, ...positions] : positions;
      return showDriver ? [...basePositions, driverLocationPosition] : basePositions;
    },
    [driverLocationPosition, positions, routePath, showDriver],
  );
  const currentLocationPosition = currentLocation ?? browserLocation;
  const displayedBoundsPositions = showCurrentLocation
    ? [...routeBoundsPositions, currentLocationPosition]
    : routeBoundsPositions;
  const fitControlPositions = displayedBoundsPositions.length
    ? displayedBoundsPositions
    : [
        [currentLocationPosition[0] - 0.002, currentLocationPosition[1] - 0.002],
        [currentLocationPosition[0] + 0.002, currentLocationPosition[1] + 0.002],
      ];
  const resolvedMapCenter = centerOnCurrentLocation ? currentLocationPosition : mapCenter;
  const isRouteHighlighted = routeHovered || hoveredPoint !== null;

  useEffect(() => {
    if (!showCurrentLocation || currentLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBrowserLocation([position.coords.latitude, position.coords.longitude]);
      },
      () => {
        setBrowserLocation(currentPosition);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 7000 },
    );
  }, [currentLocation, showCurrentLocation]);

  return (
    <div className={`interactive-route-map leaflet-route-map ${isRouteHighlighted ? 'route-highlighted' : ''} ${className}`} aria-label="ルートマップ">
      <MapContainer
        center={center}
        className="leaflet-map-canvas"
        zoom={14}
        zoomControl={false}
        scrollWheelZoom={scrollWheelZoom}
        wheelPxPerZoomLevel={80}
        dragging={interactive}
        keyboard={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {showRoute && (
          <>
            {alternateRoutePath?.length ? (
              <Polyline positions={alternateRoutePath} pathOptions={{ color: '#64748b', weight: 5, opacity: 0.52, dashArray: '8 9' }} />
            ) : null}
            {routePath?.length ? (
              <Polyline positions={routePath} pathOptions={{ color: '#2563eb', weight: isRouteHighlighted ? 14 : 8, opacity: isRouteHighlighted ? 0.34 : 0.24 }} />
            ) : null}
            <Polyline
              eventHandlers={{
                mouseover: () => setRouteHovered(true),
                mouseout: () => setRouteHovered(false),
              }}
              positions={routePath}
              pathOptions={{ color: isRouteHighlighted ? '#1d4ed8' : '#2563eb', weight: isRouteHighlighted ? 8 : 5, opacity: 0.95 }}
            />
          </>
        )}
        {showMarkers && route.map((point, index) => (
          <Marker
            eventHandlers={{
              mouseover: () => setHoveredPoint(point.key),
              mouseout: () => setHoveredPoint(null),
            }}
            icon={
              point.type === 'driver'
                ? createDriverIcon(hoveredPoint === point.key)
                : point.type === 'destination'
                ? createMarkerIcon('destination', 'B', hoveredPoint === point.key)
                : point.type === 'pickup' || index === 0
                  ? createMarkerIcon('pickup', 'A', hoveredPoint === point.key)
                  : createMarkerIcon('waypoint', '', hoveredPoint === point.key)
            }
            key={point.key}
            position={point.position}
          >
            <Tooltip direction="top" offset={[0, -15]} opacity={1} permanent={point.type !== 'waypoint'}>
              {point.label}
            </Tooltip>
          </Marker>
        ))}
        {showDriver && (
          <Marker
            eventHandlers={{
              mouseover: () => setHoveredPoint('driver'),
              mouseout: () => setHoveredPoint(null),
            }}
            icon={createDriverIcon(hoveredPoint === 'driver')}
            position={driverLocationPosition}
          >
            <Tooltip direction="top" offset={[0, -15]} opacity={1}>ドライバー位置</Tooltip>
          </Marker>
        )}
        {nearbyDrivers.map((driver) => {
          const driverKey = driver.driverId ?? driver.id ?? `${driver.position?.[0]}-${driver.position?.[1]}`;
          const label = driver.label || driver.name || '近くのタクシー';
          const distance = typeof driver.distanceKm === 'number' ? `${driver.distanceKm.toFixed(1)} km` : null;

          return (
            <Marker
              eventHandlers={{
                mouseover: () => setHoveredPoint(`nearby-${driverKey}`),
                mouseout: () => setHoveredPoint(null),
              }}
              icon={createNearbyDriverIcon(hoveredPoint === `nearby-${driverKey}`)}
              key={driverKey}
              position={driver.position}
            >
              <Tooltip direction="top" offset={[0, -15]} opacity={1}>
                {distance ? `${label} - ${distance}` : label}
              </Tooltip>
            </Marker>
          );
        })}
        {showCurrentLocation && (
          <Marker icon={createCurrentLocationIcon()} position={currentLocationPosition} title={currentLocationLabel}>
            <Tooltip direction="top" offset={[0, -13]} opacity={1}>{currentLocationLabel}</Tooltip>
          </Marker>
        )}
        {fitToRoute ? <RouteBounds positions={displayedBoundsPositions} /> : <FixedMapView centerPosition={resolvedMapCenter} zoom={mapZoom} />}
        <MapInteractionLock disabled={!interactive} scrollWheelZoom={scrollWheelZoom} />
        {showControls && (
          <RouteControls
            currentLocationPosition={currentLocationPosition}
            fitCurrentLocation={showCurrentLocation && !routeBoundsPositions.length}
            mapZoom={mapZoom}
            positions={fitControlPositions}
          />
        )}
      </MapContainer>

      {showDetails && (
        <aside className={`route-detail-panel ${compact ? 'compact' : ''}`}>
          <div className="route-detail-header">
            <span>ルート詳細</span>
            <strong>{routeSummary ?? '4.8 km - 12分'}</strong>
          </div>
          <ol className="route-detail-list">
            {route.map((point, index) => (
              <li
                className={`${point.type} ${hoveredPoint === point.key ? 'active' : ''}`}
                key={point.key}
                onMouseEnter={() => setHoveredPoint(point.key)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <span>{point.type === 'destination' ? 'B' : index === 0 ? 'A' : index}</span>
                <div>
                  <strong>{point.label}</strong>
                  <small>{point.meta}</small>
                </div>
                <em>{point.time}</em>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </div>
  );
}
