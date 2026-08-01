"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input } from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/types";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, EMPTY_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.message ? (
        <Alert tone="danger" title={state.message} />
      ) : null}

      <Field label="Username" name="username" required>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
        />
      </Field>

      <Field label="Password" name="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
