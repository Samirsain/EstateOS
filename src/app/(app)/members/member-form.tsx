"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Alert,
  Button,
  Field,
  Input,
  LinkButton,
  Select,
} from "@/components/ui";
import { DEALS_IN_OPTIONS, EMPTY_ACTION_STATE } from "@/lib/types";
import type { ActionState } from "@/lib/types";
import { createMemberAction, updateMemberAction } from "./actions";

export interface MemberFormValues {
  memberCode?: string;
  name: string;
  mobile: string;
  alternateMobile: string;
  city: string;
  companyName: string;
  dealsIn: string[];
  experience: string;
  aadhaar: string;
}

const EMPTY_VALUES: MemberFormValues = {
  name: "",
  mobile: "",
  alternateMobile: "",
  city: "",
  companyName: "",
  dealsIn: [],
  experience: "",
  aadhaar: "",
};

const EXPERIENCE_OPTIONS = [
  "Less than 1 year",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "More than 10 years",
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function MemberForm({
  mode,
  values = EMPTY_VALUES,
}: {
  mode: "create" | "edit";
  values?: MemberFormValues;
}) {
  const action = mode === "create" ? createMemberAction : updateMemberAction;
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    EMPTY_ACTION_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.createdCode) {
      router.push(`/members/${state.createdCode}?created=1`);
    }
  }, [state.ok, state.createdCode, router]);

  return (
    <form action={formAction} className="space-y-6">
      {values.memberCode ? (
        <input type="hidden" name="memberCode" value={values.memberCode} />
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "positive" : "danger"} title={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Member name" name="name" required error={state.errors?.name}>
          <Input
            id="name"
            name="name"
            defaultValue={values.name}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Mobile number"
          name="mobile"
          required
          error={state.errors?.mobile}
          hint="10-digit Indian mobile number."
        >
          <Input
            id="mobile"
            name="mobile"
            inputMode="numeric"
            defaultValue={values.mobile}
            autoComplete="off"
            required
          />
        </Field>

        <Field
          label="Alternate mobile"
          name="alternateMobile"
          error={state.errors?.alternateMobile}
        >
          <Input
            id="alternateMobile"
            name="alternateMobile"
            inputMode="numeric"
            defaultValue={values.alternateMobile}
            autoComplete="off"
          />
        </Field>

        <Field label="City" name="city">
          <Input
            id="city"
            name="city"
            defaultValue={values.city}
            autoComplete="off"
          />
        </Field>

        <Field label="Company name" name="companyName">
          <Input
            id="companyName"
            name="companyName"
            defaultValue={values.companyName}
            autoComplete="off"
          />
        </Field>

        <Field label="Experience" name="experience">
          <Select id="experience" name="experience" defaultValue={values.experience}>
            <option value="">Select experience</option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Aadhaar number"
          name="aadhaar"
          required
          error={state.errors?.aadhaar}
          hint="Stored encrypted; only the last 4 digits are shown afterwards."
        >
          <Input
            id="aadhaar"
            name="aadhaar"
            inputMode="numeric"
            defaultValue={values.aadhaar}
            autoComplete="off"
            required
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Deals in<span className="ml-0.5 text-danger">*</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEALS_IN_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm has-checked:border-brand-500 has-checked:bg-brand-50 has-checked:text-brand-700"
            >
              <input
                type="checkbox"
                name="dealsIn"
                value={option}
                defaultChecked={values.dealsIn.includes(option)}
                className="size-4 accent-brand-600"
              />
              {option}
            </label>
          ))}
        </div>
        {state.errors?.dealsIn ? (
          <p className="mt-1 text-xs font-medium text-danger">
            {state.errors.dealsIn}
          </p>
        ) : null}
      </fieldset>

      {mode === "create" ? (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          The Member ID and referral invite code are generated automatically when
          you save.
        </p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton label={mode === "create" ? "Register member" : "Save changes"} />
        <LinkButton href="/members">Cancel</LinkButton>
      </div>
    </form>
  );
}
