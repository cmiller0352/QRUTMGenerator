import React, { useEffect } from "react";
import "../turkeydrop/turkeydrop2025/turkeydrop2025.css";

export default function SignupThankYou() {
  useEffect(() => {
    document.title = "Thanks for signing up";
  }, []);

  return (
    <main
      className="tdp-shell"
      style={{ display: "grid", placeItems: "center", padding: 24 }}
    >
      <article className="tdp-card" style={{ maxWidth: 720 }}>
        <a
          href="/signup"
          style={{ textDecoration: "none", fontSize: 28, display: "inline-block" }}
          aria-label="Back to signup"
        >
          ✅
        </a>
        <h1 className="tdp-card-title" style={{ marginTop: 8 }}>
          Thanks for signing up.
        </h1>
        <p className="tdp-card-sub">
          You are on the list. We will email you when Open House details are ready.
        </p>

        <div className="tdp-block">
          <h3>In the meantime</h3>
          <p style={{ margin: 0 }}>
            If you need help connecting with Road Home Program services, call{" "}
            <a href="tel:13129428387">(312) 942-8387 (VETS)</a> or email{" "}
            <a href="mailto:events@roadhomeprogram.org">
              events@roadhomeprogram.org
            </a>
            .
          </p>
        </div>

        <p className="tdp-help" style={{ marginTop: 16 }}>
          You can close this page now.
        </p>
      </article>
    </main>
  );
}
