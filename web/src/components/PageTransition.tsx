import { useLocation } from "react-router-dom";

/** Fade + slight slide on route change; respects prefers-reduced-motion via CSS. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-page-enter">
      {children}
    </div>
  );
}
