"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { EMPTY_ACTION_STATE } from "@/lib/types";
import type { ActionState } from "@/lib/types";
import { transferCustomerAction } from "../customers/actions";

export interface TransferCustomerOption {
  customer_code: string;
  name: string;
  mobile: string;
  member_code: string;
  member_name: string;
}

export interface TransferMemberOption {
  member_code: string;
  name: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Transferring…" : "Transfer ownership"}
    </Button>
  );
}

export function TransferForm({
  customers,
  members,
  defaultCustomerCode = "",
}: {
  customers: TransferCustomerOption[];
  members: TransferMemberOption[];
  defaultCustomerCode?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    transferCustomerAction,
    EMPTY_ACTION_STATE,
  );
  const [customerCode, setCustomerCode] = useState(defaultCustomerCode);

  const selected = customers.find(
    (customer) => customer.customer_code === customerCode.trim().toUpperCase(),
  );

  if (customers.length === 0 || members.length < 2) {
    return (
      <Alert tone="warning" title="Nothing to transfer yet">
        Ownership transfers need at least one registered customer and two active
        members.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Alert tone={state.ok ? "positive" : "danger"} title={state.message} />
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Customer"
          name="customerCode"
          required
          hint="Type or paste a Customer ID."
        >
          <Input
            id="customerCode"
            name="customerCode"
            list="transfer-customers"
            value={customerCode}
            onChange={(event) => setCustomerCode(event.target.value)}
            placeholder="TM0001-29072026"
            autoComplete="off"
            required
          />
          <datalist id="transfer-customers">
            {customers.map((customer) => (
              <option
                key={customer.customer_code}
                value={customer.customer_code}
              >
                {customer.name} · {customer.mobile}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="Transfer to member" name="toMemberCode" required>
          <Select id="toMemberCode" name="toMemberCode" defaultValue="" required>
            <option value="">Select the new owner</option>
            {members
              .filter((member) => member.member_code !== selected?.member_code)
              .map((member) => (
                <option key={member.member_code} value={member.member_code}>
                  {member.member_code} · {member.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>

      {selected ? (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <strong>{selected.name}</strong> ({selected.customer_code}) is currently
          owned by {selected.member_name} ({selected.member_code}).
        </p>
      ) : customerCode.trim() ? (
        <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          No customer matches that ID yet.
        </p>
      ) : null}

      <Field
        label="Reason for transfer"
        name="reason"
        hint="Recorded in the audit log alongside the transfer."
      >
        <Input id="reason" name="reason" autoComplete="off" />
      </Field>

      <SubmitButton />
    </form>
  );
}
