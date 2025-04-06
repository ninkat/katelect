import { useState } from 'react';
import styled from 'styled-components';
import { Poll, pollingData } from './PollingData';
import { partyColors } from './PartyColors';

// styled components for the polling table
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Inter', sans-serif;
  background: white;
`;

const TableHeader = styled.thead`
  background-color: #f5f5f5;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background-color: #fafafa;
  }

  &:hover {
    background-color: #f0f0f0;
  }
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333333;
  border-bottom: 2px solid #eaeaea;
  white-space: nowrap;
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #eaeaea;
  color: #444444;
`;

const PartyCell = styled(TableCell)<{ party: keyof typeof partyColors }>`
  color: ${(props) => partyColors[props.party]};
  font-weight: 500;
`;

const LeadCell = styled(TableCell)<{ lead: string }>`
  font-weight: 600;
  color: ${(props) => {
    if (props.lead.includes('LPC')) return partyColors.liberal;
    if (props.lead.includes('CPC')) return partyColors.conservative;
    return '#333333';
  }};
`;

const PollingTable = () => {
  const [polls] = useState<Poll[]>(pollingData);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Pollster</TableHeaderCell>
            <TableHeaderCell>Sample</TableHeaderCell>
            <TableHeaderCell>LPC</TableHeaderCell>
            <TableHeaderCell>CPC</TableHeaderCell>
            <TableHeaderCell>NDP</TableHeaderCell>
            <TableHeaderCell>BQ</TableHeaderCell>
            <TableHeaderCell>GPC</TableHeaderCell>
            <TableHeaderCell>PPC</TableHeaderCell>
            <TableHeaderCell>Other</TableHeaderCell>
            <TableHeaderCell>Lead</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {polls.map((poll) => (
            <TableRow key={poll.id}>
              <TableCell>{poll.date}</TableCell>
              <TableCell>{poll.pollster}</TableCell>
              <TableCell>{poll.sampleSize}</TableCell>
              <PartyCell party="liberal">{poll.liberal}%</PartyCell>
              <PartyCell party="conservative">{poll.conservative}%</PartyCell>
              <PartyCell party="ndp">{poll.ndp}%</PartyCell>
              <PartyCell party="bloc">{poll.bloc}%</PartyCell>
              <PartyCell party="green">{poll.green}%</PartyCell>
              <PartyCell party="ppc">{poll.ppc}%</PartyCell>
              <PartyCell party="other">{poll.other}%</PartyCell>
              <LeadCell lead={poll.lead}>{poll.lead}</LeadCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default PollingTable;
