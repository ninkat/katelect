import { useState, useEffect } from 'react';
import styled from 'styled-components';
import RegionalPolls from './RegionalPolls';
import LatestPolling from './LatestPolling';

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
  const [region, setRegion] = useState<string>('federal');

  useEffect(() => {
    // extract region from URL hash
    const hash = window.location.hash;
    const regionMatch = hash.match(/#polls-(.+)/);
    if (regionMatch && regionMatch[1]) {
      setRegion(regionMatch[1]);
    }
  }, []);

  // listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const regionMatch = hash.match(/#polls-(.+)/);
      if (regionMatch && regionMatch[1]) {
        setRegion(regionMatch[1]);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // get the display name for the current region
  const regionDisplayName = regionDisplayNames[region] || 'Federal';

  return (
    <>
      <DataSection>
        <SectionTitle>Latest Polling Average: {regionDisplayName}</SectionTitle>
        <LatestPolling />
      </DataSection>
      <RegionalPolls />
    </>
  );
};

export default Polls;
