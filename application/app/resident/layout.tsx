import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: role, error: roleError } = await supabase.rpc(
    "get_user_role",
    {
      user_uuid: user.id,
    },
  );

  if (roleError) {
    console.error("Failed to get user role:", roleError);
    redirect("/unauthorized");
  }

  if (role !== "resident") {
    redirect("/unauthorized");
  }

  return (
      <main className="p-6">{children}</main>
  );
}