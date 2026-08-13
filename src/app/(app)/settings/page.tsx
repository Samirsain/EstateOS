import type { Metadata } from "next";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import { getRolePermissionsMatrix, requirePermission } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { setUserActiveAction } from "./actions";
import { CreateUserForm, ResetPasswordForm } from "./user-forms";
import { PermissionMatrixForm } from "./permission-matrix-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await requirePermission("settings.manage");
  const users = await listUsers();
  const matrix = await getRolePermissionsMatrix();

  return (
    <>
      <PageHeader
        title="Settings & Role Permissions"
        description="User accounts and dynamic capability checkbox matrix. Managing Director only."
      />

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Create an account"
            description="The MD creates the Process Coordinator account that runs the office."
          />
          <div className="p-5">
            <CreateUserForm />
          </div>
        </Card>

        <Card>
          <CardHeader title="Accounts" description={`${users.length} account${users.length === 1 ? "" : "s"}.`} />
          <Table>
            <thead>
              <tr>
                <Th>Username</Th>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <Td className="font-medium">@{user.username}</Td>
                  <Td>{user.name}</Td>
                  <Td>
                    <Badge tone={user.role === "MD" ? "brand" : "neutral"}>
                      {user.role}
                    </Badge>
                  </Td>
                  <Td>
                    {user.is_active ? (
                      <Badge tone="positive">Active</Badge>
                    ) : (
                      <Badge tone="warning">Disabled</Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDate(user.created_at)}
                  </Td>
                  <Td className="text-right">
                    {user.username === actor.username ? (
                      <span className="text-xs text-ink-muted">This is you</span>
                    ) : (
                      <form action={setUserActiveAction} className="inline">
                        <input
                          type="hidden"
                          name="username"
                          value={user.username}
                        />
                        <input
                          type="hidden"
                          name="active"
                          value={user.is_active ? "0" : "1"}
                        />
                        <Button
                          type="submit"
                          variant={user.is_active ? "danger" : "secondary"}
                          className="px-2.5 py-1 text-xs"
                        >
                          {user.is_active ? "Disable" : "Enable"}
                        </Button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Reset a password"
            description="Sessions already signed in stay valid until they expire."
          />
          <div className="p-5">
            <ResetPasswordForm
              usernames={users.map((user) => user.username)}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Role Capability Checkbox Matrix"
            description="Tick or untick permissions for each role. Changes take effect instantly across all pages & server actions."
          />
          <div className="p-1">
            <PermissionMatrixForm initialMatrix={matrix} />
          </div>
        </Card>
      </div>
    </>
  );
}

