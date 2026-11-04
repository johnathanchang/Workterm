import { useEffect, useState } from "react";
import { getEntitlement, type Entitlement } from "./api";
import { getRef } from "./prefill";

// Where Stripe sends the student after paying (#/welcome). The payment is confirmed by Stripe calling our webhook,
// which can land a few seconds after the redirect, so this page asks the API a few times.
const TRIES = 10;
const WAIT_MS = 2000;

export default function Welcome() {
  const [ent, setEnt] = useState<Entitlement | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let stop = false;
    (async () => {
      for (let i = 0; i < TRIES && !stop; i++) {
        const e = await getEntitlement(getRef());
        if (stop) return;
        if (e?.active) return setEnt(e);
        await new Promise((r) => setTimeout(r, WAIT_MS));
      }
      if (!stop) setGaveUp(true);
    })();
    return () => {
      stop = true;
    };
  }, []);

  const ends = ent?.current_period_end ? new Date(ent.current_period_end).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : null;

  return (
    <main className="authpage">
      <div className="card authcard">
        <div className="stack" role="status">
          {ent ? (
            <>
              <h1 className="authtitle">You are in.</h1>
              <p className="lead small">
                {ent.plan === "term" ? "Your term plan is active" : "Your monthly plan is active"}
                {ends ? ` until ${ends}` : ""}. Thank you.
              </p>
            </>
          ) : gaveUp ? (
            <>
              <h1 className="authtitle">Still confirming your payment</h1>
              <p className="lead small">This can take a minute. If nothing changes soon, email us and we will sort it out.</p>
            </>
          ) : (
            <>
              <h1 className="authtitle">Confirming your payment…</h1>
              <p className="lead small">This only takes a few seconds.</p>
            </>
          )}
          <a className="btn" href="#/">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
