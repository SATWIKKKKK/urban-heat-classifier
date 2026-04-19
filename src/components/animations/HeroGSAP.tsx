"use client";

import { useEffect } from 'react';
import gsap from 'gsap';

export default function HeroGSAP() {
  useEffect(() => {
    const root = document.querySelector('[data-hero]');
    if (!root) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { duration: 0.7, ease: 'power3.out' } });

      tl.from('.hero-pill', { y: -12, opacity: 0, scale: 0.98 });
      tl.from('.hero-headline .line', { y: 36, opacity: 0, stagger: 0.08 }, '-=0.4');
      tl.from('.hero-desc', { y: 20, opacity: 0 }, '-=0.45');
      tl.from('.hero-cta', { y: 20, opacity: 0, scale: 0.985 }, '-=0.4');

      // Animate cities card items and the steps
      tl.from('.cities-card .city-item', { x: 30, opacity: 0, stagger: 0.08 }, '-=0.6');
      tl.from('.cities-card .how-steps > *', { y: 12, opacity: 0, stagger: 0.06 }, '-=0.5');

      // Soft pulsing glow on CTA
      gsap.to('.hero-cta', {
        boxShadow: '0 12px 40px rgba(34,197,94,0.08)',
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.2,
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return null;
}
