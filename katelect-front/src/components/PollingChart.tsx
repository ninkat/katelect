import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import { partyColors } from '../types/PartyColors';
import {
  RawPoll,
  AveragedDataPoint,
  PartyKey,
  LatestPollingData,
} from '../types/polling';

// styled components for the polling chart
const ChartWrapper = styled.div`
  width: 100%;
  height: 500px;
  min-height: 400px;
  position: relative;
  background: white;
  display: flex;
  overflow: hidden;
`;

const ChartContainer = styled.div`
  flex: 1;
  position: relative;
  min-width: 0;
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

const ZoomControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #eaeaea;
`;

const ZoomButton = styled.button<{ $active: boolean }>`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0e0e0;
  background-color: ${(props) => (props.$active ? '#ffffff' : '#f0f0f0')};
  color: ${(props) => (props.$active ? '#333333' : '#666666')};
  font-weight: ${(props) => (props.$active ? '600' : '400')};
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  box-shadow: ${(props) =>
    props.$active ? 'none' : 'inset 0 -4px 8px -4px rgba(0, 0, 0, 0.1)'};

  &:hover {
    color: #333333;
    background-color: ${(props) => (props.$active ? '#ffffff' : '#f8f8f8')};
  }

  &:not(:first-child) {
    margin-top: -2px;
  }
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

// utility function to safely parse dates
const safeParseDateISO = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parseResult = d3.timeParse('%Y-%m-%d')(dateStr);
  if (!parseResult) {
    console.warn('[PollingChart Debug] Failed to parse date:', dateStr);
    return null;
  }
  return parseResult;
};

interface PollingChartProps {
  region: string;
  showBloc: boolean;
  onTrendsUpdate?: (trends: LatestPollingData) => void;
}

const PollingChart = ({
  region,
  showBloc,
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
  const [zoomLevel, setZoomLevel] = useState(3); // 0 = all data, 1 = 1 year, 2 = 6 months, 3 = 3 months, 4 = 1 month

  // State for fetched data
  const [averagedData, setAveragedData] = useState<AveragedDataPoint[]>([]);
  const [rawData, setRawData] = useState<RawPoll[]>([]);
  const [filteredAveragedData, setFilteredAveragedData] = useState<
    AveragedDataPoint[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update dimensions on resize
  useEffect(() => {
    // Initial dimensions setup with a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (chartWrapperRef.current) {
        const newDimensions = {
          width: chartWrapperRef.current.clientWidth,
          height: chartWrapperRef.current.clientHeight,
        };
        setDimensions(newDimensions);
      }
    }, 100);

    // Set up resize observer instead of event listener
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newDimensions = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        setDimensions(newDimensions);
      }
    });

    if (chartWrapperRef.current) {
      resizeObserver.observe(chartWrapperRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch data when region changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setAveragedData([]); // Clear old data
      setRawData([]);
      try {
        // Fetch both averaged and raw data
        const [avgResponse, rawResponse] = await Promise.all([
          fetch(`http://localhost:8000/api/averages/${region}`),
          fetch(`http://localhost:8000/api/polls/${region}`),
        ]);

        if (!avgResponse.ok) {
          throw new Error(
            `Failed to fetch averaged data: ${avgResponse.statusText}`
          );
        }
        if (!rawResponse.ok) {
          throw new Error(
            `Failed to fetch raw poll data: ${rawResponse.statusText}`
          );
        }

        const avgData: AveragedDataPoint[] = await avgResponse.json();
        const rawDataJson: RawPoll[] = await rawResponse.json();

        // Basic validation (optional but good)
        if (!Array.isArray(avgData))
          throw new Error('Invalid averaged data format');
        if (!Array.isArray(rawDataJson))
          throw new Error('Invalid raw data format');

        setAveragedData(avgData);
        setRawData(rawDataJson);

        // If onTrendsUpdate exists, extract latest trends from fetched averaged data
        if (onTrendsUpdate && avgData.length > 0) {
          const parties = Object.keys(avgData[0]).filter(
            (k) => k !== 'date'
          ) as PartyKey[];
          const latestValues: Record<PartyKey, number> = {} as Record<
            PartyKey,
            number
          >;
          const changes: Record<PartyKey, number | null> = {} as Record<
            PartyKey,
            number | null
          >;

          const lastIndex = avgData.length - 1;
          const secondLastIndex = avgData.length - 2;

          parties.forEach((party) => {
            latestValues[party] = avgData[lastIndex][party];
            if (secondLastIndex >= 0) {
              changes[party] =
                avgData[lastIndex][party] - avgData[secondLastIndex][party];
            } else {
              changes[party] = null; // No change if only one data point
            }
          });

          onTrendsUpdate({
            latestValues,
            changes,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
        console.error('Error fetching polling chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [region, onTrendsUpdate]);

  // Filter averaged data based on zoom level
  useEffect(() => {
    if (averagedData.length === 0) {
      setFilteredAveragedData([]); // Clear filtered data if no base data
      return;
    }

    const now = new Date();
    let startDate: Date;

    // Calculate start date based on zoom level
    switch (zoomLevel) {
      case 0: // all data
        startDate = new Date(0); // earliest possible date
        break;
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

    // Filter data to only include dates after startDate and with valid dates
    const filtered = averagedData.filter((d) => {
      const date = safeParseDateISO(d.date);
      return date !== null && date >= startDate;
    });

    setFilteredAveragedData(filtered);
  }, [averagedData, zoomLevel]);

  // Render chart when filtered averaged data, raw data, or dimensions change
  useEffect(() => {
    if (
      !svgRef.current ||
      filteredAveragedData.length === 0 ||
      dimensions.width === 0
    ) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove();
      }
      return;
    }

    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const partyAcronyms: Record<string, string> = {
      liberal: 'LPC',
      conservative: 'CPC',
      ndp: 'NDP',
      bloc: 'BQ',
      green: 'GPC',
      ppc: 'PPC',
    };

    // Filter out any data points with invalid dates first
    const validFilteredData = filteredAveragedData.filter(
      (d) => safeParseDateISO(d.date) !== null
    );
    if (validFilteredData.length === 0) {
      return;
    }

    const xScaleDomain = d3.extent(validFilteredData, (d) =>
      safeParseDateISO(d.date)
    ) as [Date, Date];
    if (!xScaleDomain[0] || !xScaleDomain[1]) {
      return; // Stop rendering if domain is invalid
    }

    const xScale = d3.scaleTime().domain(xScaleDomain).range([0, width]);

    const xDomain = xScale.domain();

    const relevantRawData = rawData.filter((d) => {
      const date = safeParseDateISO(d.date);
      if (!date) return false;
      return date >= xDomain[0] && date <= xDomain[1];
    });

    // Calculate max Y values
    const maxRawVoteShare = Math.max(
      0,
      ...relevantRawData.map((poll) =>
        Math.max(
          poll.liberal ?? 0,
          poll.conservative ?? 0,
          poll.ndp ?? 0,
          poll.bloc ?? 0,
          poll.green ?? 0,
          poll.ppc ?? 0
        )
      )
    );
    const maxAvgVoteShare = Math.max(
      0,
      ...filteredAveragedData.map((d) =>
        Math.max(
          d.liberal ?? 0,
          d.conservative ?? 0,
          d.ndp ?? 0,
          d.bloc ?? 0,
          d.green ?? 0,
          d.ppc ?? 0
        )
      )
    );
    const overallMax = Math.max(maxRawVoteShare, maxAvgVoteShare);
    const yMax = Math.ceil((overallMax * 1.05) / 5) * 5;
    const finalYMax = Math.max(30, yMax);

    const yScale = d3.scaleLinear().domain([0, finalYMax]).range([height, 0]);
    if (isNaN(yScale.domain()[0]) || isNaN(yScale.domain()[1])) {
      return; // Stop rendering
    }

    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(10);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-family', 'Inter')
      .style('font-size', '12px');

    svg
      .append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-family', 'Inter')
      .style('font-size', '12px');

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

    const parties: ChartParty[] = [
      'liberal',
      'conservative',
      'ndp',
      'green',
      'ppc',
    ];
    if (showBloc) {
      parties.push('bloc');
    }

    parties.forEach((party) => {
      svg
        .selectAll(`.dot-${party}`)
        .data(relevantRawData)
        .enter()
        .append('circle')
        .attr('class', `dot-${party}`)
        .attr('cx', (d) => xScale(safeParseDateISO(d.date) as Date))
        .attr('cy', (d) => yScale(d[party as PartyKey] ?? 0))
        .attr('r', 4)
        .attr('fill', partyColors[party])
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .style('opacity', 0.4);
    });

    parties.forEach((party) => {
      const line = d3
        .line<AveragedDataPoint>()
        .x((d) => xScale(safeParseDateISO(d.date) as Date))
        .y((d) => yScale(d[party as PartyKey] ?? 0))
        .defined(
          (d) =>
            safeParseDateISO(d.date) !== null &&
            typeof d[party as PartyKey] === 'number'
        )
        .curve(d3.curveMonotoneX);

      svg
        .append('path')
        .datum(filteredAveragedData)
        .attr('fill', 'none')
        .attr('stroke', partyColors[party])
        .attr('stroke-width', 2)
        .attr('d', line);
    });

    const overlay = svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'default');

    const verticalLine = svg
      .append('line')
      .attr('class', 'vertical-line')
      .attr('y1', 0)
      .attr('y2', height)
      .style('stroke', '#999')
      .style('stroke-width', '1px')
      .style('visibility', 'hidden');

    overlay
      .on('mousemove', function (event: MouseEvent) {
        const pointerDate = xScale.invert(d3.pointer(event)[0]);

        const bisect = d3.bisector(
          (d: AveragedDataPoint) => safeParseDateISO(d.date) as Date
        ).left;
        const i = bisect(filteredAveragedData, pointerDate, 1);
        const d0 = filteredAveragedData[i - 1];
        const d1 = filteredAveragedData[i];

        if (!d0 || !d1) return;
        const date0 = safeParseDateISO(d0.date);
        const date1 = safeParseDateISO(d1.date);
        if (!date0 || !date1) return; // Ensure dates are valid

        const d =
          pointerDate.getTime() - date0.getTime() >
          date1.getTime() - pointerDate.getTime()
            ? d1
            : d0;
        const nearestDate = safeParseDateISO(d.date) as Date;

        verticalLine
          .attr('x1', xScale(nearestDate))
          .attr('x2', xScale(nearestDate))
          .style('visibility', 'visible');

        const dateStr = nearestDate.toISOString().split('T')[0];

        let tooltipContent = `<strong>${dateStr}</strong><br/>`;
        parties.forEach((party) => {
          const value = d[party as PartyKey] ?? 0;
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

    if (finalYMax >= 50) {
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

    const chartArea = d3.select(chartWrapperRef.current);
    chartArea.on('wheel.zoom', (event) => {
      event.preventDefault();
      const delta = event.deltaY;
      if (delta < 0 && zoomLevel < 4) {
        setZoomLevel((prev) => prev + 1);
      } else if (delta > 0 && zoomLevel > 0) {
        setZoomLevel((prev) => prev - 1);
      }
    });

    return () => {
      chartArea.on('wheel.zoom', null);
    };
  }, [filteredAveragedData, rawData, dimensions, showBloc, zoomLevel]);

  // Handle loading and error states
  if (loading) {
    return <LoadingMessage>Loading chart data...</LoadingMessage>;
  }

  if (error) {
    return <LoadingMessage>Error loading chart: {error}</LoadingMessage>;
  }

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
        <ZoomControls>
          <ZoomButton
            onClick={() => setZoomLevel(4)}
            $active={zoomLevel === 4}
          >
            1 Month
          </ZoomButton>
          <ZoomButton
            onClick={() => setZoomLevel(1)}
            $active={zoomLevel === 1}
          >
            1 Year
          </ZoomButton>
          <ZoomButton
            onClick={() => setZoomLevel(0)}
            $active={zoomLevel === 0}
          >
            All Data
          </ZoomButton>
        </ZoomControls>
      </LegendContainer>
    </ChartWrapper>
  );
};

// Loading message styled component (can be reused or defined locally)
const LoadingMessage = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #666666;
  text-align: center;
  padding: 2rem;
  width: 100%; // Ensure it takes full width
  height: 100%; // Ensure it takes full height
  display: flex;
  align-items: center;
  justify-content: center;
`;

export default PollingChart;
