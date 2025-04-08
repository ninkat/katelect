import styled from 'styled-components';
import PollingChart from './PollingChart';
import PollingTable from './PollingTable';

// styled components for the regional polls
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

// map of region codes to display names
const regionDisplayMap: Record<string, string> = {
  federal: 'Federal',
  alberta: 'Alberta',
  atlantic: 'Atlantic Canada',
  bc: 'British Columbia',
  ontario: 'Ontario',
  prairies: 'Prairies (MB + SK)',
  quebec: 'Quebec',
};

// Props now only include region
interface RegionalPollsProps {
  region: string;
}

const RegionalPolls = ({ region }: RegionalPollsProps) => {
  // Remove all state management (region, validRegions)
  // Remove all useEffect hooks (fetchValidRegions, hash listeners)

  // Determine if Bloc should be shown based on the passed region prop
  const showBloc = region === 'quebec' || region === 'federal';

  return (
    <>
      <DataSection>
        <SectionTitle>
          {/* Use passed region prop for title */}
          {regionDisplayMap[region] || 'Federal'} Polling Trends
        </SectionTitle>
        {/* Pass region and showBloc to PollingChart */}
        {/* PollingChart will fetch its own data based on region */}
        <PollingChart region={region} showBloc={showBloc} />
      </DataSection>

      <DataSection>
        <SectionTitle>Individual Polls</SectionTitle>
        {/* Pass region and showBloc to PollingTable */}
        {/* PollingTable will fetch its own data based on region */}
        <PollingTable region={region} showBloc={showBloc} />
      </DataSection>
    </>
  );
};

export default RegionalPolls;
