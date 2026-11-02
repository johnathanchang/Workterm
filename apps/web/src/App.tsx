import { useEffect, useState } from "react";
import Home from "./Home";
import Login from "./Login";
import Onboarding from "./Onboarding";
import Refund from "./Refund";

// Tiny hash router: #/login, #/signup and #/refund. No router library needed yet.
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

export default function App() {
  const route = useRoute();

  return (
    <>
      <header className="bar">
        <a className="brand" href="#/">
          Workterm
        </a>
        <nav className="auth" aria-label="Account">
          <a className="btn ghost" href="#/login">
            Log in
          </a>
          <a className="btn cta" href="#/signup">
            Sign up
          </a>
        </nav>
      </header>

      {route === "/login" ? <Login /> : route === "/signup" ? <Onboarding /> : route === "/refund" ? <Refund /> : <Home />}

      <footer>
        <nav className="footnav" aria-label="Footer">
          <a href="#/login">Log in</a>
          <a href="#/signup">Sign up</a>
          <a href="#/refund">Refund policy</a>
        </nav>
      </footer>
    </>
  );
}
