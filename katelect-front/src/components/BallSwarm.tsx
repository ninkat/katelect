import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';
import liberalLogo from '/src/assets/partylogos/liberallogo.png';
import conservativeLogo from '/src/assets/partylogos/conservativelogo.png';
import { partyColors, leanColors } from '../types/PartyColors';

// interfaces for data types
interface SimulationOutcome {
  id: number;
  winner: 'liberal' | 'conservative' | 'tie';
  margin: number; // positive for liberal win, negative for conservative win
  color: string;
  isMajority: boolean;
}

// extends d3's simulation node type with our custom data
interface SimulationNode extends d3.SimulationNodeDatum {
  id: number;
  winner: 'liberal' | 'conservative' | 'tie';
  margin: number;
  color: string;
  isMajority: boolean;
  x?: number; // d3 will add x and y
  y?: number;
}

// constants for layout and styling
const width = 1100; // width of svg
const height = 350; // height of svg
const margin = { top: 60, right: 60, bottom: 60, left: 60 }; // reduced margins to fit in datasection
const dotRadius = 6;
const logoSize = 90;
const axisYPosition = height - margin.bottom + 10;
const forceYTarget = axisYPosition - 50;
const verticalAxisHeight = 120; // height of regular vertical axis lines
const tieAxisHeight = 220; // height of tie axis line
const logoYPosition = margin.top + 73; // moved logos down
const logoTiltAngle = 9; // tilt angle in degrees
const logoSpreadFactor = 0.25; // reduced from 0.5 to bring logos closer together

// define standard margin increments for axis lines (symmetric values)
const standardMargins = [
  -200, -180, -160, -140, -120, -100, -80, -60, -40, -20, 0, 20, 40, 60, 80,
  100, 120, 140, 160, 180, 200,
];

const tieColor = '#a0a0a0'; // grey color for tie outcomes
const axisColor = '#cccccc'; // light grey for main axis

// styled components for the visualization
const ChartTitle = styled.h2`
  font-family: 'raleway', sans-serif;
  font-family: 'raleway', sans-serif;
  font-size: 2.25rem;
  font-weight: 700;
  text-align: center;
  margin: 0;
  color: #333;
`;

const Emphasis = styled.span`
  font-style: italic;
`;

const Subtitle = styled.p`
  font-size: 1.34rem;
  color: #666;
  text-align: center;
  margin: 0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const SwarmContainer = styled.div`
  position: relative;
  width: ${width}px;
  height: ${height}px;
  margin: -4rem auto 0; // negative margin to pull it up
`;

const StyledSVG = styled.svg`
  display: block; // prevent extra space below svg
  width: 100%;
  height: 100%;
`;

const Dot = styled.circle`
  transition: fill 0.2s ease; // smooth color transition on potential hover effects later
`;

const AxisLine = styled.line<{ strokeWidth?: number; isVertical?: boolean }>`
  stroke: ${(props) =>
    props.isVertical ? props.color || axisColor : axisColor};
  stroke-width: ${(props) => (props.isVertical ? 2 : 1)}px;
`;

const AxisLabel = styled.text<{ isMarginLabel?: boolean }>`
  font-size: ${(props) => (props.isMarginLabel ? '0.8rem' : '0.9rem')};
  fill: ${(props) => props.color || '#666'};
  font-weight: ${(props) => (props.isMarginLabel ? '600' : '400')};
  text-transform: ${(props) => (props.isMarginLabel ? 'uppercase' : 'none')};
  letter-spacing: ${(props) => (props.isMarginLabel ? '0.5px' : 'normal')};
`;

const LogoImage = styled.image`
  // styles for party logos if needed
`;

// win count styles moved outside svg - adjust font size
const WinCountText = styled.text`
  font-size: 1.1rem;
  font-weight: 500;
  fill: #333;

  .party-name {
    font-size: 1.3rem;
    font-weight: 600;
  }

  .win-count {
    font-size: 1.3rem;
    font-weight: 600;
  }
`;

const Legend = styled.div`
  display: flex;
  justify-content: center; // center legend items
  flex-wrap: wrap;
  gap: 1.5rem; // increased gap
  margin-top: 0rem; // reduced space above legend (now below axis)
  padding-bottom: 1.5rem; // space below legend
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendColor = styled.div<{ color: string }>`
  width: ${dotRadius * 2}px; // match dot size
  height: ${dotRadius * 2}px;
  background-color: ${(props) => props.color};
  border-radius: 50%; // make legend color circles
`;

