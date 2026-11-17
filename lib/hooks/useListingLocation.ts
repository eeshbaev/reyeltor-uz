import { useCallback } from 'react';
import { findDistrictAtPoint, getDistrictCenter } from '@/lib/map/districtBoundaries';
import {
  isExactLocationSuggestion,
  type LocationSuggestion,
} from '@/lib/map/locationSuggestions';

interface UseListingLocationActionsOptions {
  lat: number;
  lng: number;
  setPin: (lat: number, lng: number, addressLabel?: string | null) => void;
  setDistrict: (district: string) => void;
  setLocationQuery: (query: string) => void;
  setPinExact: (exact: boolean) => void;
  setSelectedSuggestionId: (id: string | null) => void;
  updateFormCoords: (lat: number, lng: number, district?: string) => void;
}

export function useListingLocationActions({
  lat,
  lng,
  setPin,
  setDistrict,
  setLocationQuery,
  setPinExact,
  setSelectedSuggestionId,
  updateFormCoords,
}: UseListingLocationActionsOptions) {
  const applyExactCoords = useCallback(
    (nextLat: number, nextLng: number, label: string, suggestionId?: string) => {
      setPinExact(true);
      setPin(nextLat, nextLng, label);
      setLocationQuery(label);
      setSelectedSuggestionId(suggestionId ?? null);
      const detected = findDistrictAtPoint(nextLng, nextLat);
      if (detected) {
        setDistrict(detected);
        updateFormCoords(nextLat, nextLng, detected);
      } else {
        updateFormCoords(nextLat, nextLng);
      }
    },
    [setDistrict, setLocationQuery, setPin, setPinExact, setSelectedSuggestionId, updateFormCoords],
  );

  const applyDistrictCenter = useCallback(
    (districtName: string, suggestionId?: string) => {
      const center = getDistrictCenter(districtName);
      setDistrict(districtName);
      setLocationQuery(districtName);
      setSelectedSuggestionId(suggestionId ?? `district-${districtName}`);
      setPinExact(false);
      if (center) {
        setPin(center.lat, center.lng, null);
        updateFormCoords(center.lat, center.lng, districtName);
      } else {
        setPin(lat, lng, null);
        updateFormCoords(lat, lng, districtName);
      }
    },
    [lat, lng, setDistrict, setLocationQuery, setPin, setPinExact, setSelectedSuggestionId, updateFormCoords],
  );

  const selectSuggestion = useCallback(
    (suggestion: LocationSuggestion) => {
      if (isExactLocationSuggestion(suggestion)) {
        applyExactCoords(suggestion.lat, suggestion.lng, suggestion.label, suggestion.id);
        return;
      }
      if (suggestion.district) {
        applyDistrictCenter(suggestion.district, suggestion.id);
      }
    },
    [applyDistrictCenter, applyExactCoords],
  );

  const selectDistrictChip = useCallback(
    (districtName: string) => {
      applyDistrictCenter(districtName);
    },
    [applyDistrictCenter],
  );

  return {
    selectSuggestion,
    selectDistrictChip,
    applyExactCoords,
  };
}
