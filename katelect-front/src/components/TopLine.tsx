import styled from 'styled-components';

// styled components for the visualization
const Container = styled.div`
  width: 100%;
  background-color: white;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 40px;
  background-color: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  margin-top: 1rem;
`;

const BarSegment = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${(props) => props.width}%;
  background-color: ${(props) => props.color};
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 0.875rem;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendColor = styled.div<{ color: string }>`
  width: 16px;
  height: 16px;
  background-color: ${(props) => props.color};
  border-radius: 4px;
`;

const LegendText = styled.span`
  font-size: 1rem;
  color: #666666;
`;

// synthetic data for the visualization
const data = [
  { label: 'Liberal Majority', value: 72, color: '#d71920' },
  { label: 'Liberal Minority', value: 12, color: '#F4A6A8' },
  { label: 'Conservative Minority', value: 14, color: '#90A8C3' },
  { label: 'Conservative Majority', value: 2, color: '#003F72' },
];

function TopLine() {
  return (
    <Container>
      <BarContainer>
        {data.map((item) => (
          <BarSegment key={item.label} width={item.value} color={item.color}>
            {item.value > 1 ? `${item.value}%` : ''}
          </BarSegment>
        ))}
      </BarContainer>
      <Legend>
        {data.map((item) => (
          <LegendItem key={item.label}>
            <LegendColor color={item.color} />
            <LegendText>{item.label}</LegendText>
          </LegendItem>
        ))}
      </Legend>
    </Container>
  );
}

export default TopLine;
