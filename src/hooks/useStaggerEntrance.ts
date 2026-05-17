"use client";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";

interface StaggerOptions {
  startDelay?: number;
  duration?: number;
  y?: number;
}

export function useStaggerEntrance<T extends HTMLElement = HTMLDivElement>(
  options: StaggerOptions = {}
) {
  const { startDelay = 0, duration = 450, y = 14 } = options;
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.children.length === 0) return;
    const children = Array.from(el.children) as HTMLElement[];
    const anim = animate(children, {
      opacity: [0, 1],
      translateY: [y, 0],
      delay: stagger(55, { start: startDelay }),
      duration,
      ease: "outQuart",
    });
    return () => { anim.pause(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
