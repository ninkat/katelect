import styled from 'styled-components';
import { partyColors } from './PartyColors';
import { Poll } from './PollingData';
import { useState } from 'react';

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
    if (props.lead.includes('BQ')) return partyColors.bloc;
    return '#333333';
  }};
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  gap: 0.25rem;
`;

const PaginationButton = styled.button<{ active?: boolean }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0e0e0;
  background-color: ${(props) => (props.active ? '#ffffff' : '#f0f0f0')};
  color: ${(props) => (props.active ? '#333333' : '#666666')};
  font-weight: ${(props) => (props.active ? '600' : '400')};
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  box-shadow: ${(props) =>
    props.active ? 'none' : 'inset 0 -4px 8px -4px rgba(0, 0, 0, 0.1)'};

  &:hover {
    color: #333333;
    background-color: ${(props) => (props.active ? '#ffffff' : '#f8f8f8')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f0f0f0;
    box-shadow: none;
  }

  &:not(:first-child) {
    margin-left: -2px;
  }
`;

interface PollingTableProps {
  polls: Poll[];
  showBloc?: boolean;
}

const PollingTable = ({ polls, showBloc = false }: PollingTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate total pages
  const totalPages = Math.ceil(polls.length / itemsPerPage);

  // Get current page data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = polls.slice(indexOfFirstItem, indexOfLastItem);

  // Create array of 10 items, filling with empty items if needed
  const displayItems = Array(10)
    .fill(null)
    .map((_, index) => currentItems[index] || null);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pageNumbers.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pageNumbers.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pageNumbers.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }

    return pageNumbers;
  };

  return (
    <div>
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
              {showBloc && <TableHeaderCell>BQ</TableHeaderCell>}
              <TableHeaderCell>GPC</TableHeaderCell>
              <TableHeaderCell>PPC</TableHeaderCell>
              <TableHeaderCell>Other</TableHeaderCell>
              <TableHeaderCell>Lead</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {displayItems.map((poll, index) => (
              <TableRow key={poll?.id || `empty-${index}`}>
                {poll ? (
                  <>
                    <TableCell>{poll.date}</TableCell>
                    <TableCell>{poll.pollster}</TableCell>
                    <TableCell>{poll.sampleSize}</TableCell>
                    <PartyCell party="liberal">{poll.liberal}%</PartyCell>
                    <PartyCell party="conservative">
                      {poll.conservative}%
                    </PartyCell>
                    <PartyCell party="ndp">{poll.ndp}%</PartyCell>
                    {showBloc && (
                      <PartyCell party="bloc">{poll.bloc}%</PartyCell>
                    )}
                    <PartyCell party="green">{poll.green}%</PartyCell>
                    <PartyCell party="ppc">{poll.ppc}%</PartyCell>
                    <PartyCell party="other">{poll.other}%</PartyCell>
                    <LeadCell lead={poll.lead}>{poll.lead}</LeadCell>
                  </>
                ) : (
                  <>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    {showBloc && <TableCell>&nbsp;</TableCell>}
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                    <TableCell>&nbsp;</TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <PaginationContainer>
          <PaginationButton
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            ‹
          </PaginationButton>
          {getPageNumbers().map((pageNum) => (
            <PaginationButton
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              active={currentPage === pageNum}
            >
              {pageNum}
            </PaginationButton>
          ))}
          <PaginationButton
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            ›
          </PaginationButton>
        </PaginationContainer>
      )}
    </div>
  );
};

export default PollingTable;
