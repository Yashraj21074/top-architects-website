import { useState } from 'react';
import Img from '../components/Img.jsx';
import { Parallax, Reveal, Words } from '../components/motion.jsx';
import { STUDIO, mapsHref, telHref } from '../content/studio.js';
import { useTitle } from '../hooks/useTitle.js';

export default function Contact() {
  useTitle('Contact', `Contact ${STUDIO.name}.`);
  const c = STUDIO.contact, [sent, setSent] = useState(false), [errors, setErrors] = useState({});
  const socials = Object.entries(STUDIO.social).filter(([, v]) => v.url);
  const qrs = Object.entries(STUDIO.social).filter(([, v]) => v.qr);
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function submit(e) {
    e.preventDefault(); const d = new FormData(e.currentTarget), v = (k) => String(d.get(k) || '').trim(), er = {};
    if (v('name').length < 2) er.name = 'Please enter your name.';
    if (!EMAIL.test(v('email'))) er.email = 'Please enter a valid email address, e.g. name@example.com.';
    if (v('message').length < 10) er.message = 'Please write a short message (at least 10 characters).';
    setErrors(er); setSent(false);
    const first = Object.keys(er)[0]; if (first) { e.currentTarget.elements[first]?.focus(); return; }
    const body = `${v('message')}\n\n— ${v('name')}\n${v('email')}`;
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent('Enquiry from ' + v('name'))}&body=${encodeURIComponent(body)}`;
    setSent(true);                                          // we can only know that the email app was asked to open: nothing is sent from this page
  }
  return (
    <>
      <section className="contact-hero">
        <div className="wrap">
          <span className="eyebrow">Contact</span>
          <Words as="h1" className="contact-hero__t" text="LET’S TALK" />
          <Reveal delay={150}><a className="contact-hero__mail" href={`mailto:${c.email}`}>{c.email}</a></Reveal>
        </div>
      </section>

      <section className="section section--dark contact-sheet">
        <div className="wrap contact-sheet__grid">
          <Reveal><span className="eyebrow">Telephone</span>{c.phones.map((p) => <p key={p.number} className="cs-line"><span className="cs-k">{p.label}</span><a href={telHref(p.number)}>{p.number}</a></p>)}</Reveal>
          <Reveal delay={90}><span className="eyebrow">Office address</span><address className="cs-addr">{c.address.map((l) => <span key={l}>{l}</span>)}</address><a className="link link--light" href={mapsHref()} target="_blank" rel="noopener noreferrer">Open in maps</a></Reveal>
          <Reveal delay={180}><span className="eyebrow">Studio</span><p className="cs-line"><span className="cs-k">{STUDIO.name}</span>Established {STUDIO.established}</p>
            {socials.map(([k, v]) => <p key={k} className="cs-line"><a href={v.url} target="_blank" rel="noopener noreferrer" style={{ textTransform: 'capitalize' }}>{k}</a></p>)}</Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <Reveal className="a">
            <span className="eyebrow">Write to us</span>
            <form className="cform" onSubmit={submit} noValidate>
              {[['name', 'Name', 'text', 'name'], ['email', 'Email', 'email', 'email']].map(([k, l, t, ac]) => (
                <label key={k}>{l} <span className="req" aria-hidden="true">*</span><input name={k} type={t} required autoComplete={ac} aria-required="true" aria-invalid={errors[k] ? 'true' : undefined} aria-describedby={errors[k] ? `err-${k}` : undefined} inputMode={k === 'email' ? 'email' : undefined} onChange={() => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }))} />{errors[k] && <span className="cform__err" id={`err-${k}`} role="alert">{errors[k]}</span>}</label>
              ))}
              <label>Message <span className="req" aria-hidden="true">*</span><textarea name="message" rows="5" required aria-required="true" aria-invalid={errors.message ? 'true' : undefined} aria-describedby={errors.message ? 'err-message' : undefined} onChange={() => errors.message && setErrors((x) => ({ ...x, message: undefined }))} />{errors.message && <span className="cform__err" id="err-message" role="alert">{errors.message}</span>}</label>
              <p className="cform__req"><span className="req" aria-hidden="true">*</span> Required</p>
              <button className="btn btn--solid" type="submit">Compose email <span className="arrow" aria-hidden="true">→</span></button>
              <p className="cform__note" role="status">{sent ? `Your email app should now open with the message addressed to ${c.email}. If it doesn’t, please write to us directly at that address.` : `This opens your email app with the message ready to send to ${c.email}. Nothing is sent from this page.`}</p>
            </form>
          </Reveal>
          <Reveal variant="mask" className="b"><Parallax speed={50}><Img id="render-landscape-pavilion-close" sizes="(max-width: 860px) 100vw, 45vw" style={{ aspectRatio: '4 / 5' }} /></Parallax></Reveal>
        </div>
        {qrs.length > 0 && <div className="wrap" style={{ marginTop: 'var(--s5)' }}><div className="qrs">{qrs.map(([k, v]) => <a key={k} className="qr" href={v.url || undefined}><img src={v.qr} alt={`${k} QR code`} /></a>)}</div></div>}
      </section>
    </>
  );
}
