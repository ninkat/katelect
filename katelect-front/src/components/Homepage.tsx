import kat from '/src/assets/katelectlogo.svg';
import styled from 'styled-components';
import { useState, useEffect } from 'react';
import ProjectedSeats from './ProjectedSeats';
import FederalPolling from './FederalPolling';
import ElectoralMap from './ElectoralMap';
import About from './About';
import Polls from './Polls';

// styled components for the homepage
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0rem 0;
  background-color: #fafafa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #eaeaea;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: -0.95rem;
  padding-left: calc(50vw - 50% + 2rem);
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
  gap: 2rem;
  padding-right: calc(50vw - 50% + 2rem);
`;

const NavLink = styled.a<{ active: boolean }>`
  font-family: 'Inter', sans-serif;
  font-size: 1.25rem;
  color: ${(props) => (props.active ? '#333333' : '#666666')};
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  background-color: ${(props) => (props.active ? '#f5f5f5' : 'transparent')};

  &:hover {
    color: #333333;
    background-color: #f5f5f5;
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
  margin-bottom: 0rem;
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
`;

const SectionTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 2rem;
  color: #333333;
  margin-bottom: 1rem;
`;

function Homepage() {
  const [activeTab, setActiveTab] = useState('home');
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
          <Title>Katelect</Title>
        </LogoContainer>
        <Nav>
          <NavLink
            href="#home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          >
            Home
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
        {(activeTab === 'home' || activeTab === 'polls') && (
          <Sidebar isSticky={isHeaderVisible}>
            <SidebarTitle>Regions</SidebarTitle>
            <RegionList>
              <RegionItem>
                <RegionLink href="#federal">Federal</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#alberta">Alberta</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#atlantic">Atlantic Canada</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#bc">British Columbia</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#ontario">Ontario</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#prairies">Prairies (MB + SK)</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#quebec">Quebec</RegionLink>
              </RegionItem>
              <RegionItem>
                <RegionLink href="#territories">Territories</RegionLink>
              </RegionItem>
            </RegionList>
          </Sidebar>
        )}
        <Content hasSidebar={activeTab === 'home' || activeTab === 'polls'}>
          {activeTab === 'home' && (
            <>
              <DataSection>
                <SectionTitle>Electoral Map</SectionTitle>
                <ElectoralMap />
              </DataSection>

              <DataSection>
                <SectionTitle>Projected Seats</SectionTitle>
                <ProjectedSeats />
              </DataSection>

              <DataSection>
                <SectionTitle>Federal Polling</SectionTitle>
                <FederalPolling />
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

export default Homepage;
