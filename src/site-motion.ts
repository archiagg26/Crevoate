import { useEffect, useState } from "react";

export const homepageSections = [
  ["home", "Overview"],
  ["creative-bento", "Capabilities"],
  ["services", "Services"],
  ["selected-work", "Work"],
  ["creative-tools", "Tools"],
  ["faq", "FAQ"],
];
export function useActiveSection(pathname: string) {
  const [active, setActive] = useState("home");
  useEffect(() => {
    if (pathname !== "/" || typeof window.IntersectionObserver !== "function")
      return;
    setActive("home");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - 125) -
              Math.abs(b.boundingClientRect.top - 125),
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-22% 0px -55% 0px" },
    );
    const frame = requestAnimationFrame(() =>
      homepageSections.forEach(([id]) => {
        const section = document.getElementById(id);
        if (section) observer.observe(section);
      }),
    );
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);
  return active;
}
