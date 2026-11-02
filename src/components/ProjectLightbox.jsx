import { useEffect, useRef } from 'react';
import Img from './Img.jsx';

export default function ProjectLightbox({ images, title, activeIndex, onChange, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const isOpen = activeIndex !== null;
  const current = isOpen ? images[activeIndex] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange((activeIndex - 1 + images.length) % images.length);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange((activeIndex + 1) % images.length);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="project-lightbox"
      aria-label={`${title} image viewer`}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}
    >
      {current && (
        <div className="project-lightbox__panel">
          <div className="project-lightbox__top">
            <p><span>Conceptual study</span><span>{String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span></p>
            <button ref={closeRef} type="button" className="project-lightbox__close" onClick={onClose} aria-label="Close image viewer">Close <span aria-hidden="true">×</span></button>
          </div>
          <div className="project-lightbox__stage">
            <button type="button" className="project-lightbox__nav project-lightbox__nav--prev" aria-label="Previous image" onClick={() => onChange((activeIndex - 1 + images.length) % images.length)}>←</button>
            <Img id={current} tag={false} priority sizes="(max-width: 700px) 94vw, 88vw" />
            <button type="button" className="project-lightbox__nav project-lightbox__nav--next" aria-label="Next image" onClick={() => onChange((activeIndex + 1) % images.length)}>→</button>
          </div>
          <p className="project-lightbox__caption">{title}</p>
        </div>
      )}
    </dialog>
  );
}
