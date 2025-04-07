import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Poll } from './PollingData';
import { partyColors } from './PartyColors';
import styled from 'styled-components';

// Import headshots
import carneyImg from '/src/assets/headshots/carney.jpg';
import poilievreImg from '/src/assets/headshots/poilievre.jpg';
import singhImg from '/src/assets/headshots/singh.jpg';
import blanchetImg from '/src/assets/headshots/blanchet.jpg';
import pedneaultImg from '/src/assets/headshots/pedneault.jpg';
import bernierImg from '/src/assets/headshots/bernier.jpg';

interface PartyData {
  name: string;
  leader: string;
  polling: number;
  change: number | null;
  color: string;
  headshot: string;
}

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

// function to calculate exponentially weighted moving average
const calculateEWMA = (
  data: Poll[],
  party: keyof Poll,
  smoothingFactor: number = 0.25
): number[] => {
  if (data.length === 0) return [];

  // sort data by date to ensure chronological order
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // initialize result array with the first value
  const result: number[] = [sortedData[0][party] as number];

  // calculate ewma for each subsequent data point
  for (let i = 1; i < sortedData.length; i++) {
    const currentValue = sortedData[i][party] as number;
    const previousEWMA = result[i - 1];
    const newEWMA =
      previousEWMA + smoothingFactor * (currentValue - previousEWMA);
    result.push(newEWMA);
  }

  return result;
};

// function to normalize vote share to 100%
const normalizeVoteShare = (partyData: PartyData[]): PartyData[] => {
  const total = partyData.reduce((sum, party) => sum + party.polling, 0);

  if (total === 0) return partyData;

  return partyData.map((party) => ({
    ...party,
    polling: (party.polling / total) * 100,
  }));
};

// styled component for the container
const ChartContainer = styled.div<{ numParties: number }>`
  width: 100%;
  height: ${(props) => props.numParties * 60}px;
`;

