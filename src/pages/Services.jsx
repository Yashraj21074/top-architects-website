import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Ribbon from '../components/Ribbon.jsx';
import SpatialDiagram from '../components/SpatialDiagram.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { SERVICES } from '../content/services.js';
import { STUDIO } from '../content/studio.js';
import { IMAGES, imgSrc, imgSrcSet } from '../content/images.js';
import { useScrollProgress } from '../lib/useScroll.js';
import { useTitle } from '../hooks/useTitle.js';

const A = (n) => `/img/artwork/${n}.webp`;
const ART_IDS = {
  villa: 'render-villa-cantilever', facade: 'render-villa-entry',
  living: 'render-interior-living', bedroom: 'render-interior-mezzanine',
  panorama: 'render-hospitality-resort', materials: 'render-landscape-pavilion-close',
  sketch: 'render-commercial-facade', books: 'render-civic-atrium',
};
const Art = ({ n, alt, w, h, className = '', ...r }) => {
  const id = ART_IDS[n];
  return <img className={`art ${className}`} src={id ? imgSrc(id, 1400) : A(n)} srcSet={id ? imgSrcSet(id) : undefined}
    sizes={n === 'panorama' ? '100vw' : '(max-width: 900px) 100vw, 56vw'} width={w} height={h} alt={alt}
    loading="lazy" decoding="async" style={id ? { objectPosition: IMAGES[id]?.pos } : undefined} {...r} />;
};
const seq = (p, el) => { el.dataset.step = p < 0.3 ? 0 : p < 0.55 ? 1 : p < 0.78 ? 2 : 3; };      // planning: interior → drawing → masterplan → diagram
const seq5 = (p, el) => { el.dataset.step = p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : 3; };      // consultancy: image → material → detail → decision

/** Staggered heading block: number → tag → title (word by word) → description, material tags and "Related studies" (which slide in from `dir`, the block's own side). */
function Head({ n, title, tag, children, onDark = false, dir = 'left' }) {
  return (
    <div className={`svx-head ${onDark ? 'svx-head--dark' : ''}`}>
      <Reveal className="svx-numw"><span className="svx-num" aria-hidden="true">{n}</span></Reveal>
      <Reveal as="span" className="svx-tag" delay={90}>{tag}</Reveal>
      <Words as="h2" className="svx-title" text={title.toUpperCase()} delay={160} />
      <Reveal variant={dir} delay={380}>{children}</Reveal>
    </div>
  );
}
const Detail = ({ items }) => <ul className="svx-detail">{items.map((t, i) => <li key={t} style={{ '--i': i }}>{t}</li>)}</ul>;
const More = ({ slug }) => <Link className="link" to={`/services/${slug}`}>Related design explorations</Link>;

