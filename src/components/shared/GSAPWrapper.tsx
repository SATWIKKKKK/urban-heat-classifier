'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

interface GSAPWrapperProps {
  children: ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideRight' | 'slideLeft' | 'scaleIn';
  delay?: number;
  duration?: number;
  className?: string;
  stagger?: boolean;
}

export default function GSAPWrapper({
  children,
  animation = 'slideUp',
  delay = 0,
  duration = 0.6,
  className = '',
  stagger = false,
}: GSAPWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const targets = stagger ? el.children : el;

    const animations: Record<string, gsap.TweenVars> = {
      fadeIn: { opacity: 0 },
      slideUp: { opacity: 0, y: 30 },
      slideRight: { opacity: 0, x: -30 },
      slideLeft: { opacity: 0, x: 30 },
      scaleIn: { opacity: 0, scale: 0.9 },
    };

    const from = animations[animation] || animations.slideUp;

    if (stagger && el.children.length > 0) {
      gsap.from(targets, {
        ...from,
        duration,
        delay,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'all',
      });
    } else {
      gsap.from(el, {
        ...from,
        duration,
        delay,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }
  }, [animation, delay, duration, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
