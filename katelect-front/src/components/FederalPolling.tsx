import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';

// Import headshots
import carneyImg from '/src/assets/headshots/carney.jpg';
import poilievreImg from '/src/assets/headshots/poilievre.jpg';
import singhImg from '/src/assets/headshots/singh.jpg';
import blanchetImg from '/src/assets/headshots/blanchet.jpg';
import pedneaultImg from '/src/assets/headshots/pedneault.jpg';
import bernierImg from '/src/assets/headshots/bernier.jpg';

const PollSection = styled.div`
  margin-bottom: 4rem;
  position: relative;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .headshot-clip {
    clip-path: circle(50%);
  }
`;

interface PartyData {
  name: string;
  leader: string;
  polling: number;
  change: number | null;
  color: string;
  headshot: string;
}

// synthetic data - this would eventually come from an API or database
const partyData: PartyData[] = [
  {
    name: 'Liberal',
    leader: 'Mark Carney',
    polling: 44.2,
    change: 0.6,
    color: '#D71920',
    headshot: carneyImg,
  },
  {
    name: 'Conservative',
    leader: 'Pierre Poilievre',
    polling: 37.3,
    change: -0.3,
    color: '#1A4782',
    headshot: poilievreImg,
  },
  {
    name: 'New Democrat',
    leader: 'Jagmeet Singh',
    polling: 8.1,
    change: -0.1,
    color: '#F37021',
    headshot: singhImg,
  },
  {
    name: 'Bloc Québécois',
    leader: 'Yves-François Blanchet',
    polling: 5.3,
    change: -0.1,
    color: '#33B2CC',
    headshot: blanchetImg,
  },
  {
    name: 'Green',
    leader: 'Jonathan Pedneault',
    polling: 2.2,
    change: null,
    color: '#3D9B35',
    headshot: pedneaultImg,
  },
  {
    name: "People's Party",
    leader: 'Maxime Bernier',
    polling: 2.0,
    change: null,
    color: '#4B306A',
    headshot: bernierImg,
  },
  {
    name: 'Other',
    leader: '',
    polling: 0.9,
    change: 0.1,
    color: '#808080',
    headshot: '',
  },
];

const FederalPolling = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 800 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    const barHeight = 60;
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
        return !d.headshot;
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
      .text((d) => `${d.polling}%`);

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
  }, []);

  return (
    <PollSection>
      <svg ref={svgRef}></svg>
    </PollSection>
  );
};

export default FederalPolling;
