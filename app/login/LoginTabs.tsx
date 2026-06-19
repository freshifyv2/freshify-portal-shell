"use client";

/**
 * LoginTabs — client wrapper that toggles between email/password (the
 * default RLG06 form) and the phone/email OTP form.
 *
 * Sprint 3 — Phone tab restored. The Email/Password tab is the default
 * (it remains the documented primary auth path). The Phone tab mounts
 * OtpLoginForm, which posts to /api/auth/otp/request and /verify; both
 * routes have been live since Deploy 5.10 and continue to work even
 * though /login itself stopped mounting OtpLoginForm in 5.18g.
 */

import { useState } from "react";
import LoginForm from "./LoginForm";
import OtpLoginForm from "./OtpLoginForm";

type Tab = "password" | "phone";

interface Props {
  next: string;
}

export default function LoginTabs({ next }: Props) {
  const [tab, setTab] = useState<Tab>("password");

  return (
    <>
      <p className="sub">
        {tab === "password"
          ? "Welcome back. Use your email and password."
          : "We'll send a one-time code to your phone or email."}
      </p>

      <div className="auth-tabs" role="tablist" aria-label="Sign-in method">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "password"}
          className={`auth-tab ${tab === "password" ? "is-active" : ""}`}
          onClick={() => setTab("password")}
        >
          Email & password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "phone"}
          className={`auth-tab ${tab === "phone" ? "is-active" : ""}`}
          onClick={() => setTab("phone")}
        >
          Phone or email code
        </button>
      </div>

      {tab === "password" ? (
        <LoginForm next={next} />
      ) : (
        <OtpLoginForm next={next} />
      )}
    </>
  );
}
