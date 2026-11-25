import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

const easing = [0.22, 1, 0.36, 1] as const;
const duration = 0.8;
const threshold = 0.17;
const elements = {
  div: motion.div,
  span: motion.span,
  p: motion.p,
  article: motion.article,
  button: motion.button,
  details: motion.details,
  a: motion.a,
  link: motion.create(Link),
};
type Tag = keyof typeof elements;
type Direction = "up" | "left" | "right";
type Kind = "slide" | "text" | "image" | "line";

type ObserverHandlers = {
  enter: (ratio: number) => void;
  leave: () => void;
};
const targets = new Map<Element, ObserverHandlers>();
let observers:
  { entry: IntersectionObserver; exit: IntersectionObserver } | undefined;

function watch(element: Element, handlers: ObserverHandlers) {
  observers ??= {
    entry: new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          targets.get(entry.target)?.enter(entry.intersectionRatio);
      },
      { threshold: [0, threshold] },
    ),
    exit: new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (!entry.isIntersecting) targets.get(entry.target)?.leave();
      },
      { rootMargin: "64px" },
    ),
  };
  const pair = observers;
  targets.set(element, handlers);
  pair.entry.observe(element);
  pair.exit.observe(element);
  return () => {
    targets.delete(element);
    pair.entry.unobserve(element);
    pair.exit.unobserve(element);
    if (!targets.size) {
      pair.entry.disconnect();
      pair.exit.disconnect();
      observers = undefined;
    }
  };
}

const Stagger = createContext<(() => number) | null>(null);

type RevealProps<T extends Tag = "div"> = {
  as?: T;
  delay?: number;
  direction?: Direction;
  kind?: Kind;
  enabled?: boolean;
  staggered?: boolean;
  children?: ReactNode;
} & Omit<
  ComponentPropsWithoutRef<(typeof elements)[T]>,
  "initial" | "animate" | "variants" | "transition" | "ref" | "children"
>;

export function ScrollReveal<T extends Tag = "div">({
  as,
  delay = 0,
  direction = "up",
  kind = "slide",
  enabled = true,
  staggered = false,
  onFocusCapture,
  className,
  children,
  ...props
}: RevealProps<T>) {
  const controls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const queue = useContext(Stagger);
  const ref = useRef<HTMLElement>(null);
  const showOnFocus = useRef<() => void>(undefined);
  const hidden = useMemo(() => {
    if (kind === "image")
      return { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" };
    if (kind === "line") return { scaleX: 0 };
    return {
      opacity: 0,
      x: direction === "left" ? -40 : direction === "right" ? 40 : 0,
      y: direction === "up" ? 40 : 0,
    };
  }, [direction, kind]);
  const shown = useMemo(() => {
    if (kind === "image") return { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" };
    if (kind === "line") return { scaleX: 1 };
    return { opacity: 1, x: 0, y: 0 };
  }, [kind]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      !enabled ||
      reduceMotion ||
      typeof window.IntersectionObserver !== "function"
    ) {
      controls.set(shown);
      return;
    }
    let entered = false;
    let belowThreshold = false;
    let mounted = true;
    const show = (immediate = false) => {
      if (entered && !immediate) return;
      entered = true;
      const startDelay = immediate
        ? 0
        : delay + (staggered ? (queue?.() ?? 0) : 0);
      node.style.setProperty("--reveal-delay", startDelay + "s");
      node.dataset.revealState = "entered";
      if (immediate) {
        controls.stop();
        controls.set(shown);
      } else {
        void controls
          .start({
            ...shown,
            transition: { duration, ease: easing, delay: startDelay },
          })
          .catch(() => {
            if (mounted && entered) show(true);
          });
      }
    };
    const reset = () => {
      if (!belowThreshold || node.contains(document.activeElement)) return;
      entered = false;
      node.dataset.revealState = "waiting";
      controls.stop();
      controls.set(hidden);
    };
    let confirmed = false;
    let detach: (() => void) | undefined;
    try {
      // Observe the unmasked box. A fully clipped or scaled element can report zero intersection.
      detach = watch(kind === "slide" ? node : (node.parentElement ?? node), {
        enter(ratio) {
          confirmed = true;
          belowThreshold = ratio < threshold;
          if (!belowThreshold) show();
        },
        leave: reset,
      });
    } catch {
      return;
    }
    node.dataset.revealState = "waiting";
    controls.set(hidden);
    showOnFocus.current = () => show(true);
    const fallback = window.setTimeout(() => {
      if (!confirmed) show(true);
    }, 700);
    return () => {
      mounted = false;
      window.clearTimeout(fallback);
      detach?.();
      showOnFocus.current = undefined;
      delete node.dataset.revealState;
      node.style.removeProperty("--reveal-delay");
      controls.stop();
    };
  }, [
    controls,
    delay,
    enabled,
    hidden,
    kind,
    queue,
    reduceMotion,
    shown,
    staggered,
  ]);

  return createElement(
    elements[as ?? "div"] as ElementType,
    {
      ...props,
      ref,
      className: ["viewport-reveal", "viewport-" + kind, className]
        .filter(Boolean)
        .join(" "),
      "data-reveal-kind": kind,
      initial: false,
      animate: controls,
      onFocusCapture: (event: unknown) => {
        showOnFocus.current?.();
        (onFocusCapture as ((value: unknown) => void) | undefined)?.(event);
      },
    },
    children,
  );
}

export function TextReveal({
  as: Heading = "h2",
  id,
  className,
  lines,
}: {
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
  lines: ReactNode[];
}) {
  return (
    <Heading id={id} className={className}>
      {lines.map((line, index) => (
        <span className="viewport-text-mask" key={index}>
          {index > 0 && " "}
          <ScrollReveal as="span" kind="text" delay={index * 0.14}>
            {line}
          </ScrollReveal>
        </span>
      ))}
    </Heading>
  );
}

export function StaggerContainer({
  children,
  className,
  step = 0.14,
  label,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  label?: string;
}) {
  const next = useMemo(() => {
    let lastStart = -Infinity;
    return () => {
      const now = performance.now() / 1000;
      const delay = Math.min(0.7, Math.max(0, lastStart + step - now));
      lastStart = now + delay;
      return delay;
    };
  }, [step]);
  return (
    <Stagger.Provider value={next}>
      <div className={className} aria-label={label}>
        {children}
      </div>
    </Stagger.Provider>
  );
}

export function StaggerItem<T extends Tag = "div">(props: RevealProps<T>) {
  return <ScrollReveal<T> {...props} staggered />;
}

export function ImageReveal({ className, ...props }: RevealProps<"div">) {
  return (
    <div className={className}>
      <ScrollReveal {...props} kind="image" />
    </div>
  );
}

export function ParallaxImage({
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<typeof motion.img>) {
  const image = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: image,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-2.4%", "2.4%"]);
  return (
    <motion.img
      {...props}
      ref={image}
      className={["viewport-parallax", className].filter(Boolean).join(" ")}
      style={reduced ? style : { ...style, y }}
    />
  );
}
