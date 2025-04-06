import styled from 'styled-components';

// styled components for the about page
const AboutContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 0.25rem 1rem;
  min-height: calc(100vh - 89px);
`;

const ContentBlock = styled.div`
  max-width: 800px;
  width: 100%;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
`;

const Section = styled.section`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  font-family: 'Raleway', sans-serif;
  font-size: 1.75rem;
  color: #333333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #eaeaea;
`;

const Paragraph = styled.p`
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #444444;
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const About = () => {
  return (
    <AboutContainer>
      <ContentBlock>
        <Section>
          <SectionTitle>About: Methodology</SectionTitle>
          <Paragraph>
            Our election model is trained on data from the 2021 federal
            election, with each riding treated as its own datapoint. The idea is
            simple: given what we know about a riding — who lives there, how
            they voted last time, and what the national political mood is — can
            we guess how they'll vote again?
          </Paragraph>
          <Paragraph>
            The model is trained on:
            <ul>
              <li>
                Demographics from the 2021 Census (like language, age, income,
                education, immigration, urbanity, and employment)
              </li>
              <li>
                The vote share each party received in 2021 (aligned to the new
                riding boundaries)
              </li>
              <li>General context like party polling averages</li>
            </ul>
          </Paragraph>
          <Paragraph>
            We use national and provincial polling averages to give the model a
            sense of each party's strength at the time. To make these inputs
            more meaningful, we apply polling firm ratings and weightings
            inspired by 338Canada — favoring higher-quality pollsters with
            better track records.
          </Paragraph>
          <Paragraph>
            Once trained, the model can take in new polling data and generate
            vote share estimates for every riding.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>About: Katelect</SectionTitle>
          <Paragraph>
            Katelect is a project by{' '}
            <a href="https://github.com/ninkat">ninkat</a>, an undergraduate
            computer science student with interests in visualization and
            (occasionally) politics. Unfortunately, he doesn't specialize in
            statistics or machine learning, so if you want to help, he would be
            happy to hear you out.
          </Paragraph>
        </Section>
      </ContentBlock>
    </AboutContainer>
  );
};

export default About;
