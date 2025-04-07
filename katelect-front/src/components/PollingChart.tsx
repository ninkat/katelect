import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import { partyColors } from './PartyColors';
import { Poll } from './PollingData';

// styled components for the polling chart
const ChartWrapper = styled.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: white;
  display: flex;
`;

const ChartContainer = styled.div`
  flex: 1;
  position: relative;
`;

const LegendContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  margin-right: 1rem;
  padding-top: 1rem;
  width: 150px;
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

// type for chart parties (excluding 'other')
type ChartParty = Exclude<keyof typeof partyColors, 'other'>;

interface AveragedDataPoint {
  date: string;
  liberal: number;
  conservative: number;
  ndp: number;
  bloc: number;
  green: number;
  ppc: number;
  other: number;
}

type PartyKey = keyof Omit<AveragedDataPoint, 'date'>;

interface PollingChartProps {
  polls: Poll[];
  region?: string;
  showBloc?: boolean;
  onTrendsUpdate?: (trends: PollingTrends) => void;
}

// function to calculate exponentially weighted moving average
const calculateEWMA = (
  data: Poll[],
  party: PartyKey,
  smoothingFactor: number = 0.25
): number[] => {
  if (data.length === 0) return [];

  // sort data by date to ensure chronological order
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // initialize result array with the first value
  const result: number[] = [sortedData[0][party]];

  // calculate ewma for each subsequent data point
  for (let i = 1; i < sortedData.length; i++) {
    const currentValue = sortedData[i][party];
    const previousEWMA = result[i - 1];
    const newEWMA =
      previousEWMA + smoothingFactor * (currentValue - previousEWMA);
    result.push(newEWMA);
  }

  return result;
};

// function to normalize vote share to 100%
const normalizeVoteShare = (
  dataPoint: AveragedDataPoint
): AveragedDataPoint => {
  const parties: PartyKey[] = [
    'liberal',
    'conservative',
    'ndp',
    'bloc',
    'green',
    'ppc',
    'other',
  ];

  // calculate total
  const total = parties.reduce((sum, party) => sum + dataPoint[party], 0);

  // if total is 0, return the original data point
  if (total === 0) return dataPoint;

  // normalize each party's vote share
  const normalizedDataPoint = { ...dataPoint };
  parties.forEach((party) => {
    normalizedDataPoint[party] = (dataPoint[party] / total) * 100;
  });

  return normalizedDataPoint;
};

// interface for exposing latest EWMA values and changes
export interface PollingTrends {
  latestValues: Record<PartyKey, number>;
  changes: Record<PartyKey, number>;
}

const PollingChart = ({
  polls,
  region = 'federal',
  showBloc = false,
  onTrendsUpdate,
}: PollingChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(3); // 1 = 1 year, 2 = 6 months, 3 = 3 months, 4 = 1 month
  const [allData, setAllData] = useState<AveragedDataPoint[]>([]);
  const [filteredData, setFilteredData] = useState<AveragedDataPoint[]>([]);
  const [rawData, setRawData] = useState<Poll[]>([]);
  const [pollingTrends, setPollingTrends] = useState<PollingTrends>({
    latestValues: {} as Record<PartyKey, number>,
    changes: {} as Record<PartyKey, number>,
  });
  const smoothingFactor = 0.25; // constant smoothing factor

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

  // Process data when polls change
  useEffect(() => {
    if (polls.length === 0) return;

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const data = polls.map((poll) => ({
      ...poll,
      parsedDate: parseDate(poll.date) as Date,
    }));

    // Sort data by date
    data.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    setRawData(polls);

    // Calculate ewma data points for all parties
    const parties: PartyKey[] = [
      'liberal',
      'conservative',
      'ndp',
      'bloc',
      'green',
      'ppc',
      'other',
    ];

    // Create a map of dates to data points
    const dateMap = new Map<string, AveragedDataPoint>();

    // Initialize the map with all dates
    data.forEach((poll) => {
      const dateStr = poll.date;
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          liberal: 0,
          conservative: 0,
          ndp: 0,
          bloc: 0,
          green: 0,
          ppc: 0,
          other: 0,
        });
      }
    });

    // Calculate EWMA for each party
    parties.forEach((party) => {
      const ewmaValues = calculateEWMA(data, party, smoothingFactor);

      // Assign EWMA values to the corresponding dates
      data.forEach((poll, index) => {
        const dateStr = poll.date;
        const dataPoint = dateMap.get(dateStr);
        if (dataPoint) {
          dataPoint[party] = ewmaValues[index];
        }
      });
    });

    // Normalize all data points to 100%
    dateMap.forEach((dataPoint, dateStr) => {
      dateMap.set(dateStr, normalizeVoteShare(dataPoint));
    });

    // Convert map to array and sort by date
    const ewmaData: AveragedDataPoint[] = Array.from(dateMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setAllData(ewmaData);

    // Calculate latest values and changes for each party
    if (ewmaData.length >= 2) {
      const latestValues: Record<PartyKey, number> = {} as Record<
        PartyKey,
        number
      >;
      const changes: Record<PartyKey, number> = {} as Record<PartyKey, number>;

      const lastIndex = ewmaData.length - 1;
      const secondLastIndex = ewmaData.length - 2;

      parties.forEach((party) => {
        latestValues[party] = ewmaData[lastIndex][party];
        changes[party] =
          ewmaData[lastIndex][party] - ewmaData[secondLastIndex][party];
      });

      setPollingTrends({
        latestValues,
        changes,
      });
    }
  }, [polls]);

  // Filter data based on zoom level
  useEffect(() => {
    if (allData.length === 0) return;

    const now = new Date();
    let startDate: Date;

    // Calculate start date based on zoom level
    switch (zoomLevel) {
      case 1: // 1 year
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      case 2: // 6 months
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        break;
      case 3: // 3 months
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case 4: // 1 month
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      default:
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
    }

    // Filter data to only include dates after startDate
    const filtered = allData.filter((d) => new Date(d.date) >= startDate);
    setFilteredData(filtered);
  }, [allData, zoomLevel]);

  // Update pollingTrends when it changes
  useEffect(() => {
    if (onTrendsUpdate) {
      onTrendsUpdate(pollingTrends);
    }
  }, [pollingTrends, onTrendsUpdate]);

  // Render chart when filtered data or dimensions change
  useEffect(() => {
    if (!svgRef.current || filteredData.length === 0 || dimensions.width === 0)
      return;

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
      .domain(d3.extent(filteredData, (d) => new Date(d.date)) as [Date, Date])
      .range([0, width]);

    // Find the maximum vote share across all parties
    const maxVoteShare = Math.max(
      ...rawData.map((poll) =>
        Math.max(
          poll.liberal,
          poll.conservative,
          poll.ndp,
          poll.bloc,
          poll.green,
          poll.ppc
        )
      )
    );

    // Add 5% padding to the max value and round up to nearest 5
    const yMax = Math.ceil((maxVoteShare + 5) / 5) * 5;

    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]);

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

    // Determine which parties to show based on region
    const parties: ChartParty[] = [
      'liberal',
      'conservative',
      'ndp',
      'green',
      'ppc',
    ];

    // Only add BQ for Quebec and Federal if showBloc is true
    if (showBloc) {
      parties.push('bloc');
    }

    // Add dots for each data point first (so they appear behind the lines)
    parties.forEach((party) => {
      svg
        .selectAll(`.dot-${party}`)
        .data(
          rawData.filter((d) => {
            const pollDate = new Date(d.date);
            return (
              pollDate >= xScale.domain()[0] && pollDate <= xScale.domain()[1]
            );
          })
        )
        .enter()
        .append('circle')
        .attr('class', `dot-${party}`)
        .attr('cx', (d) => xScale(new Date(d.date)))
        .attr('cy', (d) => yScale(d[party]))
        .attr('r', 4)
        .attr('fill', partyColors[party])
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('opacity', 0.4);
    });

    // Add lines for each party (after dots so they appear on top)
    parties.forEach((party) => {
      const line = d3
        .line<(typeof filteredData)[0]>()
        .x((d) => xScale(new Date(d.date)))
        .y((d) => yScale(d[party]))
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(filteredData)
        .attr('fill', 'none')
        .attr('stroke', partyColors[party])
        .attr('stroke-width', 2)
        .attr('d', line);
    });

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
        const i = bisect(filteredData, xDate, 1);
        const d0 = filteredData[i - 1];
        const d1 = filteredData[i];

        if (!d0 || !d1) return;

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
          const value = d[party as PartyKey];
          tooltipContent += `<div style="display: flex; align-items: center; margin-top: 4px;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: ${
              partyColors[party]
            }; margin-right: 8px;"></span>
            <span>${partyAcronyms[party]}: ${value.toFixed(1)}%</span>
          </div>`;
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

    // Update majority line position if needed
    if (yMax >= 50) {
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
    }

    // Add wheel event listener for zooming
    const chartArea = d3.select(chartWrapperRef.current);
    chartArea.on('wheel', (event) => {
      event.preventDefault();

      // Determine zoom direction (reversed)
      const delta = event.deltaY;
      if (delta < 0 && zoomLevel < 4) {
        // Zoom in (scroll up)
        setZoomLevel((prev) => prev + 1);
      } else if (delta > 0 && zoomLevel > 1) {
        // Zoom out (scroll down)
        setZoomLevel((prev) => prev - 1);
      }
    });

    // Clean up function
    return () => {
      chartArea.on('wheel', null);
    };
  }, [filteredData, dimensions, region, rawData, zoomLevel, showBloc]);

  return (
    <ChartWrapper ref={chartWrapperRef}>
      <ChartContainer>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </ChartContainer>
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
        {showBloc && (
          <LegendItem>
            <LegendColor color={partyColors.bloc} />
            <span>Bloc Québécois</span>
          </LegendItem>
        )}
        <LegendItem>
          <LegendColor color={partyColors.green} />
          <span>Green</span>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.ppc} />
          <span>People's Party</span>
        </LegendItem>
      </LegendContainer>
    </ChartWrapper>
  );
};

export default PollingChart;
