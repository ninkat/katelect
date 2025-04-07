import { useState, useEffect } from 'react';
import styled from 'styled-components';
import PollingChart from './PollingChart';
import PollingTable from './PollingTable';
import { Poll } from './PollingData';

// styled components for the regional polls
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

const LoadingMessage = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #666666;
  text-align: center;
  padding: 2rem;
`;

// map of region codes to file names
const regionFileMap: Record<string, string> = {
  federal: 'polls_federal.json',
  alberta: 'polls_ab.json',
  atlantic: 'polls_atl.json',
  bc: 'polls_bc.json',
  ontario: 'polls_on.json',
  prairies: 'polls_pr.json',
  quebec: 'polls_qc.json',
};

// map of region codes to display names
const regionDisplayMap: Record<string, string> = {
  federal: 'Federal',
  alberta: 'Alberta',
  atlantic: 'Atlantic Canada',
  bc: 'British Columbia',
  ontario: 'Ontario',
  prairies: 'Prairies (MB + SK)',
  quebec: 'Quebec',
};

// function to convert JSON data to Poll interface
const convertToPollFormat = (
  jsonData: Record<string, string | number>[]
): Poll[] => {
  return jsonData.map((item, index) => {
    // handle different field names for pollster
    const pollster = item['Polling Firm'] || item['Firm'] || 'Unknown';

    // handle sample size - some regions might not have this field
    let sampleSize = 0;
    if (item['Sample']) {
      // remove commas and convert to number
      sampleSize = parseInt(item['Sample'].toString().replace(/,/g, ''), 10);
    }

    // handle different field names for parties
    const liberal = parseInt(item['LPC']?.toString() || '0', 10);
    const conservative = parseInt(item['CPC']?.toString() || '0', 10);
    const ndp = parseInt(item['NDP']?.toString() || '0', 10);
    const bloc = parseInt(item['BQ']?.toString() || '0', 10);
    const green = parseInt(item['GPC']?.toString() || '0', 10);
    const ppc = parseInt(item['PPC']?.toString() || '0', 10);

    // calculate other percentage if not provided
    const total = liberal + conservative + ndp + bloc + green + ppc;
    const other = Math.max(0, 100 - total);

    // handle missing date or leader
    const date = item['Date (middle)']?.toString() || '';
    const lead = item['Leader']?.toString() || '';

    return {
      id: index + 1,
      date,
      pollster,
      sampleSize,
      liberal,
      conservative,
      ndp,
      bloc,
      green,
      ppc,
      other,
      lead,
    };
  });
};

const RegionalPolls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<string>('federal');

  useEffect(() => {
    // extract region from URL hash
    const hash = window.location.hash;
    const regionMatch = hash.match(/#polls-(.+)/);
    if (regionMatch && regionMatch[1]) {
      const extractedRegion = regionMatch[1];
      // validate that the region exists in our map
      if (regionFileMap[extractedRegion]) {
        setRegion(extractedRegion);
      } else {
        // fallback to federal if region is not found
        setRegion('federal');
        console.warn(
          `Unknown region: ${extractedRegion}, falling back to federal`
        );
      }
    }
  }, []);

  // listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const regionMatch = hash.match(/#polls-(.+)/);
      if (regionMatch && regionMatch[1]) {
        const extractedRegion = regionMatch[1];
        // validate that the region exists in our map
        if (regionFileMap[extractedRegion]) {
          setRegion(extractedRegion);
        } else {
          // fallback to federal if region is not found
          setRegion('federal');
          console.warn(
            `Unknown region: ${extractedRegion}, falling back to federal`
          );
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const fetchPolls = async () => {
      setLoading(true);
      setError(null);

      try {
        const fileName = regionFileMap[region] || 'polls_federal.json';
        const response = await fetch(`/polls/${fileName}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch polling data: ${response.statusText}`
          );
        }

        const data = await response.json();

        // validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format: expected an array');
        }

        // validate that data is not empty
        if (data.length === 0) {
          throw new Error('No polling data available for this region');
        }

        const convertedData = convertToPollFormat(data);
        setPolls(convertedData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
        console.error('Error fetching polling data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, [region]);

  if (loading) {
    return <LoadingMessage>Loading polling data...</LoadingMessage>;
  }

  if (error) {
    return <LoadingMessage>Error: {error}</LoadingMessage>;
  }

  return (
    <>
      <DataSection>
        <SectionTitle>
          {regionDisplayMap[region] || 'Federal'} Polling
        </SectionTitle>
        <PollingChart
          polls={polls}
          region={region}
          showBloc={region === 'quebec' || region === 'federal'}
        />
      </DataSection>

      <DataSection>
        <SectionTitle>Individual Polls</SectionTitle>
        <PollingTable
          polls={polls}
          showBloc={region === 'quebec' || region === 'federal'}
        />
      </DataSection>
    </>
  );
};

export default RegionalPolls;
