import kat from '/src/assets/katelectlogo.svg';
import styled from 'styled-components';
import { useState, useEffect } from 'react';
import ProjectedSeats from './ProjectedSeats';
import ElectoralMap from './ElectoralMap';
import About from './About';
import Polls from './Polls';
import BallSwarm from './BallSwarm';

// styled components for the homepage
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0;
  background-color: #fafafa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #eaeaea;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  height: 110px;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: -0.95rem;
  padding-left: calc(50vw - 50% + 2rem);
  padding-top: 0.5rem;
`;

const Logo = styled.img`
  height: 110px;
  width: auto;
`;

const Title = styled.h1`
  font-family: 'Raleway', sans-serif;
  font-size: 3rem;
  font-weight: 600;
  color: #333333;
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  gap: 0;
  padding-right: calc(50vw - 50% + 2rem);
  height: 100%;
  align-items: flex-end;
`;

const NavLink = styled.a<{ active: boolean }>`
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;
  font-weight: ${(props) => (props.active ? '600' : '400')};
  color: ${(props) => (props.active ? '#333333' : '#666666')};
  text-decoration: none;
  padding: 1.5rem 3rem;
  background-color: ${(props) => (props.active ? '#ffffff' : '#f0f0f0')};
  border: 2px solid #e0e0e0;
  border-bottom: ${(props) => (props.active ? 'none' : '2px solid #e0e0e0')};
  border-radius: 6px 6px 0 0;
  margin-bottom: -2px;
  position: relative;
  z-index: ${(props) => (props.active ? '2' : '1')};
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${(props) =>
    props.active ? 'none' : 'inset 0 -4px 8px -4px rgba(0, 0, 0, 0.1)'};

  &:hover {
    color: #333333;
    background-color: ${(props) => (props.active ? '#ffffff' : '#f8f8f8')};
  }

  &:not(:first-child) {
    margin-left: -2px;
  }
`;

const MainContent = styled.div`
  display: flex;
  min-height: calc(100vh - 89px);
  position: relative;
  margin-top: -1px;
  width: 100%;
`;

interface SidebarProps {
  isSticky: boolean;
}

const Sidebar = styled.aside<SidebarProps>`
  width: 150px;
  background-color: #fafafa;
  padding: 1.25rem 0.75rem;
  border-right: 1px solid #eaeaea;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 10;
`;

const SidebarTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 1.125rem;
  color: #333333;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #eaeaea;
`;

const RegionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const RegionItem = styled.li`
  margin-bottom: 1rem;
`;

const RegionLink = styled.a`
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  color: #666666;
  text-decoration: none;
  display: block;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #333333;
    background-color: #f5f5f5;
  }
`;

const Content = styled.main<{ hasSidebar: boolean }>`
  flex: 1;
  padding: 1rem;
  padding-top: 1rem;
  margin-left: ${(props) => (props.hasSidebar ? '10px' : '0')};
  width: calc(100% - ${(props) => (props.hasSidebar ? '10px' : '0')});
`;

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

function Forecast() {
  const [activeTab, setActiveTab] = useState('forecast');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const headerHeight = 89; // Updated header height
      setIsHeaderVisible(window.scrollY < headerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      <Header>
        <LogoContainer>
          <Logo src={kat} alt="Katelect logo" />
          <Title>polikat</Title>
        </LogoContainer>
        <Nav>
          <NavLink
            href="#forecast"
            active={activeTab === 'forecast'}
            onClick={() => setActiveTab('forecast')}
          >
            Forecast
          </NavLink>
          <NavLink
            href="#polls"
            active={activeTab === 'polls'}
            onClick={() => setActiveTab('polls')}
          >
            Polls
          </NavLink>
          <NavLink
            href="#about"
            active={activeTab === 'about'}
            onClick={() => setActiveTab('about')}
          >
            About
          </NavLink>
        </Nav>
      </Header>
      <MainContent>
        {(activeTab === 'forecast' || activeTab === 'polls') && (
          <Sidebar isSticky={isHeaderVisible}>
            <SidebarTitle>Regions</SidebarTitle>
            <RegionList>
              <RegionItem>
                <RegionLink href={`#${activeTab}-federal`}>Federal</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-alberta`}>Alberta</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-atlantic`}>
                  Atlantic Canada
                </RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-bc`}>
                  British Columbia
                </RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-ontario`}>Ontario</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-prairies`}>
                  Prairies (MB + SK)
                </RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href={`#${activeTab}-quebec`}>Quebec</RegionLink>
              </RegionItem>
            </RegionList>
          </Sidebar>
        )}
        <Content hasSidebar={activeTab === 'forecast' || activeTab === 'polls'}>
          {activeTab === 'forecast' && (
            <>
              <DataSection>
                <BallSwarm />
              </DataSection>

              <DataSection>
                <SectionTitle>Electoral Map</SectionTitle>
                <ElectoralMap />
              </DataSection>

              <DataSection>
                <SectionTitle>Projected Seats</SectionTitle>
                <ProjectedSeats />
              </DataSection>
            </>
          )}
          {activeTab === 'about' && <About />}
          {activeTab === 'polls' && <Polls />}
        </Content>
      </MainContent>
    </div>
  );
}

export default Forecast;
