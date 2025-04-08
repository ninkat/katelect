import styled from 'styled-components';
import { partyColors } from '../types/PartyColors';
import { RawPoll, PartyKey } from '../types/polling';
import { useState, useEffect } from 'react';

// styled components for the polling table
const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  min-height: 480px;
  display: flex;
  flex-direction: column;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Inter', sans-serif;
  background: white;
  table-layout: auto;
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
  position: sticky;
  top: 0;
  background-color: #f5f5f5;
  z-index: 1;
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #eaeaea;
  color: #444444;
  white-space: nowrap;
`;

const PartyCell = styled(TableCell)<{ $party: PartyKey }>`
  color: ${(props) => partyColors[props.$party] || '#444444'};
  font-weight: 500;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  padding-bottom: 1rem;
  gap: 0.25rem;
`;

const PaginationButton = styled.button<{ $active?: boolean }>`
  width: 40px;
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

const LoadingMessage = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #666666;
  text-align: center;
  padding: 2rem;
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface PollingTableProps {
  region: string;
  showBloc: boolean;
}

const PollingTable = ({ region, showBloc }: PollingTableProps) => {
  const [polls, setPolls] = useState<RawPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // determine if we should show sample size column
  const showSampleSize = region === 'federal';

  useEffect(() => {
    const fetchPolls = async () => {
      setLoading(true);
      setError(null);
      setPolls([]);
      setCurrentPage(1);
      try {
        const response = await fetch(
          `http://localhost:8000/api/polls/${region}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch polls: ${response.statusText}`);
        }
        const data: RawPoll[] = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received');
        }
        const sortedData = data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setPolls(sortedData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
        console.error('Error fetching raw polls:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, [region]);

  const totalPages = Math.max(1, Math.ceil(polls.length / itemsPerPage));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = polls.slice(indexOfFirstItem, indexOfLastItem);

  // Create displayItems by taking currentItems and padding with null if needed
  const displayItems: (RawPoll | null)[] = [...currentItems]; // Copy the current items
  while (displayItems.length < itemsPerPage) {
    displayItems.push(null); // Add nulls until length is itemsPerPage
  }
  // Ensure it doesn't exceed itemsPerPage (shouldn't happen with slice, but safe)
  if (displayItems.length > itemsPerPage) {
    displayItems.length = itemsPerPage;
  }

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 3;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, currentPage + 1);

      if (currentPage <= 2) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - 1) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - 1;
        endPage = currentPage + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    return pageNumbers;
  };

  return (
    <TableWrapper>
      {loading && <LoadingMessage>Loading polls...</LoadingMessage>}
      {error && <LoadingMessage>Error: {error}</LoadingMessage>}
      {!loading && !error && polls.length === 0 && (
        <LoadingMessage>No polls found for this region.</LoadingMessage>
      )}
      {!loading && !error && polls.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Pollster</TableHeaderCell>
                {showSampleSize && <TableHeaderCell>Sample</TableHeaderCell>}
                <TableHeaderCell>LPC</TableHeaderCell>
                <TableHeaderCell>CPC</TableHeaderCell>
                <TableHeaderCell>NDP</TableHeaderCell>
                {showBloc && <TableHeaderCell>BQ</TableHeaderCell>}
                <TableHeaderCell>GPC</TableHeaderCell>
                <TableHeaderCell>PPC</TableHeaderCell>
                <TableHeaderCell>Other</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {displayItems.map((poll, index) => (
                <TableRow
                  key={`${poll?.date ?? ''}-${poll?.pollster ?? ''}-${index}`}
                >
                  {poll ? (
                    <>
                      <TableCell>{poll.date}</TableCell>
                      <TableCell>{poll.pollster}</TableCell>
                      {showSampleSize && (
                        <TableCell>
                          {poll.sampleSize
                            ? poll.sampleSize.toLocaleString()
                            : '-'}
                        </TableCell>
                      )}
                      <PartyCell $party="liberal">
                        {Math.round(poll.liberal ?? 0)}%
                      </PartyCell>
                      <PartyCell $party="conservative">
                        {Math.round(poll.conservative ?? 0)}%
                      </PartyCell>
                      <PartyCell $party="ndp">
                        {Math.round(poll.ndp ?? 0)}%
                      </PartyCell>
                      {showBloc && (
                        <PartyCell $party="bloc">
                          {Math.round(poll.bloc ?? 0)}%
                        </PartyCell>
                      )}
                      <PartyCell $party="green">
                        {Math.round(poll.green ?? 0)}%
                      </PartyCell>
                      <PartyCell $party="ppc">
                        {Math.round(poll.ppc ?? 0)}%
                      </PartyCell>
                      <PartyCell $party="other">
                        {Math.round(poll.other ?? 0)}%
                      </PartyCell>
                    </>
                  ) : (
                    <>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      {showSampleSize && <TableCell>&nbsp;</TableCell>}
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      {showBloc && <TableCell>&nbsp;</TableCell>}
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                      <TableCell>&nbsp;</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <PaginationContainer>
              <PaginationButton
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </PaginationButton>
              {getPageNumbers().map((pageNum) => (
                <PaginationButton
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  $active={currentPage === pageNum}
                >
                  {pageNum}
                </PaginationButton>
              ))}
              <PaginationButton
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </PaginationButton>
            </PaginationContainer>
          )}
        </>
      )}
    </TableWrapper>
  );
};

export default PollingTable;
