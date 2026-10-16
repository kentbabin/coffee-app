"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
import { signInStep, type SignInState } from "./actions";

const initial: SignInState = { step: "email", email: "" };

export function SignInForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signInStep, initial);

  if (state.step === "code") {
    return (
      <form action={action} className="adm-signin__form" noValidate>
        <p className="t-body t-muted" role="status">
          If <strong>{state.email}</strong> belongs to an admin, we sent it a 6-digit code. It expires in 10 minutes.
        </p>
        <input type="hidden" name="email" value={state.email} />
        <Field
          id="code"
          name="code"
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
          autoFocus
          error={state.error}
        />
        <Button type="submit" name="intent" value="verify" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </Button>
        <Button type="submit" name="intent" value="restart" variant="quiet" disabled={pending}>
          Use a different email
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="adm-signin__form" noValidate>
      {notice && !state.error ? (
        <p className="adm-notice" role="status">
          {notice}
        </p>
      ) : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.email}
        required
        autoFocus
        error={state.error}
      />
      <Button type="submit" name="intent" value="send" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
