import { useState } from 'react';
import styled from 'styled-components';
import PollingChart from './PollingChart';
import PollingTable from './PollingTable';
import { pollingData } from './PollingData';

const DataSection = styled.section`
  margin: 0.25rem 0 0.5rem 0;
  width: 100%;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
  padding: 1rem;
  overflow: hidden;
`;

const SectionTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 2rem;
  color: #333333;
  margin-bottom: 0.25rem;
`;

const Description = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #444444;
  margin-bottom: 1rem;
`;

const Polls = () => {
  const [polls] = useState(pollingData);

  return (
    <>
      <DataSection>
        <SectionTitle>Federal Polling</SectionTitle>
        <PollingChart polls={polls} />
      </DataSection>

      <DataSection>
        <SectionTitle>Individual Polls</SectionTitle>
        <PollingTable />
      </DataSection>
    </>
  );
};

export default Polls;
