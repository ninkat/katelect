import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface PartyData {
  name: string;
  seats: {
    median: number;
    low: number;
    high: number;
  };
  color: string;
}

// synthetic data - this would eventually come from an API or database
const partyData: PartyData[] = [
  {
    name: 'Liberal',
    seats: { median: 190, low: 173, high: 210 },
    color: '#D71920',
  },
  {
    name: 'Conservative',
    seats: { median: 133, low: 112, high: 147 },
    color: '#1A4782',
  },
  {
    name: 'Bloc Québécois',
    seats: { median: 13, low: 8, high: 20 },
    color: '#33B2CC',
  },
  {
    name: 'New Democrat',
    seats: { median: 8, low: 3, high: 20 },
    color: '#F37021',
  },
  {
    name: 'Green',
    seats: { median: 1, low: 0, high: 2 },
    color: '#3D9B35',
  },
  {
    name: "People's Party",
    seats: { median: 0, low: 0, high: 1 },
    color: '#4B306A',
  },
  {
    name: 'Other',
    seats: { median: 0, low: 0, high: 0 },
    color: '#808080',
  },
];

const ProjectedSeats = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 0, right: 0, bottom: 0, left: 120 };
    const width = 1100 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 350]) // max possible seats
      .range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(partyData.map((d) => d.name))
      .range([0, height])
      .padding(0.3);

    // Add grey reference lines for each party
    svg
      .selectAll('.reference-line')
      .data(partyData)
      .enter()
      .append('line')
      .attr('class', 'reference-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('y2', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1);

    // Add majority line
    svg
      .append('line')
      .attr('x1', xScale(172))
      .attr('x2', xScale(172))
      .attr('y1', -10)
      .attr('y2', height)
      .attr('stroke', '#666')
      .attr('stroke-dasharray', '4')
      .attr('stroke-width', 1);

    svg
      .append('text')
      .attr('x', xScale(172))
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter')
      .attr('font-size', 14)
      .attr('fill', '#666')
      .text('172 seats to majority');

    const yAxis = d3.axisLeft(yScale);
    svg
      .append('g')
      .call(yAxis)
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .call((g) => g.selectAll('.tick text').attr('font-size', '16'));

    // Function to calculate interval width based on party rank
    const getIntervalWidth = (
      party: PartyData
    ): { low: number; high: number } => {
      const index = partyData.findIndex((p) => p.name === party.name);
      if (index < 3) {
        // Top 3 parties get wider intervals
        return {
          low:
            party.seats.median - (party.seats.median - party.seats.low) * 1.5,
          high:
            party.seats.median + (party.seats.high - party.seats.median) * 1.5,
        };
      }
      return party.seats;
    };

    // Add uncertainty intervals
    svg
      .selectAll('.interval')
      .data(partyData)
      .enter()
      .append('line')
      .attr('class', 'interval')
      .attr('x1', (d) => xScale(getIntervalWidth(d).low))
      .attr('x2', (d) => xScale(getIntervalWidth(d).high))
      .attr('y1', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('y2', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('stroke', (d) => d3.color(d.color)?.darker(0.5) || '#000')
      .attr('stroke-width', 4)
      .attr('opacity', 0.3);

    // Add median points
    svg
      .selectAll('.median')
      .data(partyData)
      .enter()
      .append('circle')
      .attr('class', 'median')
      .attr('cx', (d) => xScale(d.seats.median))
      .attr('cy', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('r', 8)
      .attr('fill', (d) => d.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Add seat numbers
    svg
      .selectAll('.seats')
      .data(partyData)
      .enter()
      .append('text')
      .attr('class', 'seats')
      .attr('x', (d) => xScale(getIntervalWidth(d).high) + 15)
      .attr('y', (d) => yScale(d.name)! + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-family', 'Inter')
      .attr('font-size', 18)
      .attr('fill', '#333')
      .text((d) => d.seats.median);
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default ProjectedSeats;
