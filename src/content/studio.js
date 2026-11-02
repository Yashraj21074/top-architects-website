// Central studio / contact configuration. Only CONFIRMED information is stored here. Anything not supplied stays null and is simply not shown.
export const STUDIO = {
  name: 'TOP ARCHITECTS + PARTNERS',
  short: 'TOP Architects',
  established: 2026,
  headline: 'TOP ARCHITECTS + PARTNERS',
  // Optional cinematic hero video. None has been supplied, so the hero shows the existing render. To enable, set e.g.
  // heroVideo: { sources: [{ src: '/video/hero.mp4', type: 'video/mp4' }, { src: '/video/hero.webm', type: 'video/webm' }], poster: '/img/hero/hero-1100.webp' }
  heroVideo: null,
  disciplines: ['Architecture', 'Interiors', 'Planning', 'Visualization', 'Consultancy'],
  intro: 'A founder-led architecture practice established in 2026, working across architecture, interior design, planning, visualization and consultancy.',
  founder: {
    name: 'Ar. Saurabh S Jadhav',
    title: 'Founder & Principal',
    qualification: 'B.Arch., M.Arch.',
    portrait: null,          // e.g. '/img/team/saurabh-jadhav.jpg' once supplied (portrait, 4:5, 1600 px+ wide)
    intro: 'Ar. Saurabh S Jadhav is the Founder & Principal of TOP ARCHITECTS + PARTNERS, the practice he established in 2026.',
  },
  contact: {
    email: 'Info@toparchitectspartners.com',
    phones: [{ label: 'Mumbai / India', number: '+91 7208589360' }, { label: 'London / UK', number: '+44 7780154030' }],
    address: ['Shelton Sapphire B, 708 / 708-B, 7th Floor', 'Plot No. 18 & 19, Sector 15', 'CBD Belapur, Navi Mumbai', 'Maharashtra, India – 400614'],
    locationShort: 'CBD Belapur, Navi Mumbai, Maharashtra, India',
  },
  // Add a URL only when a real profile exists; nothing is shown (and no QR) until then.
  social: { instagram: { url: null, qr: null }, facebook: { url: null, qr: null }, linkedin: { url: null, qr: null } },
  // Professional organisations named in the supplied material. These are NOT educational institutions, and no membership,
  // registration or status is claimed — they are listed by name only.
  professionalBodies: ['Council of Architecture', 'Royal Institute of British Architects (RIBA)'],
};
export const telHref = (n) => 'tel:' + n.replace(/[^+\d]/g, '');
export const mapsHref = () => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(STUDIO.contact.address.join(', '));
