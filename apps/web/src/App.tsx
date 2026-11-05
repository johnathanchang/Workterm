import { useEffect, useState } from "react";
import Blog, { POSTS } from "./Blog";
import Competitor, { RIVALS } from "./Competitors";
import Home from "./Home";
import Login from "./Login";
import Onboarding from "./Onboarding";
import Privacy from "./Privacy";
import Refund from "./Refund";
import Terms from "./Terms";

// Tiny hash router: #/login, #/signup, #/blog/<slug>, #/terms, #/privacy, #/refund and #/compare/<slug>. No router library needed yet.
function useRoute(): string {
  const read = () => window.location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// Footer product links jump to sections of the home page, from any page.
const PRODUCT_LINKS = [
  { id: "how-it-works", label: "How it works" },
  { id: "profile", label: "Set up your profile" },
  { id: "compare", label: "How Workterm compares" },
  { id: "faq", label: "Questions" },
  { id: "early-access", label: "Get started" },
];

function goToSection(e: React.MouseEvent, id: string) {
  e.preventDefault();
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  if (window.location.hash === "" || window.location.hash === "#/") return scroll();
  window.location.hash = "#/";
  // Wait for the home page to render (the router scrolls to the top first).
  setTimeout(scroll, 80);
}

// After Stripe, the student lands back here with ?checkout=success or ?checkout=cancelled.
function useCheckoutResult(): "success" | "cancelled" | null {
  const [result, setResult] = useState<"success" | "cancelled" | null>(() => {
    const value = new URLSearchParams(window.location.search).get("checkout");
    return value === "success" || value === "cancelled" ? value : null;
  });
  useEffect(() => {
    if (!result) return;
    // Drop the flag from the address bar so a reload does not show the banner again, and hide it after a while.
    history.replaceState(null, "", window.location.pathname + window.location.hash);
    const timer = setTimeout(() => setResult(null), 8000);
    return () => clearTimeout(timer);
  }, [result]);
  return result;
}

export default function App() {
  const route = useRoute();
  const checkout = useCheckoutResult();

  return (
    <>
      {checkout && (
        <p className={`checkout-banner ${checkout}`} role="status">
          {checkout === "success"
            ? "Payment received. Thank you! Pro is unlocked for your co-op term."
            : "Payment cancelled. You were not charged."}
        </p>
      )}
      <header className="bar">
        <a className="brand" href="#/">
          Workterm
        </a>
        <nav className="auth" aria-label="Account">
          {/* The sign-up page puts its back and next arrows here. */}
          <span id="header-arrows" className="arrows" />
          <a className="btn ghost" href="#/login">
            Log in
          </a>
          <a className="btn cta" href="#/signup">
            Sign up
          </a>
        </nav>
      </header>

      {route === "/login" ? (
        <Login />
      ) : route === "/signup" ? (
        <Onboarding />
      ) : route === "/terms" ? (
        <Terms />
      ) : route === "/privacy" ? (
        <Privacy />
      ) : route === "/refund" ? (
        <Refund />
      ) : route.startsWith("/compare") ? (
        <Competitor slug={route.replace(/^\/compare\/?/, "")} />
      ) : route.startsWith("/blog") ? (
        <Blog slug={route.replace(/^\/blog\/?/, "")} />
      ) : (
        <Home />
      )}

      <footer>
        <div className="footcols">
          <nav className="footcol" aria-labelledby="foot-guides">
            <h2 id="foot-guides">Internship guides</h2>
            {POSTS.map((p) => (
              <a key={p.slug} href={`#/blog/${p.slug}`}>
                {p.title}
              </a>
            ))}
          </nav>
          <nav className="footcol" aria-labelledby="foot-product">
            <h2 id="foot-product">Product</h2>
            {PRODUCT_LINKS.map((l) => (
              <a key={l.id} href="#/" onClick={(e) => goToSection(e, l.id)}>
                {l.label}
              </a>
            ))}
          </nav>
          <nav className="footcol" aria-labelledby="foot-compare">
            <h2 id="foot-compare">Compare</h2>
            {RIVALS.map((r) => (
              <a key={r.slug} href={`#/compare/${r.slug}`}>
                Workterm vs {r.name}
              </a>
            ))}
          </nav>
          <nav className="footcol" aria-labelledby="foot-legal">
            <h2 id="foot-legal">Legal</h2>
            <a href="#/terms">Terms of Service</a>
            <a href="#/privacy">Privacy Policy</a>
            <a href="#/refund">Refund policy</a>
          </nav>
        </div>
        <p className="copyright">© 2026 Workterm</p>
      </footer>
    </>
  );
}
