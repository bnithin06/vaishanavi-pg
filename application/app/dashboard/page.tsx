import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
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

  switch (role) {
    case "super_admin":
    case "hostel_admin":
      redirect("/admin");

    case "hostel_manager":
      redirect("/manager");

    case "resident":
      redirect("/resident");

    default:
      console.error("Unknown user role:", role);
      redirect("/unauthorized");
  }
}