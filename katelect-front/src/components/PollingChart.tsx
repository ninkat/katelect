import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import { Poll } from './PollingData';
import { partyColors } from './PartyColors';

// styled components for the polling chart
const ChartWrapper = styled.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: white;
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

const Tooltip = styled.div`
  position: fixed;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.2s ease;
  transform: translate(10px, 10px);
`;

interface AveragedDataPoint {
  date: string;
  liberal: number;
  conservative: number;
  ndp: number;
  bloc: number;
  green: number;
  ppc: number;
}

type PartyKey = keyof Omit<AveragedDataPoint, 'date'>;

interface PollingChartProps {
  polls: Poll[];
}

const PollingChart = ({ polls }: PollingChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

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

    // Calculate averaged data points for all parties
    const dateGroups = d3.group(data, (d) => d.date);
    const averagedData: AveragedDataPoint[] = Array.from(
      dateGroups.entries()
    ).map(([date, polls]) => {
      const result: AveragedDataPoint = {
        date: date.toString(),
        liberal: 0,
        conservative: 0,
        ndp: 0,
        bloc: 0,
        green: 0,
        ppc: 0,
      };

      // Calculate average for each party
      (Object.keys(result) as Array<keyof AveragedDataPoint>).forEach(
        (party) => {
          if (party !== 'date') {
            const sum = polls.reduce(
              (acc, poll) => acc + (poll[party as keyof Poll] as number),
              0
            );
            result[party] = sum / polls.length;
          }
        }
      );

      return result;
    });

    // Party acronym mapping
    const partyAcronyms: Record<string, string> = {
      liberal: 'LPC',
      conservative: 'CPC',
      ndp: 'NDP',
      bloc: 'BQ',
      green: 'GPC',
      ppc: 'PPC',
    };

    // Create scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(averagedData, (d) => new Date(d.date)) as [Date, Date])
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
      const line = d3
        .line<(typeof averagedData)[0]>()
        .x((d) => xScale(new Date(d.date)))
        .y((d) => yScale(d[party]))
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(averagedData)
        .attr('fill', 'none')
        .attr('stroke', partyColors[party])
        .attr('stroke-width', 2)
        .attr('d', line);
    });

    // Add dots for each data point
    parties.forEach((party) => {
      svg
        .selectAll(`.dot-${party}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', `dot-${party}`)
        .attr('cx', (d) => xScale(new Date(d.date)))
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
      if (party !== 'other') {
        svg
          .selectAll(`.dot-${party}`)
          .data(data)
          .on('mouseover', function (event: MouseEvent, d: Poll) {
            d3.select(this).attr('r', 6);

            setTooltipData({
              x: event.clientX,
              y: event.clientY,
              content: `${d.date}<br>${d.pollster}<br>${
                partyAcronyms[party]
              }: ${d[party as keyof Poll]}%`,
            });
          })
          .on('mousemove', function (event) {
            setTooltipData((prev) =>
              prev
                ? {
                    ...prev,
                    x: event.clientX,
                    y: event.clientY,
                  }
                : null
            );
          })
          .on('mouseout', function () {
            d3.select(this).attr('r', 4);
            setTooltipData(null);
          });
      }
    });

    // Create a shared tooltip for all parties at a specific date
    const sharedTooltip = d3
      .select(svgRef.current.parentNode as HTMLElement)
      .append('div')
      .attr('class', 'shared-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '12px')
      .style('border-radius', '4px')
      .style('font-family', 'Inter')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    // Create an invisible overlay for the entire chart area to detect hover
    const overlay = svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'default');

    // Add vertical line that follows the cursor
    const verticalLine = svg
      .append('line')
      .attr('class', 'vertical-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#999')
      .style('stroke-width', '1px')
      .style('visibility', 'hidden');

    // Add hover effects to the overlay
    overlay
      .on('mousemove', function (event: MouseEvent) {
        const xPos = d3.pointer(event)[0];
        const xDate = xScale.invert(xPos);

        const bisect = d3.bisector(
          (d: AveragedDataPoint) => new Date(d.date)
        ).left;
        const i = bisect(averagedData, xDate, 1);
        const d0 = averagedData[i - 1];
        const d1 = averagedData[i];

        const d =
          xDate.getTime() - new Date(d0.date).getTime() >
          new Date(d1.date).getTime() - xDate.getTime()
            ? d1
            : d0;

        verticalLine
          .attr('x1', xScale(new Date(d.date)))
          .attr('x2', xScale(new Date(d.date)))
          .style('visibility', 'visible');

        const dateStr = new Date(d.date).toISOString().split('T')[0];

        let tooltipContent = `<strong>${dateStr}</strong><br/>`;

        parties.forEach((party) => {
          if (party !== 'other' && party in d) {
            const value = d[party as PartyKey];
            tooltipContent += `<div style="display: flex; align-items: center; margin-top: 4px;">
              <span style="display: inline-block; width: 12px; height: 12px; background-color: ${
                partyColors[party]
              }; margin-right: 8px;"></span>
              <span>${partyAcronyms[party]}: ${value.toFixed(1)}%</span>
            </div>`;
          }
        });

        setTooltipData({
          x: event.clientX,
          y: event.clientY,
          content: tooltipContent,
        });
      })
      .on('mouseout', function () {
        verticalLine.style('visibility', 'hidden');
        setTooltipData(null);
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
    <>
      <ChartWrapper ref={chartWrapperRef}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </ChartWrapper>
      {tooltipData && (
        <Tooltip
          style={{
            left: `${tooltipData.x}px`,
            top: `${tooltipData.y}px`,
            opacity: 1,
          }}
          dangerouslySetInnerHTML={{ __html: tooltipData.content }}
        />
      )}
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
          <span>New Democrat</span>
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
    </>
  );
};

export default PollingChart;
