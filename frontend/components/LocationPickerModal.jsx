import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import Modal from './Modal.jsx';
import InteractiveRouteMap from './InteractiveRouteMap.jsx';
import { geocodePlaces, reverseGeocode } from '../api/maps.js';
import { normalizePlace } from '../utils/place.js';
import { getCurrentPosition } from '../utils/routePlanner.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

export default function LocationPickerModal({ open, title, initialPosition, onClose, onSelect }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');
  const [currentMapCenter, setCurrentMapCenter] = useState(initialPosition || [21.0285, 105.8542]); // Default Hanoi
  const [selectedPlace, setSelectedPlace] = useState(null);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSuggestions([]);
      setStatus('');
      if (initialPosition && initialPosition[0] && initialPosition[1]) {
        setCurrentMapCenter(initialPosition);
        reverseGeocode(initialPosition[0], initialPosition[1])
          .then((place) => {
            const normalized = normalizePlace(place);
            if (normalized) {
              setSelectedPlace({
                ...normalized,
                position: initialPosition,
              });
            }
          })
          .catch(() => {});
      } else {
        setSelectedPlace(null);
      }
    }
  }, [open, initialPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const text = query.trim();
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setSuggestions([]);
      return undefined;
    }
    if (text.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      geocodePlaces(text, { signal: controller.signal })
        .then((items) => {
          const next = items.map(normalizePlace).filter(Boolean);
          setSuggestions(next);
          setStatus(next.length ? '' : t('location.noMatch'));
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setSuggestions([]);
            setStatus(t('location.searchFailed'));
          }
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, t]);

  function handleSelectSuggestion(place) {
    skipNextSearchRef.current = true;
    setQuery('');
    setSuggestions([]);
    setCurrentMapCenter(place.position);
    setSelectedPlace(place);
  }

  async function handleMapClick(latlng) {
    const position = [latlng.lat, latlng.lng];
    setCurrentMapCenter(position);
    try {
      const place = await reverseGeocode(latlng.lat, latlng.lng);
      const normalized = normalizePlace(place);
      if (normalized) {
        setSelectedPlace({
          ...normalized,
          position,
        });
      } else {
        setSelectedPlace({
          name: t('location.currentName'),
          address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
          position,
        });
      }
    } catch {
      setSelectedPlace({
        name: t('location.currentName'),
        address: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
        position,
      });
    }
  }

  async function useCurrentLocation() {
    setStatus('');
    try {
      const pos = await getCurrentPosition();
      const position = [pos.latitude, pos.longitude];
      setCurrentMapCenter(position);
      try {
        const place = await reverseGeocode(pos.latitude, pos.longitude);
        const normalized = normalizePlace(place);
        if (normalized) {
          setSelectedPlace({
            ...normalized,
            position,
          });
        }
      } catch {
        setSelectedPlace({
          id: 'current',
          name: t('location.currentName'),
          address: `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
          position,
        });
      }
    } catch {
      setStatus(t('location.positionUnavailable'));
    }
  }

  function handleConfirm() {
    if (selectedPlace) {
      onSelect(selectedPlace);
      onClose();
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose} className="location-picker-modal">
      <div className="location-picker-content">
        <div className="location-picker-search-container">
          <div className="location-picker-search-input-wrapper">
            <Search className="location-picker-search-icon" size={18} />
            <input
              className="location-picker-search-input"
              autoComplete="off"
              placeholder={t('location.destinationPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="location-picker-current-btn" type="button" onClick={useCurrentLocation} aria-label={t('map.currentLocation')}>
            📍
          </button>
          
          {suggestions.length > 0 && (
            <div className="location-picker-suggestions">
              {suggestions.map((place) => (
                <button
                  key={place.id}
                  className="location-picker-suggestion-item"
                  onClick={() => handleSelectSuggestion(place)}
                  type="button"
                >
                  <strong>{place.name}</strong>
                  <small>{place.address}</small>
                </button>
              ))}
            </div>
          )}
          {status && <div className="location-picker-status">{status}</div>}
        </div>

        <div className="location-picker-map-wrapper">
          <InteractiveRouteMap
            interactive
            mapCenter={currentMapCenter}
            mapZoom={16}
            showControls={false}
            showDriver={false}
            showDetails={false}
            route={
              selectedPlace ? [{
                key: 'selected',
                label: selectedPlace.name,
                meta: selectedPlace.address,
                position: selectedPlace.position,
                type: 'destination',
              }] : []
            }
            onMapClick={handleMapClick}
          />
        </div>

        <div className="location-picker-footer">
          <div className="location-picker-selected-address">
            {selectedPlace ? selectedPlace.address || selectedPlace.name : t('location.selectDestination')}
          </div>
          <button
            className="submit-button"
            type="button"
            disabled={!selectedPlace}
            onClick={handleConfirm}
          >
            {t('common.select')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
