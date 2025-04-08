import { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import RegionalPolls from './RegionalPolls';
import LatestPolling from './LatestPolling';
import { LatestPollingData } from '../types/polling';

const DataSection = styled.section`
  margin: 0.25rem 0 0.5rem 0;
  width: 100%;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  padding: 1rem;
  overflow: hidden;
`;

const SectionTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 2rem;
  color: #333333;
  margin-bottom: 0.25rem;
`;

// map of region codes to display names
const regionDisplayNames: Record<string, string> = {
  federal: 'Federal',
  alberta: 'Alberta',
  atlantic: 'Atlantic Canada',
  bc: 'British Columbia',
  ontario: 'Ontario',
  prairies: 'Manitoba and Saskatchewan',
  quebec: 'Quebec',
};

const Polls = () => {
  // Initialize region as null initially to indicate it's not yet determined
  const [region, setRegion] = useState<string | null>(null);
  const [latestData, setLatestData] = useState<LatestPollingData | null>(null);
  const [validRegions, setValidRegions] = useState<string[]>([]);
  const [loadingLatest, setLoadingLatest] = useState<boolean>(true);
  const [errorLatest, setErrorLatest] = useState<string | null>(null);
  // Add state to track if valid regions have been loaded
  const [regionsLoaded, setRegionsLoaded] = useState<boolean>(false);

  // Fetch valid regions on mount
  useEffect(() => {
    let isMounted = true;
    const fetchValidRegions = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/regions');
        if (!response.ok) {
          throw new Error('Failed to fetch valid regions');
        }
        const regionsData: string[] = await response.json();
        if (isMounted) {
          setValidRegions(regionsData);
          setRegionsLoaded(true); // Mark regions as loaded
        }
      } catch (err) {
        console.error('Error fetching valid regions:', err);
        if (isMounted) {
          setRegionsLoaded(true); // Still mark as loaded even on error, to allow processing
        }
      }
    };
    fetchValidRegions();
    return () => {
      isMounted = false;
    }; // Cleanup flag
  }, []);

  // Use useCallback for the update logic to prevent recreating it unnecessarily
  const updateRegionFromHash = useCallback(() => {
    if (!regionsLoaded) return;

    const hash = window.location.hash;
    const regionMatch = hash.match(/#polls-(.+)/);
    const extractedRegion = regionMatch?.[1] || 'federal';

    let newRegion = 'federal';
    if (validRegions.includes(extractedRegion)) {
      newRegion = extractedRegion;
    } else {
      console.warn(
        `Unknown or invalid region: ${extractedRegion}, falling back to federal`
      );
    }

    setRegion(newRegion);
  }, [regionsLoaded, validRegions]);

  // Effect to set initial region once regions are loaded
  useEffect(() => {
    updateRegionFromHash();
  }, [updateRegionFromHash]); // Run when the callback updates (due to dependencies changing)

  // Effect to listen for hash changes
  useEffect(() => {
    // Only add listener if regions are loaded
    if (!regionsLoaded) return;

    window.addEventListener('hashchange', updateRegionFromHash);
    return () => window.removeEventListener('hashchange', updateRegionFromHash);
  }, [regionsLoaded, updateRegionFromHash]); // Add/remove listener based on loaded status and callback instance

  // Fetch latest data when region changes (and is not null)
  useEffect(() => {
    // Only fetch if region is determined (not null)
    if (!region) return;

    let isMounted = true;
    const fetchLatestData = async () => {
      setLoadingLatest(true);
      setErrorLatest(null);
      setLatestData(null);
      try {
        const response = await fetch(
          `http://localhost:8000/api/latest/${region}`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch latest data: ${response.statusText} (Region: ${region})`
          );
        }
        const data: LatestPollingData = await response.json();
        if (isMounted) {
          setLatestData(data);
        }
      } catch (err) {
        if (isMounted) {
          setErrorLatest(
            err instanceof Error ? err.message : 'An unknown error occurred'
          );
        }
        console.error('Error fetching latest polling data:', err);
      } finally {
        if (isMounted) {
          setLoadingLatest(false);
        }
      }
    };

    fetchLatestData();
    return () => {
      isMounted = false;
    }; // Cleanup flag
  }, [region]);

  // Get display name, handle null region state
  const regionDisplayName = region
    ? regionDisplayNames[region] || 'Federal'
    : 'Loading...';

  // Display loading state until region is determined
  if (!region) {
    return <div>Loading region...</div>; // Or a proper loading spinner/component
  }

  return (
    <>
      <DataSection>
        <SectionTitle>Latest Polling Average: {regionDisplayName}</SectionTitle>
        {loadingLatest && <div>Loading average...</div>}
        {errorLatest && <div>Error loading average: {errorLatest}</div>}
        {!loadingLatest && !errorLatest && (
          <LatestPolling region={region} latestData={latestData} />
        )}
      </DataSection>
      {/* Pass the determined region to RegionalPolls */}
      <RegionalPolls region={region} />
    </>
  );
};

export default Polls;