export default function Services() {
  useTitle('Services', 'Architecture, Interior Design, Planning & Spatial Design, Architectural Visualization and Design Consultancy.');
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.ch)); }), { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.svx [data-ch]').forEach((el) => io.observe(el)); return () => io.disconnect();
  }, []);
  const heroRef = useScrollProgress('pin'), planRef = useScrollProgress('pin', seq), visRef = useScrollProgress('pin'), conRef = useScrollProgress('pin', seq5);
  const S = SERVICES;
  const ch1 = useScrollProgress('pass'), ch2 = useScrollProgress('pass');

  return (
    <div className="svx">
      <nav className="svx-rail" aria-label="Services chapters">{S.map((s, i) => <a key={s.slug} href={`#svc-${i + 1}`} aria-label={s.title} aria-current={active === i ? 'true' : undefined}><b>0{i + 1}</b><span>{s.tag}</span></a>)}</nav>

      {/* ---------- opening: the artwork, opening into the page ---------- */}
      <section className="svx-hero" ref={heroRef} aria-labelledby="svx-h1">
        <div className="svx-hero__stage">
          <div className="svx-hero__art"><img src="/img/artwork/ribbon-1800.webp" srcSet="/img/artwork/ribbon-1254.webp 1254w, /img/artwork/ribbon-1800.webp 1800w" sizes="(max-width: 900px) 100vw, 90svh" width="1800" height="1800" fetchpriority="high" alt="Architectural collage: a luxury residence, interiors, masterplan drawings and material samples framed by flowing ivory and gold ribbon forms, with the TOP ARCHITECTS + PARTNERS emblem at the centre." /></div>
          <svg className="svx-hero__ribbon" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M-40 420 C 200 180, 420 520, 640 300 S 900 120, 1060 220" /><path d="M-40 470 C 220 230, 440 570, 660 350 S 920 170, 1060 270" /></svg>
          <div className="svx-hero__top"><h1 id="svx-h1">SERVICES</h1><p>Architecture · Interiors · Planning · Visualization · Consultancy</p></div>
          <p className="svx-hero__brand">TOP ARCHITECTS + PARTNERS</p>
          <div className="svx-hero__next" aria-hidden="true"><span>01</span></div>
          <span className="svx-hero__cue" aria-hidden="true">Scroll</span>
        </div>
      </section>

      {/* ---------- 01 ARCHITECTURE — Building ---------- */}
      <section className="svx-ch svx-ch--1" id="svc-1" data-ch="0">
        <div className="wrap svx-ch__grid">
          <div className="svx-ch__txt"><Head n="01" title={S[0].title} tag={S[0].tag}><p className="svx-lead">{S[0].lead}</p><Detail items={['Stone', 'Timber', 'Glass', 'Landscape', 'City context', 'Drawings']} /><More slug="architecture" /></Head></div>
          <div className="svx-ch__vis" ref={ch1}>
            <Reveal variant="mask"><div className="svx-frame svx-frame--expand"><Art n="villa" w="1040" h="740" alt="Conceptual luxury residence of stone, timber and glass beside a reflecting pool at sunset." /></div></Reveal>
            <div className="svx-pair">
              <Parallax speed={50}><Reveal variant="maskx"><Art n="facade" w="620" h="400" alt="Arrival view of a cantilevered residence, with a sheltered stone entrance and glazed ground floor." /></Reveal></Parallax>
              <Reveal delay={150}><p className="svx-cap">Stone · timber · glass · landscape</p></Reveal>
            </div>
          </div>
        </div>
      </section>
      <Ribbon />

      {/* ---------- 02 INTERIOR DESIGN — Space ---------- */}
      <section className="svx-ch svx-ch--2" id="svc-2" data-ch="1">
        <div className="wrap svx-ch__grid svx-ch__grid--rev">
          <div className="svx-ch__vis" ref={ch2}>
            <Reveal variant="mask"><div className="svx-frame svx-frame--expand svx-frame--tall"><Art n="living" w="788" h="840" alt="Conceptual living space with natural stone, warm timber panelling and large glazing over a city view." /></div></Reveal>
            <Parallax speed={-90} className="svx-float"><Reveal variant="maskxr"><Art n="bedroom" w="760" h="700" alt="Conceptual interior mezzanine with a floating timber stair and double-height living space." /></Reveal></Parallax>
          </div>
          <div className="svx-ch__txt"><Head n="02" dir="right" title={S[1].title} tag={S[1].tag}><p className="svx-lead">{S[1].lead}</p><Detail items={['Warm timber', 'Natural stone', 'Soft lighting', 'Large glazing', 'Material detail']} /><More slug="interior-design" /></Head></div>
        </div>
      </section>
      <Ribbon flip />

      {/* ---------- 03 PLANNING & SPATIAL DESIGN — Context (interior → drawing → masterplan → diagram) ---------- */}
      <section className="svx-plan" id="svc-3" data-ch="2" data-step="0" ref={planRef}>
        <div className="svx-plan__stage">
          <div className="wrap svx-plan__grid">
            <div className="svx-ch__txt">
              <Head n="03" title={S[2].title} tag={S[2].tag}><p className="svx-lead">{S[2].lead}</p>
                <ol className="svx-seq" aria-label="From building to site to city"><li>Interior</li><li>Drawing</li><li>Masterplan</li><li>Spatial diagram</li></ol><More slug="planning" /></Head>
            </div>
            <div className="svx-plan__vis">
              <div className="svx-l svx-l1"><Art n="living" w="788" h="840" alt="" aria-hidden="true" /></div>
              <div className="svx-l svx-l2"><Art n="plans" w="1260" h="500" alt="Masterplan and site-plan drawings with a landscaped development." /></div>
              <div className="svx-l svx-l3"><SpatialDiagram /></div>
            </div>
          </div>
        </div>
      </section>
      <Ribbon />

      {/* ---------- 04 ARCHITECTURAL VISUALIZATION — Experience (framed image expands to full viewport) ---------- */}
      <section className="svx-vis" id="svc-4" data-ch="3" ref={visRef}>
        <div className="svx-vis__stage">
          <span className="svx-vis__label">04 — Architectural Visualization</span>
          <div className="svx-vis__frame"><Art n="panorama" w="2388" h="1200" className="svx-vis__img" alt="Wide conceptual visualization of terraced resort villas stepping down a hillside toward the sea." /></div>
          <svg className="svx-vis__ribbon" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M-40 520 C 240 300, 460 580, 700 380 S 940 220, 1060 300" /></svg>
          <div className="svx-vis__txt"><Head n="04" title={S[3].title} tag={S[3].tag} onDark><p className="svx-lead">{S[3].lead}</p><More slug="visualization" /></Head></div>
        </div>
      </section>

      {/* ---------- 05 DESIGN CONSULTANCY — Direction (image → material → detail → decision) ---------- */}
      <section className="svx-con" id="svc-5" data-ch="4" data-step="0" ref={conRef}>
        <div className="svx-con__stage">
          <div className="wrap svx-con__grid">
            <div className="svx-ch__txt"><Head n="05" title={S[4].title} tag={S[4].tag}><p className="svx-lead">{S[4].lead}</p>
              <ol className="svx-seq svx-seq--5" aria-label="From image to decision"><li>Image</li><li>Material</li><li>Detail</li><li>Decision</li></ol><More slug="consultancy" /></Head></div>
            <div className="svx-con__vis">
              <div className="svx-c svx-c1"><Art n="materials" w="660" h="400" alt="Close conceptual view of timber roof slats and pale stone paving at a garden pavilion." /></div>
              <div className="svx-c svx-c2"><Art n="sketch" w="690" h="300" alt="Conceptual façade study with vertical limestone fins and shaded glazing." /></div>
              <div className="svx-c svx-c3"><Art n="books" w="640" h="360" alt="Civic hall interior concept opening toward a planted courtyard." /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- closing ---------- */}
      <section className="svx-close">
        <div className="wrap svx-close__in">
          <Words as="h2" className="svx-close__t" text="LET’S CREATE SOMETHING MEANINGFUL." />
          <Reveal delay={150} className="svx-close__who"><span className="svx-close__firm">{STUDIO.name}</span><span className="svx-close__name">{STUDIO.founder.name}</span><span>{STUDIO.founder.title}</span></Reveal>
          <Reveal delay={260}><Link to="/contact" className="btn btn--solid">Start a conversation <span className="arrow" aria-hidden="true">→</span></Link></Reveal>
        </div>
      </section>
    </div>
  );
}
