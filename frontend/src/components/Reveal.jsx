import { useEffect, useRef, useState } from "react";

// Reveals its children when they scroll into view.
//
// Uses IntersectionObserver rather than a scroll listener so the browser does
// the work off the main thread. Each element reveals once and then stops being
// observed - re-animating on every scroll past is distracting, not polished.
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // Anyone who has asked their OS to reduce motion sees the content
    // immediately, with no transform and no transition.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(true);
      return undefined;
    }

    // Fail OPEN. If IntersectionObserver never fires - it does not in some
    // embedded or offscreen rendering contexts - the content would stay hidden
    // permanently. A decorative animation must never be able to hide content,
    // so reveal unconditionally after a short grace period.
    const fallback = setTimeout(() => setVisible(true), 1200);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      // Fire slightly before the element reaches the viewport edge so the
      // animation is already underway by the time it is properly on screen.
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(node);
    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