const LegendText = styled.span`
  font-size: 0.9rem; // slightly increased legend text
  color: #666666;
`;

const PartyName = styled.span`
  color: ${partyColors.liberal};
`;

// helper function to generate synthetic simulation data
// returns an array of 100 simulation outcomes
function generateSimulations(): SimulationOutcome[] {
  const simulations: SimulationOutcome[] = [];
  let idCounter = 0;

  // define target counts
  const targetLiberalMajority = 70;
  const targetLiberalMinority = 11;
  const targetConservativeMajority = 1;
  const targetConservativeMinority = 17;
  const targetTies = 1;

  // generate liberal majority wins with a negative margin (mean -50, stddev 20)
  const liberalMajorityGenerator = d3.randomNormal(-50, 20);
  for (let i = 0; i < targetLiberalMajority; i++) {
    const margin = Math.max(
      -100,
      Math.min(-1, Math.round(liberalMajorityGenerator()))
    );
    simulations.push({
      id: idCounter++,
      winner: 'liberal',
      margin: margin,
      color: partyColors.liberal,
      isMajority: true,
    });
  }

  // generate liberal minority wins with a negative margin (mean -20, stddev 10)
  const liberalMinorityGenerator = d3.randomNormal(-20, 10);
  for (let i = 0; i < targetLiberalMinority; i++) {
    const margin = Math.max(
      -100,
      Math.min(-1, Math.round(liberalMinorityGenerator()))
    );
    simulations.push({
      id: idCounter++,
      winner: 'liberal',
      margin: margin,
      color: leanColors.liberal,
      isMajority: false,
    });
  }

  // generate conservative majority wins with a positive margin (mean 50, stddev 20)
  const conservativeMajorityGenerator = d3.randomNormal(50, 20);
  for (let i = 0; i < targetConservativeMajority; i++) {
    const margin = Math.min(
      100,
      Math.max(1, Math.round(conservativeMajorityGenerator()))
    );
    simulations.push({
      id: idCounter++,
      winner: 'conservative',
      margin: margin,
      color: partyColors.conservative,
      isMajority: true,
    });
  }

  // generate conservative minority wins with a positive margin (mean 20, stddev 10)
  const conservativeMinorityGenerator = d3.randomNormal(20, 10);
  for (let i = 0; i < targetConservativeMinority; i++) {
    const margin = Math.min(
      100,
      Math.max(1, Math.round(conservativeMinorityGenerator()))
    );
    simulations.push({
      id: idCounter++,
      winner: 'conservative',
      margin: margin,
      color: leanColors.conservative,
      isMajority: false,
    });
  }

  // generate tie outcomes
  for (let i = 0; i < targetTies; i++) {
    simulations.push({
      id: idCounter++,
      winner: 'tie',
      margin: 0,
      color: tieColor,
      isMajority: false,
    });
  }

  // shuffle the array randomly for better visual distribution
  return d3.shuffle(simulations);
}

