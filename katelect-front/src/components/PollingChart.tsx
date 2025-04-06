import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import { Poll, partyColors } from './PollingData';

// styled components for the polling chart
const ChartContainer = styled.div`
  width: 100%;
  height: 500px;
  margin-bottom: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
`;

const ChartWrapper = styled.div`
  flex: 1;
  width: 100%;
  min-height: 400px;
  position: relative;
`;

const LegendContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: center;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
`;

const LegendColor = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  background-color: ${(props) => props.color};
  border-radius: 4px;
`;

interface PollingChartProps {
  polls: Poll[];
}

const PollingChart = ({ polls }: PollingChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      if (chartWrapperRef.current) {
        setDimensions({
          width: chartWrapperRef.current.clientWidth,
          height: chartWrapperRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || polls.length === 0 || dimensions.width === 0) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const data = polls.map((poll) => ({
      ...poll,
      date: parseDate(poll.date) as Date,
    }));

    // Sort data by date
    data.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear().domain([0, 50]).range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(10);

    // Add x-axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-family', 'Inter')
      .style('font-size', '12px');

    // Add y-axis
    svg
      .append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-family', 'Inter')
      .style('font-size', '12px');

    // Add y-axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left + 15)
      .attr('x', 0 - height / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-family', 'Inter')
      .style('font-size', '14px')
      .text('Voting Intention (%)');

    // Create line generator functions
    const createLine = (party: keyof typeof partyColors) => {
      return d3
        .line<Poll>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d[party]))
        .curve(d3.curveMonotoneX);
    };

    // Add lines for each party
    const parties: (keyof typeof partyColors)[] = [
      'liberal',
      'conservative',
      'ndp',
      'bloc',
      'green',
      'ppc',
    ];

    parties.forEach((party) => {
      svg
        .append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', partyColors[party])
        .attr('stroke-width', 2)
        .attr('d', createLine(party));
    });

    // Add dots for each data point
    parties.forEach((party) => {
      svg
        .selectAll(`.dot-${party}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', `dot-${party}`)
        .attr('cx', (d) => xScale(d.date))
        .attr('cy', (d) => yScale(d[party]))
        .attr('r', 4)
        .attr('fill', partyColors[party])
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    });

    // Add hover effects
    const tooltip = d3
      .select(svgRef.current.parentNode as HTMLElement)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-family', 'Inter')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    // Add hover effects to dots
    parties.forEach((party) => {
      svg
        .selectAll(`.dot-${party}`)
        .on('mouseover', function (event, d) {
          d3.select(this).attr('r', 6);

          const date = d.date.toISOString().split('T')[0];
          const value = d[party];

          tooltip
            .style('visibility', 'visible')
            .html(`${date}<br>${party.toUpperCase()}: ${value}%`)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mousemove', function (event) {
          tooltip
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 4);
          tooltip.style('visibility', 'hidden');
        });
    });

    // Add majority line
    svg
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(50))
      .attr('y2', yScale(50))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '4')
      .attr('stroke-width', 1);

    svg
      .append('text')
      .attr('x', width - 10)
      .attr('y', yScale(50) - 5)
      .attr('text-anchor', 'end')
      .style('font-family', 'Inter')
      .style('font-size', '12px')
      .style('fill', '#666666')
      .text('50%');
  }, [polls, dimensions]);

  return (
    <ChartContainer>
      <ChartWrapper ref={chartWrapperRef}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </ChartWrapper>
      <LegendContainer>
        <LegendItem>
          <LegendColor color={partyColors.liberal} />
          <span>Liberal</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.conservative} />
          <span>Conservative</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.ndp} />
          <span>NDP</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.bloc} />
          <span>Bloc Québécois</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.green} />
          <span>Green</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.ppc} />
          <span>People's Party</span>
        </LegendItem>
      </LegendContainer>
    </ChartContainer>
  );
};

export default PollingChart;
