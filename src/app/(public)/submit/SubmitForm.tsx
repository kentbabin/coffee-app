"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

type Turnstile = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type Errors = Partial<Record<"name" | "address" | "maps_url" | "email" | "form", string>>;

function validate(fd: FormData): Errors {
  const errors: Errors = {};
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  if (!s("name")) errors.name = "Enter the shop's name.";
  if (!s("address")) errors.address = "Enter the address, or at least the area, like Canggu.";
  if (s("maps_url") && !/^https?:\/\/\S+$/i.test(s("maps_url"))) errors.maps_url = "Paste a link that starts with https://, or leave it empty.";
  if (s("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s("email"))) errors.email = "Enter an email like name@example.com, or leave it empty.";
  return errors;
}

export function SubmitForm({ siteKey }: { siteKey: string }) {
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if ((!scriptReady && !window.turnstile) || !widget.current || widgetId.current || sent) return;
    widgetId.current = window.turnstile!.render(widget.current, {
      sitekey: siteKey,
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [scriptReady, siteKey, sent]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const found = validate(fd);
    if (!token) found.form = "Wait for the check below the form to finish, then send again.";
    setErrors(found);
    if (Object.keys(found).length) {
      form.querySelector<HTMLElement>("[aria-invalid='true'], .form-error")?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/submit-shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabasePublishableKey },
        body: JSON.stringify({ ...Object.fromEntries(fd), turnstile_token: token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ form: body.error ?? "The submission didn't go through. Try again in a moment." });
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
        setToken("");
        return;
      }
      setSent(true);
    } catch {
      setErrors({ form: "The submission didn't go through. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="panel" role="status" style={{ marginTop: "var(--space-5)" }}>
        <h2 className="t-card-title">Thanks. We review every submission.</h2>
        <p className="t-body t-muted">It appears in the list once it&apos;s approved.</p>
        <div className="ca-empty__actions" style={{ justifyContent: "flex-start" }}>
          <Button variant="secondary" onClick={() => setSent(false)}>
            Submit another shop
          </Button>
          <Button href="/">Back to shops</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setScriptReady(true)} />
      <form className="form" onSubmit={onSubmit} noValidate>
        {errors.form ? (
          <p className="form-error" role="alert" tabIndex={-1}>
            {errors.form}
          </p>
        ) : null}
        <Field id="s-name" name="name" label="Shop name" required maxLength={120} error={errors.name} autoComplete="off" />
        <Field id="s-address" name="address" label="Address or area" required maxLength={300} error={errors.address} autoComplete="off" />
        <Field id="s-maps" name="maps_url" label="Google Maps link" type="url" inputMode="url" maxLength={500} error={errors.maps_url} hint="Optional. Helps the review go faster." />
        <Field id="s-notes" name="notes" as="textarea" label="Why it's good" maxLength={1000} hint="Optional. Roast, preparation, beans: whatever stood out." />
        <Field id="s-email" name="email" type="email" label="Your email" autoComplete="email" error={errors.email} hint="Optional, only for follow-up questions. Never shown." />
        {/* Honeypot: people never see it, bots fill it in. */}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="s-website">Website</label>
          <input id="s-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div ref={widget} />
        <div>
          <Button type="submit" size="lg" disabled={sending}>
            {sending ? "Sending…" : "Send for review"}
          </Button>
        </div>
      </form>
    </>
  );
}