function BallSwarm() {
  // state to hold the node positions after simulation
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // generate simulation data only once on component mount
  const simulationData = useRef<SimulationOutcome[]>(generateSimulations());

  // calculate win counts from the generated data
  const liberalWins = simulationData.current.filter(
    (d) => d.winner === 'liberal'
  ).length;
  const conservativeWins = simulationData.current.filter(
    (d) => d.winner === 'conservative'
  ).length;
  const ties = simulationData.current.filter((d) => d.winner === 'tie').length;

  // finds the largest absolute margin to set the domain dynamically
  const maxAbsMargin = useMemo(
    () => d3.max(simulationData.current, (d) => Math.abs(d.margin)) || 100, // fallback if data is empty
    [] // only calculate once
  );

  const scalePaddingFactor = 1.1; // adds padding to the ends of the scale

  // determine which margins to show based on data range
  const visibleMargins = useMemo(() => {
    const maxMargin = Math.ceil((maxAbsMargin * scalePaddingFactor) / 20) * 20; // round up to nearest 20
    return standardMargins.filter((margin) => Math.abs(margin) <= maxMargin);
  }, [maxAbsMargin, scalePaddingFactor]);

  // setup d3 linear scale for the x-axis (seat margin)
  const xScale = useMemo(() => {
    const maxMargin = Math.ceil((maxAbsMargin * scalePaddingFactor) / 20) * 20; // round up to nearest 20
    return d3
      .scaleLinear()
      .domain([-maxMargin, maxMargin])
      .range([margin.left, width - margin.right]);
  }, [maxAbsMargin, scalePaddingFactor, margin.left, margin.right, width]);

  // setup and run the d3 force simulation when the component mounts or scale changes
  useEffect(() => {
    // Sort data to handle ties first, then other outcomes
    const simulationNodes: SimulationNode[] = [
      // Tie nodes first
      ...simulationData.current
        .filter((d) => d.winner === 'tie')
        .map((d) => ({ ...d })),
      // Then liberal nodes
      ...simulationData.current
        .filter((d) => d.winner === 'liberal')
        .map((d) => ({ ...d })),
      // Then conservative nodes
      ...simulationData.current
        .filter((d) => d.winner === 'conservative')
        .map((d) => ({ ...d })),
    ];

    // Create the force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(simulationNodes)
      .force(
        'x',
        d3
          .forceX<SimulationNode>((d) => {
            if (d.winner === 'tie') {
              // Ties must stay exactly at center
              return xScale(0);
            } else if (d.winner === 'liberal') {
              // Liberals must stay left of center
              const targetX = xScale(d.margin);
              const centerX = xScale(0);
              return Math.min(targetX, centerX - dotRadius * 2);
            } else {
              // Conservatives must stay right of center
              const targetX = xScale(d.margin);
              const centerX = xScale(0);
              return Math.max(targetX, centerX + dotRadius * 2);
            }
          })
          .strength((d) => (d.winner === 'tie' ? 1 : 0.2)) // stronger force for ties
      )
      .force('y', d3.forceY(forceYTarget).strength(0.05))
      .force(
        'collide',
        d3.forceCollide<SimulationNode>(dotRadius + 1).strength(0.8)
      )
      .stop();

    // Run the simulation manually
    const numTicks = 300; // increased ticks for better settling
    for (let i = 0; i < numTicks; ++i) {
      simulation.tick();

      // After each tick, enforce boundary constraints
      simulationNodes.forEach((node) => {
        if (node.winner === 'tie') {
          // Force ties to stay exactly at center
          if (node.x) {
            node.x = xScale(0);
          }
        } else if (node.winner === 'liberal') {
          // Enforce liberal dots stay left of center
          const centerX = xScale(0);
          if (node.x && node.x > centerX - dotRadius) {
            node.x = centerX - dotRadius;
          }
        } else {
          // Enforce conservative dots stay right of center
          const centerX = xScale(0);
          if (node.x && node.x < centerX + dotRadius) {
            node.x = centerX + dotRadius;
          }
        }
      });
    }

    // Update the state with the final node positions
    setNodes(simulationNodes);
  }, [xScale, forceYTarget]);

  return (
    <>
      <ChartTitle>
        The <PartyName>Liberals</PartyName> are <Emphasis>favoured</Emphasis> to
        win the most seats
      </ChartTitle>
      <Subtitle>
        We simulate the election 1000 times to see who wins most often. The
        sample of 100 outcomes below gives you a good idea of the range of
        scenarios our model thinks is possible.
      </Subtitle>

      <SwarmContainer>
        <StyledSVG ref={svgRef} viewBox={`0 0 ${width} ${height}`}>
          {/* main horizontal axis line */}
          <AxisLine
            x1={margin.left}
            y1={axisYPosition}
            x2={width - margin.right}
            y2={axisYPosition}
          />

          {/* vertical axis lines at key margins */}
          {visibleMargins.map((tickValue) => {
            const color =
              tickValue < 0
                ? partyColors.liberal
                : tickValue > 0
                ? partyColors.conservative
                : '#000000'; // black color for tie text and line
            const maxMargin =
              Math.ceil((maxAbsMargin * scalePaddingFactor) / 20) * 20;
            // Skip the end values as they're handled separately
            if (Math.abs(tickValue) === maxMargin) return null;
            return (
              <g key={tickValue}>
                {/* vertical line */}
                <AxisLine
                  x1={xScale(tickValue)}
                  y1={
                    axisYPosition -
                    (tickValue === 0 ? tieAxisHeight : verticalAxisHeight)
                  }
                  x2={xScale(tickValue)}
                  y2={axisYPosition}
                  isVertical={true}
                  color={color} // use black for tie line
                />
                {/* tick value label */}
                <AxisLabel
                  x={xScale(tickValue)}
                  y={axisYPosition + 25}
                  textAnchor="middle"
                  color={color}
                >
                  {tickValue === 0 ? 'TIE' : `+${Math.abs(tickValue)}`}
                </AxisLabel>
              </g>
            );
          })}

          {/* party logos with tilt */}
          <g
            transform={`translate(${xScale(
              maxAbsMargin * logoSpreadFactor
            )},${logoYPosition}) rotate(${logoTiltAngle})`}
          >
            <LogoImage
              href={conservativeLogo}
              x={-logoSize / 2}
              y={-logoSize / 2}
              height={logoSize}
              width={logoSize}
              opacity={1}
            />
          </g>

          <g
            transform={`translate(${xScale(
              -maxAbsMargin * logoSpreadFactor
            )},${logoYPosition}) rotate(${-logoTiltAngle})`}
          >
            <LogoImage
              href={liberalLogo}
              x={-logoSize / 2}
              y={-logoSize / 2}
              height={logoSize}
              width={logoSize}
              opacity={1}
            />
          </g>

          {/* Win count text */}
          <WinCountText
            x={width - margin.right}
            y={logoYPosition}
            textAnchor="end"
          >
            <tspan>The </tspan>
            <tspan className="party-name" fill={partyColors.conservative}>
              Conservatives
            </tspan>
            <tspan> win </tspan>
            <tspan
              dy="1.2em"
              x={width - margin.right}
              className="win-count"
              fill={partyColors.conservative}
            >
              {conservativeWins} in 100
            </tspan>
          </WinCountText>

          <WinCountText x={margin.left} y={logoYPosition} textAnchor="start">
            <tspan>The </tspan>
            <tspan className="party-name" fill={partyColors.liberal}>
              Liberals
            </tspan>
            <tspan> win </tspan>
            <tspan
              dy="1.2em"
              x={margin.left}
              className="win-count"
              fill={partyColors.liberal}
            >
              {liberalWins} in 100
            </tspan>
          </WinCountText>

          {/* end axis lines and labels */}
          <AxisLine
            x1={margin.left}
            y1={axisYPosition - verticalAxisHeight}
            x2={margin.left}
            y2={axisYPosition}
            isVertical={true}
            color={partyColors.liberal}
          />
          <AxisLabel
            x={margin.left}
            y={axisYPosition + 25}
            textAnchor="middle"
            color={partyColors.liberal}
          >
            +{Math.ceil((maxAbsMargin * scalePaddingFactor) / 20) * 20}
          </AxisLabel>

          <AxisLine
            x1={width - margin.right}
            y1={axisYPosition - verticalAxisHeight}
            x2={width - margin.right}
            y2={axisYPosition}
            isVertical={true}
            color={partyColors.conservative}
          />
          <AxisLabel
            x={width - margin.right}
            y={axisYPosition + 25}
            textAnchor="middle"
            color={partyColors.conservative}
          >
            +{Math.ceil((maxAbsMargin * scalePaddingFactor) / 20) * 20}
          </AxisLabel>

          {/* margin labels */}
          <AxisLabel
            x={margin.left}
            y={axisYPosition + 45}
            textAnchor="middle"
            isMarginLabel={true}
            color={partyColors.liberal}
          >
            seat margin
            <tspan dy="1.1em" x={margin.left}>
              MARGIN
            </tspan>
          </AxisLabel>
          <AxisLabel
            x={width - margin.right}
            y={axisYPosition + 45}
            textAnchor="middle"
            isMarginLabel={true}
            color={partyColors.conservative}
          >
            seat margin
            <tspan dy="1.1em" x={width - margin.right}>
              MARGIN
            </tspan>
          </AxisLabel>

          {/* simulation dots */}
          <g>
            {nodes.map((node) => (
              <Dot
                key={node.id}
                cx={node.x ?? 0}
                cy={node.y ?? 0}
                r={dotRadius}
                fill={node.color}
              />
            ))}
          </g>
        </StyledSVG>
      </SwarmContainer>

      <Legend>
        <LegendItem>
          <LegendColor color={partyColors.liberal} />
          <LegendText>Liberal majority</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendColor color={leanColors.liberal} />
          <LegendText>Liberal minority</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendColor color={partyColors.conservative} />
          <LegendText>Conservative majority</LegendText>
        </LegendItem>
        <LegendItem>
          <LegendColor color={leanColors.conservative} />
          <LegendText>Conservative minority</LegendText>
        </LegendItem>
        {ties > 0 && (
          <LegendItem>
            <LegendColor color={tieColor} />
            <LegendText>tie</LegendText>
          </LegendItem>
        )}
      </Legend>
    </>
  );
}

export default BallSwarm;
