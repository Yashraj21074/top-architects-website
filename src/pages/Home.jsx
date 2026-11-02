import { useEffect, useState } from 'react';
import HeroMedia from '../components/HeroMedia.jsx';
import { Link } from 'react-router-dom';
import Img from '../components/Img.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import FounderPlate from '../components/FounderPlate.jsx';
import { Parallax, Reveal, Words, useMagnetic } from '../components/motion.jsx';
import { PROJECTS } from '../content/projects.js';
import { SERVICES } from '../content/services.js';
import { STUDIO } from '../content/studio.js';
import { useScrollProgress } from '../lib/useScroll.js';
import { useTitle } from '../hooks/useTitle.js';
import { unlockSpeech } from '../lib/speech.js';
let introPlayed = false;

export default function Home() {
  const [intro] = useState(() => !introPlayed && !matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { introPlayed = true; }, []);
  useTitle('', STUDIO.intro);
  const heroRef = useScrollProgress('exit'), mag = useMagnetic();
  const featured = PROJECTS.filter((p) => p.published).slice(0, 4), f = STUDIO.founder;
  return (
    <>
      <section className={`hero2${intro ? ' hero2--intro' : ''}`} ref={heroRef} aria-labelledby="hero-title">
        <div className="hero2__text">
          <span className="eyebrow hero2__est hs" style={{ '--sd': intro ? '.15s' : '0s' }}>Navi Mumbai · Est. {STUDIO.established}</span>
          <h1 id="hero-title" className="hero2__statement hs" style={{ '--sd': intro ? '.4s' : '0s' }}>Spaces shaped by material, light and context.</h1>
          <p className="hero2__body hs" style={{ '--sd': intro ? '.65s' : '0s' }}>{STUDIO.intro}</p>
          <div className="hero2__actions hs" style={{ '--sd': intro ? '.9s' : '0s' }}>
            <Link to="/projects" ref={mag} className="btn btn--solid hero2__primary">Explore selected work <span className="arrow" aria-hidden="true">→</span></Link>
            <Link to="/studio" className="link hero2__secondary">Meet the studio</Link>
          </div>
        </div>
        <HeroMedia video={STUDIO.heroVideo} />
      </section>

      <section className="section home-intro">
        <span className="home-intro__year" aria-hidden="true">{STUDIO.established}</span>
        <div className="wrap home-intro__in">
          <Words as="p" className="statement" text={STUDIO.intro} />
          <Reveal delay={150}><Link to="/studio" className="link">About the studio</Link></Reveal>
        </div>
      </section>

      <section className="section section--stone">
        <div className="wrap">
          <div className="head"><div><span className="eyebrow">TOP design explorations</span><Words text="Selected directions" /></div><Link to="/projects" className="link">Explore the portfolio</Link></div>
          <div className="feat">{featured.map((p, i) => <ProjectCard key={p.slug} p={p} tall={i === 1} sizes={i === 0 ? '(max-width: 860px) 100vw, 58vw' : '(max-width: 860px) 100vw, 40vw'} />)}</div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="head"><div><span className="eyebrow">Services</span><Words text="Five disciplines" /></div><Link to="/services" className="link">Explore services</Link></div>
          <div className="svc">{SERVICES.map((s, i) => (
            <Link key={s.slug} to="/services" data-cursor="link"><span className="n">0{i + 1}</span><h3>{s.title}</h3><p>{s.tag}</p><span className="arrow-col" aria-hidden="true">→</span></Link>
          ))}</div>
        </div>
      </section>

      <section className="section section--stone">
        <div className="wrap split split--rev">
          <Parallax speed={40} className="a"><FounderPlate /></Parallax>
          <Reveal className="b">
            <span className="eyebrow">Founder &amp; Principal</span>
            <h2 style={{ margin: '1rem 0 .8rem' }}>{f.name}</h2>
            <p className="meta-line">{f.title} · {f.qualification}</p>
            <p className="lead">{f.intro}</p>
            <Link to="/team" className="link">Founder profile</Link>
          </Reveal>
        </div>
      </section>

      <section className="banner" aria-labelledby="rec-t">
        <Parallax speed={80} className="banner__bg"><Img id="interior-stair" tag={false} sizes="100vw" /></Parallax>
        <div className="wrap"><Reveal>
          <span className="eyebrow" style={{ color: '#e6cfa3' }}>3D Reception</span>
          <h2 id="rec-t">Be welcomed at the studio.</h2>
          <Link to="/reception" className="btn btn--light" onClick={unlockSpeech}>Enter 3D Reception</Link>
        </Reveal></div>
      </section>

      <section className="section">
        <div className="wrap closing">
          <Words text="Let’s talk." className="closing__t" />
          <Reveal delay={120}><a className="closing__mail" href={`mailto:${STUDIO.contact.email}`}>{STUDIO.contact.email}</a></Reveal>
          <Reveal delay={200}><Link to="/contact" className="btn btn--solid">Contact the studio</Link></Reveal>
        </div>
      </section>
    </>
  );
}
