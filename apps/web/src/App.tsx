import { useEffect, useState } from "react";
import Home from "./Home";
import Login from "./Login";
import Onboarding from "./Onboarding";

// Tiny hash router: #/login and #/signup. No router library needed yet.
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
        <a className="logo" href="#/">
          Workterm
        </a>
        <nav className="auth" aria-label="Account">
          <a className="btn ghost" href="#/login">
            Log in
          </a>
          <a className="btn" href="#/signup">
            Sign up
          </a>
        </nav>
      </header>

      {route === "/login" ? <Login /> : route === "/signup" ? <Onboarding /> : <Home />}

      <footer>
        <p>Workterm helps you reach firms. It does not promise a placement.</p>
      </footer>
    </>
  );
}
