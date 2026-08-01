"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Field,
  Input,
  LinkButton,
  Select,
} from "@/components/ui";
import { CUSTOMER_TYPES, EMPTY_ACTION_STATE } from "@/lib/types";
import type { ActionState } from "@/lib/types";
import { createCustomerAction } from "./actions";

export interface MemberOption {
  member_code: string;
  name: string;
  invite_code: string;
  mobile: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Checking for duplicates…" : "Register customer"}
    </Button>
  );
}

export function CustomerForm({
  members,
  defaultMemberCode = "",
}: {
  members: MemberOption[];
  defaultMemberCode?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createCustomerAction,
    EMPTY_ACTION_STATE,
  );
  const router = useRouter();

  const [memberCode, setMemberCode] = useState(defaultMemberCode);
  const [inviteInput, setInviteInput] = useState("");

  const byInvite = useMemo(
    () =>
      new Map(members.map((member) => [member.invite_code.toUpperCase(), member])),
    [members],
  );

  const selected = members.find((member) => member.member_code === memberCode);

  /* Typing a referral invite code selects the owning member automatically. */
  const handleInviteChange = (value: string) => {
    setInviteInput(value);
    const match = byInvite.get(value.trim().toUpperCase());
    if (match) setMemberCode(match.member_code);
  };

  useEffect(() => {
    if (state.ok && state.createdCode) {
      router.push(`/customers/${state.createdCode}?created=1`);
    }
  }, [state.ok, state.createdCode, router]);

  const inviteUnknown =
    inviteInput.trim().length > 0 &&
    !byInvite.has(inviteInput.trim().toUpperCase());

  if (members.length === 0) {
    return (
      <Alert tone="warning" title="No active members available">
        A customer must be assigned to a member at registration. Register a
        member first, then come back to onboard the customer.
        <div className="mt-3">
          <LinkButton href="/members/new" variant="primary">
            Register member
          </LinkButton>
        </div>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="memberCode" value={memberCode} />

      {state.message ? (
        <Alert tone={state.ok ? "positive" : "danger"} title={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Customer name" name="name" required error={state.errors?.name}>
          <Input id="name" name="name" autoComplete="off" required />
        </Field>

        <Field
          label="Mobile number"
          name="mobile"
          required
          error={state.errors?.mobile}
          hint="One mobile number can belong to only one customer."
        >
          <Input
            id="mobile"
            name="mobile"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Customer type"
          name="customerType"
          required
          error={state.errors?.customerType}
        >
          <Select id="customerType" name="customerType" defaultValue="User" required>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Aadhaar number"
          name="aadhaar"
          required
          error={state.errors?.aadhaar}
          hint="One Aadhaar number can belong to only one customer."
        >
          <Input
            id="aadhaar"
            name="aadhaar"
            inputMode="numeric"
            autoComplete="off"
            required
          />
        </Field>
      </div>

      <fieldset className="rounded-lg border border-line p-5">
        <legend className="px-1 text-sm font-semibold text-ink">
          Referral ownership
        </legend>
        <p className="mb-4 text-sm text-ink-muted">
          The selected member permanently owns this customer. Ownership can only
          be changed later by the Managing Director.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Referral invite code"
            name="inviteCode"
            hint="Optional shortcut — entering a code selects the member below."
            error={inviteUnknown ? "No active member uses that invite code." : undefined}
          >
            <Input
              id="inviteCode"
              value={inviteInput}
              onChange={(event) => handleInviteChange(event.target.value)}
              placeholder="e.g. K7QP4M2R"
              autoComplete="off"
              className="tracking-[0.15em] uppercase"
            />
          </Field>

          <Field
            label="Assigned member"
            name="memberSelect"
            required
            error={state.errors?.memberCode}
          >
            <Select
              id="memberSelect"
              value={memberCode}
              onChange={(event) => setMemberCode(event.target.value)}
              required
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member.member_code} value={member.member_code}>
                  {member.member_code} · {member.name} · {member.invite_code}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {selected ? (
          <p className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
            Assigning to <strong>{selected.name}</strong> ({selected.member_code}
            ) · invite code{" "}
            <strong className="tracking-[0.15em]">{selected.invite_code}</strong>
          </p>
        ) : null}
      </fieldset>

      <div className="flex gap-2">
        <SubmitButton />
        <LinkButton href="/customers">Cancel</LinkButton>
      </div>
    </form>
  );
}
