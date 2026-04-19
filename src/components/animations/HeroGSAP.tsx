"use client";

import { useEffect } from 'react';
import gsap from 'gsap';

export default function HeroGSAP() {
  useEffect(() => {
    const root = document.querySelector('[data-landing]') || document.querySelector('[data-hero]') || document.body;
    if (!root) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { duration: 0.65, ease: 'power3.out' } });

      // Hero entrance
      tl.from('.hero-pill', { y: -12, autoAlpha: 0, scale: 0.98, immediateRender: false });
      tl.from('.hero-headline .line', { y: 36, autoAlpha: 0, stagger: 0.08, immediateRender: false }, '-=0.45');
      tl.from('.hero-desc', { y: 20, autoAlpha: 0, immediateRender: false }, '-=0.45');
      tl.from('.hero-cta', { y: 20, autoAlpha: 0, scale: 0.985, immediateRender: false, clearProps: 'opacity,transform' }, '-=0.4');

      // Cities card
      tl.from('.cities-card .city-item', { x: 30, autoAlpha: 0, stagger: 0.08, immediateRender: false }, '-=0.6');
      tl.from('.cities-card .how-steps > *', { y: 12, autoAlpha: 0, stagger: 0.06, immediateRender: false }, '-=0.5');

      // Rest of landing page sections
      tl.from('.stats-item', { y: 20, autoAlpha: 0, stagger: 0.08 }, '+=0.05');
      tl.from('.crisis-section .glass-card', { y: 24, autoAlpha: 0, stagger: 0.08 }, '-=0.15');
      tl.from('.timeline-step', { x: 20, autoAlpha: 0, stagger: 0.12 }, '-=0.1');
      tl.from('.feature-item', { y: 20, autoAlpha: 0, stagger: 0.08 }, '-=0.1');
      tl.from('.cta-section .glass-card', { y: 20, autoAlpha: 0, stagger: 0.05 }, '-=0.05');

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
