"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { EMPTY_ACTION_STATE, ROLES } from "@/lib/types";
import type { ActionState } from "@/lib/types";
import { createUserAction, resetPasswordAction } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function CreateUserForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createUserAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Alert tone={state.ok ? "positive" : "danger"} title={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required error={state.errors?.name}>
          <Input id="name" name="name" autoComplete="off" required />
        </Field>

        <Field
          label="Username"
          name="username"
          required
          error={state.errors?.username}
          hint="Used to sign in. Lowercase, no spaces."
        >
          <Input id="username" name="username" autoComplete="off" required />
        </Field>

        <Field label="Role" name="role" required error={state.errors?.role}>
          <Select id="role" name="role" defaultValue="PC" required>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role === "MD" ? "MD — Managing Director" : "PC — Process Coordinator"}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Temporary password"
          name="password"
          required
          error={state.errors?.password}
          hint="At least 8 characters. Share it with the operator directly."
        >
          <Input
            id="password"
            name="password"
            type="text"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      <SubmitButton label="Create account" />
    </form>
  );
}

export function ResetPasswordForm({ usernames }: { usernames: string[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    EMPTY_ACTION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Alert tone={state.ok ? "positive" : "danger"} title={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Account" name="username" required>
          <Select id="username" name="username" defaultValue="" required>
            <option value="">Select an account</option>
            {usernames.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="New password"
          name="password"
          required
          error={state.errors?.password}
        >
          <Input
            id="new-password"
            name="password"
            type="text"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      <SubmitButton label="Reset password" />
    </form>
  );
}
