import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import * as d3 from 'd3';

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

interface RidingData {
  id: string;
  name: string;
  province: string;
  party: string;
  margin: number;
}

// synthetic data - this would eventually come from an API or database
const ridingData: RidingData[] = [
  {
    id: '10001',
    name: 'Toronto Centre',
    province: 'Ontario',
    party: 'Liberal',
    margin: 12.5,
  },
  {
    id: '10002',
    name: 'Calgary Centre',
    province: 'Alberta',
    party: 'Conservative',
    margin: 8.3,
  },
  {
    id: '10003',
    name: 'Vancouver Centre',
    province: 'British Columbia',
    party: 'Liberal',
    margin: 5.7,
  },
  {
    id: '10004',
    name: 'Montreal Centre',
    province: 'Quebec',
    party: 'Bloc Québécois',
    margin: 15.2,
  },
  {
    id: '10005',
    name: 'Halifax',
    province: 'Nova Scotia',
    party: 'Liberal',
    margin: 3.1,
  },
  {
    id: '10006',
    name: 'Winnipeg Centre',
    province: 'Manitoba',
    party: 'New Democrat',
    margin: 4.8,
  },
  {
    id: '10007',
    name: 'Regina Centre',
    province: 'Saskatchewan',
    party: 'Conservative',
    margin: 10.2,
  },
  {
    id: '10008',
    name: "St. John's East",
    province: 'Newfoundland and Labrador',
    party: 'Liberal',
    margin: 6.9,
  },
  {
    id: '10009',
    name: 'Yellowknife',
    province: 'Northwest Territories',
    party: 'Liberal',
    margin: 2.5,
  },
  {
    id: '10010',
    name: 'Whitehorse',
    province: 'Yukon',
    party: 'Liberal',
    margin: 1.8,
  },
];

// party colors
const partyColors: Record<string, string> = {
  Liberal: '#D71920',
  Conservative: '#1A4782',
  'New Democrat': '#F37021',
  'Bloc Québécois': '#33B2CC',
  Green: '#3D9B35',
  "People's Party": '#4B306A',
  Independent: '#808080',
};

// function to format riding names
const formatRidingName = (name: string): string => {
  return name.replace(/_/g, ' ');
};

const ElectoralMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear any existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // set up dimensions
    const width = 800;
    const height = 600;
    const margin = { top: 0, right: 0, bottom: 0, left: 0 };

    // make svg responsive
    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create a group for the map
    const mapGroup = svg.append('g');

    // Load the map data
    d3.xml('/src/assets/mapchart.svg').then((data) => {
      // Extract the path elements from the SVG
      const paths = data.documentElement.querySelectorAll('path');

      // Create a map of riding IDs to their data
      const ridingMap = new Map(ridingData.map((d) => [d.id, d]));

      // Process each path
      paths.forEach((path) => {
        const id = path.getAttribute('id');
        if (!id) return;

        // Create a D3 selection for this path
        const pathSelection = d3.select(path);

        // Get the riding data for this path
        const riding = ridingMap.get(id) || {
          id,
          name: formatRidingName(`${id}`),
          province: 'Unknown',
          party: 'Independent',
          margin: 0,
        };

        // Set the fill color based on the party
        pathSelection
          .attr('fill', partyColors[riding.party] || '#808080')
          .attr('stroke', '#fff')
          .attr('stroke-width', 0.5)
          .attr('opacity', 0.8);

        // Add hover effects
        pathSelection
          .on('mouseover', function (event) {
            d3.select(this)
              .attr('opacity', 1)
              .attr('stroke-width', 1)
              .attr('filter', 'brightness(1.2)');

            // show tooltip with just the riding name
            setTooltipData({
              x: event.clientX,
              y: event.clientY,
              content: formatRidingName(riding.name),
            });
          })
          .on('mousemove', function (event) {
            // update tooltip position as cursor moves
            setTooltipData({
              x: event.clientX,
              y: event.clientY,
              content: formatRidingName(riding.name),
            });
          })
          .on('mouseout', function () {
            d3.select(this)
              .attr('opacity', 0.8)
              .attr('stroke-width', 0.5)
              .attr('filter', 'none');

            // hide tooltip
            setTooltipData(null);
          });

        // Add the path to our map group
        mapGroup.node()?.appendChild(path);
      });

      // Add zoom behavior
      const zoom = d3
        .zoom<SVGGElement, unknown>()
        .scaleExtent([1, 8])
        .on('zoom', (event) => {
          mapGroup.attr('transform', event.transform);
        });

      // Apply zoom to the SVG
      svg.call(zoom);

      // Center the map
      const bounds = mapGroup.node()?.getBBox();
      if (bounds) {
        // adjust scale to fill the viewport while keeping the entire map visible
        const scale =
          Math.min(
            (width - margin.left - margin.right) / bounds.width,
            (height - margin.top - margin.bottom) / bounds.height
          ) * 1.57; // slightly smaller to ensure it all fits

        const translate = [
          (width - bounds.width * scale) / 2,
          (height - bounds.height * scale) / 2 - 50,
        ];

        // Apply initial transform
        svg.call(
          zoom.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
    });
  }, []);

  // add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!svgRef.current) return;

      // update svg dimensions on resize
      const width = 800;
      const height = 600;

      d3.select(svgRef.current)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add event listeners to prevent default browser behavior
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Function to prevent default behavior
    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    // Add event listeners for mouse wheel, touch, and drag events
    svg.addEventListener('wheel', preventDefault, { passive: false });
    svg.addEventListener('touchmove', preventDefault, {
      passive: false,
    });
    svg.addEventListener('touchstart', preventDefault, {
      passive: false,
    });
    svg.addEventListener('touchcancel', preventDefault, {
      passive: false,
    });
    svg.addEventListener('touchforcechange', preventDefault, {
      passive: false,
    });
    svg.addEventListener('touchend', preventDefault, {
      passive: false,
    });
    svg.addEventListener('dragstart', preventDefault, {
      passive: false,
    });
    svg.addEventListener('drag', preventDefault, { passive: false });
    svg.addEventListener('dragend', preventDefault, {
      passive: false,
    });

    // Clean up event listeners
    return () => {
      svg.removeEventListener('wheel', preventDefault);
      svg.removeEventListener('touchmove', preventDefault);
      svg.removeEventListener('touchstart', preventDefault);
      svg.removeEventListener('touchcancel', preventDefault);
      svg.removeEventListener('touchforcechange', preventDefault);
      svg.removeEventListener('touchend', preventDefault);
      svg.removeEventListener('dragstart', preventDefault);
      svg.removeEventListener('drag', preventDefault);
      svg.removeEventListener('dragend', preventDefault);
    };
  }, []);

  return (
    <>
      <svg ref={svgRef} style={{ width: '100%', height: '600px' }}></svg>
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
    </>
  );
};

export default ElectoralMap;