const LatestPolling = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyData, setPartyData] = useState<PartyData[]>([]);
  const [region, setRegion] = useState<string>('federal');

  // extract region from URL hash
  useEffect(() => {
    const extractRegion = () => {
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

    extractRegion();

    // listen for hash changes
    const handleHashChange = () => {
      extractRegion();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // fetch polling data
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

        // convert JSON data to Poll interface
        const convertedData = data.map(
          (item: Record<string, string | number>, index: number) => {
            // handle different field names for pollster
            const pollster = (
              item['Polling Firm'] ||
              item['Firm'] ||
              'Unknown'
            ).toString();

            // handle sample size - some regions might not have this field
            let sampleSize = 0;
            if (item['Sample']) {
              // remove commas and convert to number
              sampleSize = parseInt(
                item['Sample'].toString().replace(/,/g, ''),
                10
              );
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
          }
        );

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

  // calculate latest polling data
  useEffect(() => {
    if (polls.length === 0) return;

    // sort polls by date (newest first)
    const sortedPolls = [...polls].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // get the most recent poll for change calculation
    const mostRecentPoll = sortedPolls[0];
    const secondMostRecentPoll = sortedPolls[1];

    // calculate EWMA for each party
    const smoothingFactor = 0.25;
    const parties: (keyof Poll)[] = [
      'liberal',
      'conservative',
      'ndp',
      'bloc',
      'green',
      'ppc',
      'other',
    ];

    // create a map to store the latest EWMA values
    const latestEWMA: Record<string, number> = {};

    // calculate EWMA for each party
    parties.forEach((party) => {
      const ewmaValues = calculateEWMA(polls, party, smoothingFactor);
      if (ewmaValues.length > 0) {
        latestEWMA[party] = ewmaValues[ewmaValues.length - 1];
      }
    });

    // determine which parties to show based on region
    const showBloc = region === 'quebec' || region === 'federal';

    // create party data with the latest EWMA values
    const newPartyData: PartyData[] = [
      {
        name: 'Liberal',
        leader: 'Mark Carney',
        polling: latestEWMA.liberal || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.liberal - secondMostRecentPoll.liberal
          : null,
        color: partyColors.liberal,
        headshot: carneyImg,
      },
      {
        name: 'Conservative',
        leader: 'Pierre Poilievre',
        polling: latestEWMA.conservative || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.conservative - secondMostRecentPoll.conservative
          : null,
        color: partyColors.conservative,
        headshot: poilievreImg,
      },
      {
        name: 'New Democrat',
        leader: 'Jagmeet Singh',
        polling: latestEWMA.ndp || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.ndp - secondMostRecentPoll.ndp
          : null,
        color: partyColors.ndp,
        headshot: singhImg,
      },
      {
        name: 'Bloc Québécois',
        leader: 'Yves-François Blanchet',
        polling: latestEWMA.bloc || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.bloc - secondMostRecentPoll.bloc
          : null,
        color: partyColors.bloc,
        headshot: blanchetImg,
      },
      {
        name: 'Green',
        leader: 'Jonathan Pedneault',
        polling: latestEWMA.green || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.green - secondMostRecentPoll.green
          : null,
        color: partyColors.green,
        headshot: pedneaultImg,
      },
      {
        name: "People's Party",
        leader: 'Maxime Bernier',
        polling: latestEWMA.ppc || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.ppc - secondMostRecentPoll.ppc
          : null,
        color: partyColors.ppc,
        headshot: bernierImg,
      },
      {
        name: 'Other',
        leader: '',
        polling: latestEWMA.other || 0,
        change: secondMostRecentPoll
          ? mostRecentPoll.other - secondMostRecentPoll.other
          : null,
        color: partyColors.other,
        headshot: '',
      },
    ];

    // filter out Bloc Québécois if not showing for this region
    const filteredPartyData = showBloc
      ? newPartyData
      : newPartyData.filter((party) => party.name !== 'Bloc Québécois');

    // normalize vote share to 100% and sort by polling numbers
    const normalizedPartyData = normalizeVoteShare(filteredPartyData).sort(
      (a, b) => b.polling - a.polling
    );
    setPartyData(normalizedPartyData);
  }, [polls, region]);

  useEffect(() => {
    if (!svgRef.current || partyData.length === 0) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const width = 800 - margin.left - margin.right;
    // calculate height based on number of parties
    const barHeight = 60;
    const totalHeight = partyData.length * barHeight;
    const height = totalHeight - margin.top - margin.bottom;
    const imageSize = 50;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a mask for circular images
    const defs = svg.append('defs');
    const mask = defs.append('mask').attr('id', 'circle-mask');

    mask
      .append('circle')
      .attr('cx', imageSize / 2)
      .attr('cy', imageSize / 2)
      .attr('r', imageSize / 2)
      .attr('fill', 'white');

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([0, width - 200]);

    const yScale = d3
      .scaleBand()
      .domain(partyData.map((d) => d.name))
      .range([0, partyData.length * barHeight])
      .padding(0.3);

    // Add party rows
    const partyRows = svg
      .selectAll('.party-row')
      .data(partyData)
      .enter()
      .append('g')
      .attr('class', 'party-row')
      .attr('transform', (d) => `translate(0,${yScale(d.name)})`);

    // Add profile images container
    const imageGroups = partyRows
      .append('g')
      .attr('transform', () => `translate(0,${barHeight / 2 - imageSize / 2})`);

    // Add circle background for the "Other" category
    imageGroups
      .filter(function (d: PartyData): boolean {
        return !d.headshot && d.name !== 'Other';
      })
      .append('circle')
      .attr('cx', imageSize / 2)
      .attr('cy', imageSize / 2)
      .attr('r', imageSize / 2)
      .attr('fill', '#e0e0e0');

    // Add headshot images for parties with leaders
    imageGroups
      .filter(function (d: PartyData): boolean {
        return !!d.headshot;
      })
      .append('image')
      .attr('mask', 'url(#circle-mask)')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', imageSize)
      .attr('height', imageSize)
      .attr('href', (d) => d.headshot);

    // Add party names and leaders
    partyRows
      .append('text')
      .attr('x', imageSize + 20)
      .attr('y', barHeight / 2 - 10)
      .attr('font-family', 'Inter')
      .attr('font-size', 16)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text((d) => d.name);

    partyRows
      .append('text')
      .attr('x', imageSize + 20)
      .attr('y', barHeight / 2 + 10)
      .attr('font-family', 'Inter')
      .attr('font-size', 14)
      .attr('fill', '#666')
      .text((d) => d.leader);

    // Add polling numbers
    partyRows
      .append('text')
      .attr('x', imageSize + 200)
      .attr('y', barHeight / 2)
      .attr('font-family', 'Inter')
      .attr('font-size', 24)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .attr('dy', '0.35em')
      .text((d) => `${d.polling.toFixed(1)}%`);

    // Add change indicators
    partyRows
      .append('text')
      .attr('x', imageSize + 280)
      .attr('y', barHeight / 2)
      .attr('font-family', 'Inter')
      .attr('font-size', 14)
      .attr('fill', (d) =>
        d.change === null ? '#666' : d.change > 0 ? '#28a745' : '#dc3545'
      )
      .attr('dy', '0.35em')
      .text((d) => {
        if (d.change === null) return '—';
        const prefix = d.change > 0 ? '▲' : '▼';
        return `${prefix}${Math.abs(d.change).toFixed(1)}`;
      });

    // Add bars
    partyRows
      .append('rect')
      .attr('x', imageSize + 350)
      .attr('y', barHeight / 4)
      .attr('width', (d) => xScale(d.polling))
      .attr('height', barHeight / 2)
      .attr('fill', (d) => d.color);
  }, [partyData]);

  if (loading) {
    return <div>Loading polling data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <ChartContainer numParties={partyData.length}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </ChartContainer>
  );
};

export default LatestPolling;
