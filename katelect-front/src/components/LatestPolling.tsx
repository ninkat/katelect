import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { partyColors } from '../types/PartyColors';
import styled from 'styled-components';
import { LatestPollingData, PartyKey } from '../types/polling';

// Import headshots
import carneyImg from '/src/assets/headshots/carney.jpg';
import poilievreImg from '/src/assets/headshots/poilievre.jpg';
import singhImg from '/src/assets/headshots/singh.jpg';
import blanchetImg from '/src/assets/headshots/blanchet.jpg';
import pedneaultImg from '/src/assets/headshots/pedneault.jpg';
import bernierImg from '/src/assets/headshots/bernier.jpg';

interface PartyDisplayData {
  name: string;
  leader: string;
  polling: number;
  change: number | null;
  color: string;
  headshot: string;
}

// styled component for the container
const ChartContainer = styled.div<{ $numParties: number }>`
  width: 100%;
  height: ${(props) => props.$numParties * 60}px;
`;

interface LatestPollingProps {
  region: string;
  latestData: LatestPollingData | null;
}

const LatestPolling = ({ region, latestData }: LatestPollingProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [partyData, setPartyData] = useState<PartyDisplayData[]>([]);

  useEffect(() => {
    if (!latestData) {
      setPartyData([]);
      return;
    }

    // determine which parties to show based on region
    const showBloc = region === 'quebec' || region === 'federal';

    // create party data using the passed latestData
    const newPartyData: PartyDisplayData[] = [
      {
        name: 'Liberal',
        leader: 'Mark Carney',
        polling: latestData.latestValues.liberal || 0,
        change: latestData.changes.liberal,
        color: partyColors.liberal,
        headshot: carneyImg,
      },
      {
        name: 'Conservative',
        leader: 'Pierre Poilievre',
        polling: latestData.latestValues.conservative || 0,
        change: latestData.changes.conservative,
        color: partyColors.conservative,
        headshot: poilievreImg,
      },
      {
        name: 'New Democrat',
        leader: 'Jagmeet Singh',
        polling: latestData.latestValues.ndp || 0,
        change: latestData.changes.ndp,
        color: partyColors.ndp,
        headshot: singhImg,
      },
      {
        name: 'Bloc Québécois',
        leader: 'Yves-François Blanchet',
        polling: latestData.latestValues.bloc || 0,
        change: latestData.changes.bloc,
        color: partyColors.bloc,
        headshot: blanchetImg,
      },
      {
        name: 'Green',
        leader: 'Jonathan Pedneault',
        polling: latestData.latestValues.green || 0,
        change: latestData.changes.green,
        color: partyColors.green,
        headshot: pedneaultImg,
      },
      {
        name: "People's Party",
        leader: 'Maxime Bernier',
        polling: latestData.latestValues.ppc || 0,
        change: latestData.changes.ppc,
        color: partyColors.ppc,
        headshot: bernierImg,
      },
      {
        name: 'Other',
        leader: '',
        polling: latestData.latestValues.other || 0,
        change: latestData.changes.other,
        color: partyColors.other,
        headshot: '',
      },
    ];

    // filter out Bloc Québécois if not showing for this region
    const filteredPartyData = showBloc
      ? newPartyData
      : newPartyData.filter((party) => party.name !== 'Bloc Québécois');

    // sort by polling numbers
    const sortedPartyData = filteredPartyData.sort(
      (a, b) => b.polling - a.polling
    );
    setPartyData(sortedPartyData);
  }, [latestData, region]);

  useEffect(() => {
    if (!svgRef.current || partyData.length === 0) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      return;
    }

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const parentWidth = svgRef.current.parentElement?.clientWidth || 800;
    const width = parentWidth - margin.left - margin.right;
    const barHeight = 60;
    const totalHeight = partyData.length * barHeight;
    const height = totalHeight - margin.top - margin.bottom;
    const imageSize = 50;
    const barStartX = imageSize + 350;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height + margin.top + margin.bottom)
      .attr(
        'viewBox',
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .attr('preserveAspectRatio', 'xMidYMid meet')
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
    const maxPolling = d3.max(partyData, (d) => d.polling);
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(60, maxPolling || 0)])
      .range([0, width - barStartX]);

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
      .attr('transform', `translate(0,${barHeight / 2 - imageSize / 2})`);

    // Add circle background for parties without headshots
    imageGroups
      .filter((d: PartyDisplayData) => !d.headshot)
      .append('circle')
      .attr('cx', imageSize / 2)
      .attr('cy', imageSize / 2)
      .attr('r', imageSize / 2)
      .attr('fill', (d) => d.color || '#e0e0e0');

    // Add headshot images for parties with leaders
    imageGroups
      .filter((d: PartyDisplayData) => !!d.headshot)
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
      .attr('x', imageSize + 15)
      .attr('y', barHeight / 2 - 8)
      .attr('font-family', 'Inter')
      .attr('font-size', 16)
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text((d) => d.name);

    partyRows
      .filter((d) => d.leader)
      .append('text')
      .attr('x', imageSize + 15)
      .attr('y', barHeight / 2 + 12)
      .attr('font-family', 'Inter')
      .attr('font-size', 14)
      .attr('fill', '#666')
      .text((d) => d.leader);

    // Add polling numbers
    partyRows
      .append('text')
      .attr('x', imageSize + 180)
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
      .attr('x', imageSize + 270)
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
      .attr('x', barStartX)
      .attr('y', barHeight / 4)
      .attr('width', (d) => Math.max(0, xScale(d.polling)))
      .attr('height', barHeight / 2)
      .attr('fill', (d) => d.color);
  }, [partyData]);

  if (!latestData || partyData.length === 0) {
    return <div>Loading latest polling average...</div>;
  }

  return (
    <ChartContainer $numParties={partyData.length}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </ChartContainer>
  );
};

export default LatestPolling;
