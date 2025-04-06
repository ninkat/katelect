import { useState } from 'react';
import styled from 'styled-components';
import PollingChart from './PollingChart';
import PollingTable from './PollingTable';
import { pollingData } from './PollingData';

// styled components for the polls page
const PollsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 2rem;
  min-height: calc(100vh - 89px);
`;

const SectionTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 2rem;
  color: #333333;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eaeaea;
`;

const Description = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #444444;
  margin-bottom: 2rem;
  max-width: 800px;
`;

const Polls = () => {
  const [polls] = useState(pollingData);

  return (
    <PollsContainer>
      <SectionTitle>Federal Polling</SectionTitle>
      <Description>
        This page displays the latest federal polling data from various polling
        firms. The line chart shows the trend of voting intentions over time,
        while the table below provides detailed information for each poll.
      </Description>

      <PollingChart polls={polls} />
      <PollingTable />
    </PollsContainer>
  );
};

export default Polls;
