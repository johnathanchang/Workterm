import { useState } from "react";
import AuthButtons, { Provider } from "./AuthButtons";

export default function Login() {
  const [tried, setTried] = useState<Provider | null>(null);

  return (
    <main className="authpage">
      <div className="card authcard">
        <h1 className="authtitle">Log in</h1>
        <p className="lead small">Use the school account you signed up with.</p>
        <AuthButtons verb="Continue" onPick={setTried} />
        {tried && (
          <p className="notice" role="status">
            {tried === "google" ? "Google" : "Microsoft"} sign-in is not connected yet. It goes live when Workterm
            opens.
          </p>
        )}
        {/* Dev only: until Google and Microsoft sign-in are live, open a dashboard with the email you paid with. */}
        {import.meta.env.DEV && (
          <p className="fine center">
            Testing locally? <a href="#/dashboard">Open a dashboard with an email</a>
          </p>
        )}
        <p className="fine center">
          New to Workterm? <a href="#/signup">Sign up</a>
        </p>
      </div>
    </main>
  );
}
