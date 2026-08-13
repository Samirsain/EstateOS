"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Badge, Button, Table, Td, Th } from "@/components/ui";
import { updatePermissionsMatrixAction } from "./actions";

interface PermItem {
  permission: string;
  label: string;
  category: string;
  mdAllowed: boolean;
  pcAllowed: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving Changes..." : "Save Role Permissions Matrix"}
    </Button>
  );
}

export function PermissionMatrixForm({ initialMatrix }: { initialMatrix: PermItem[] }) {
  const [matrix, setMatrix] = React.useState(initialMatrix);
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string } | null>(null);

  const toggle = (permission: string, role: "MD" | "PC") => {
    setMatrix((prev) =>
      prev.map((item) => {
        if (item.permission === permission) {
          return {
            ...item,
            mdAllowed: role === "MD" ? !item.mdAllowed : item.mdAllowed,
            pcAllowed: role === "PC" ? !item.pcAllowed : item.pcAllowed,
          };
        }
        return item;
      })
    );
  };

  async function handleSubmit(formData: FormData) {
    setFeedback(null);
    const result = await updatePermissionsMatrixAction(formData);
    setFeedback(result);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {feedback && (
        <div
          className={`rounded-lg p-3 text-sm font-medium ${
            feedback.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Category & Capability</Th>
            <Th className="text-center">Managing Director (MD)</Th>
            <Th className="text-center">Process Coordinator (PC)</Th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((item) => (
            <tr key={item.permission} className="hover:bg-gray-50/50">
              <Td>
                <div>
                  <p className="font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink-muted">{item.permission} • <span className="text-brand-600 font-semibold">{item.category}</span></p>
                </div>
              </Td>
              <Td className="text-center">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.mdAllowed}
                    onChange={() => toggle(item.permission, "MD")}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 accent-brand-600"
                  />
                  <input
                    type="hidden"
                    name={`perm_MD_${item.permission}`}
                    value={item.mdAllowed ? "1" : "0"}
                  />
                  {item.mdAllowed ? (
                    <Badge tone="brand">Allowed</Badge>
                  ) : (
                    <Badge tone="neutral">Denied</Badge>
                  )}
                </label>
              </Td>
              <Td className="text-center">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.pcAllowed}
                    onChange={() => toggle(item.permission, "PC")}
                    className="size-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 accent-brand-600"
                  />
                  <input
                    type="hidden"
                    name={`perm_PC_${item.permission}`}
                    value={item.pcAllowed ? "1" : "0"}
                  />
                  {item.pcAllowed ? (
                    <Badge tone="positive">Allowed</Badge>
                  ) : (
                    <Badge tone="warning">Denied</Badge>
                  )}
                </label>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="flex justify-end p-4 border-t border-line bg-gray-50/50 rounded-b-xl">
        <SubmitButton />
      </div>
    </form>
  );
}
