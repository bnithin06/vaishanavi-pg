import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Accommodation = {
  allocation_id: number;
  allocated_at: string;
  checkout_at: string | null;
  status: string;
  bed_id: number;
  bed_number: string;
  bed_status: string;
  room_id: number;
  room_number: string;
  floor_number: number | null;
  room_type: string | null;
  room_capacity: number;
  monthly_rent: number | null;
};

type Invoice = {
  id: number;
  invoice_number: string;
  period_start: string;
  period_end: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  status: string;
  original_status: string;
};

type Payment = {
  id: number;
  payment_reference: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_reference: string | null;
  status: string;
  notes: string | null;
};

type Announcement = {
  id: number;
  title: string;
  message: string;
  announcement_type: string;
  publish_at: string;
  expires_at: string | null;
  read_at: string | null;
};

type DashboardData = {
  profile: {
    id: string;
    full_name: string | null;
    phone: string | null;
    is_active: boolean;
  } | null;

  resident_details: {
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    address: string | null;
    date_of_birth: string | null;
    joining_date: string | null;
    checkout_date: string | null;
    identification_type: string | null;
  } | null;

  accommodation: Accommodation | null;

  rent_config: {
    id: number;
    monthly_rent: number;
    due_day: number;
    effective_from: string;
    effective_until: string | null;
  } | null;

  invoices: Invoice[];

  payments: Payment[];

  announcements: Announcement[];

  notification_preferences: {
    resident_id: string;
    whatsapp_enabled: boolean;
    rent_reminders_enabled: boolean;
    payment_notifications_enabled: boolean;
    checkout_reminders_enabled: boolean;
    announcement_notifications_enabled: boolean;
  } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "paid":
    case "completed":
      return "bg-green-100 text-green-700";

    case "partially_paid":
      return "bg-yellow-100 text-yellow-700";

    case "overdue":
      return "bg-red-100 text-red-700";

    case "pending":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(
        status,
      )}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>

      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>

      {description && (
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

export default async function ResidentDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * All resident data comes from one authenticated RPC.
   *
   * The database function uses auth.uid(), so the browser
   * cannot request another resident's information.
   */
  const { data, error } = await supabase.rpc(
    "get_resident_dashboard",
  );

  if (error) {
    console.error("Resident dashboard error:", error);

    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>

          <Link
            href="/resident"
            className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const dashboard = data as DashboardData;

  const profile = dashboard?.profile;
  const accommodation = dashboard?.accommodation;
  const invoices = dashboard?.invoices ?? [];
  const payments = dashboard?.payments ?? [];
  const announcements = dashboard?.announcements ?? [];
  const rentConfig = dashboard?.rent_config;

  /*
   * Calculate totals from actual invoice payment allocations
   * returned by PostgreSQL.
   */
  const totalOutstanding = invoices.reduce(
    (total, invoice) =>
      total + Number(invoice.outstanding_amount),
    0,
  );

  const totalPaid = invoices.reduce(
    (total, invoice) => total + Number(invoice.paid_amount),
    0,
  );

  const nextPendingInvoice =
    invoices
      .filter(
        (invoice) =>
          invoice.outstanding_amount > 0 &&
          invoice.status !== "cancelled",
      )
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() -
          new Date(b.due_date).getTime(),
      )[0] ?? null;

  const unreadAnnouncements = announcements.filter(
    (announcement) => !announcement.read_at,
  ).length;

  const firstName =
    profile?.full_name?.split(" ")[0] ?? "Resident";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Welcome back
          </p>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Here is your hostel information and rent summary.
          </p>
        </div>

        <Link
          href="/resident/profile"
          className="inline-flex w-fit items-center rounded-lg border bg-background px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted"
        >
          My Profile
        </Link>
      </div>


      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title="Room"
          value={
            accommodation
              ? accommodation.room_number
              : "Not allocated"
          }
          description={
            accommodation
              ? `Bed ${accommodation.bed_number}`
              : "Contact hostel manager"
          }
        />

        <StatCard
          title="Monthly Rent"
          value={
            rentConfig
              ? formatCurrency(Number(rentConfig.monthly_rent))
              : accommodation?.monthly_rent
                ? formatCurrency(
                    Number(accommodation.monthly_rent),
                  )
                : "—"
          }
          description={
            rentConfig
              ? `Due on ${rentConfig.due_day}th`
              : "Rent not configured"
          }
        />

        <StatCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          description={
            nextPendingInvoice
              ? `Due ${formatDate(nextPendingInvoice.due_date)}`
              : "No pending rent"
          }
        />

        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          description={`${payments.length} recent payments`}
        />
      </div>


      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* ===================================================
            ACCOMMODATION
        ==================================================== */}

        <section className="rounded-xl border bg-card shadow-sm lg:col-span-2">

          <div className="border-b p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  My Accommodation
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Your current room and bed allocation.
                </p>
              </div>

              {accommodation && (
                <StatusBadge status={accommodation.status} />
              )}
            </div>
          </div>

          <div className="p-5">

            {accommodation ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <InfoBox
                  label="Room"
                  value={accommodation.room_number}
                />

                <InfoBox
                  label="Bed"
                  value={accommodation.bed_number}
                />

                <InfoBox
                  label="Floor"
                  value={
                    accommodation.floor_number !== null
                      ? String(accommodation.floor_number)
                      : "—"
                  }
                />

                <InfoBox
                  label="Room Type"
                  value={
                    accommodation.room_type ?? "Not specified"
                  }
                />

                <InfoBox
                  label="Capacity"
                  value={`${accommodation.room_capacity} beds`}
                />

                <InfoBox
                  label="Allocated On"
                  value={formatDate(
                    accommodation.allocated_at,
                  )}
                />

                <InfoBox
                  label="Checkout"
                  value={formatDate(
                    accommodation.checkout_at,
                  )}
                />

                <InfoBox
                  label="Bed Status"
                  value={accommodation.bed_status}
                />

              </div>
            ) : (
              <EmptyState
                title="No bed allocated"
                message="You currently do not have an active bed allocation."
              />
            )}
          </div>
        </section>


        {/* ===================================================
            ANNOUNCEMENTS
        ==================================================== */}

        <section className="rounded-xl border bg-card shadow-sm">

          <div className="border-b p-5">
            <div className="flex items-center justify-between">

              <div>
                <h2 className="font-semibold">
                  Announcements
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Latest hostel updates.
                </p>
              </div>

              {unreadAnnouncements > 0 && (
                <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                  {unreadAnnouncements} new
                </span>
              )}

            </div>
          </div>

          <div className="divide-y">

            {announcements.length > 0 ? (
              announcements.slice(0, 5).map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">

                    <h3 className="text-sm font-semibold">
                      {announcement.title}
                    </h3>

                    <StatusBadge
                      status={announcement.announcement_type}
                    />

                  </div>

                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {announcement.message}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(announcement.publish_at)}
                  </p>

                </div>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No announcements"
                  message="There are no current announcements."
                />
              </div>
            )}

          </div>
        </section>
      </div>


      {/* =====================================================
          RENT + NEXT PAYMENT
      ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* RENT SUMMARY */}

        <section className="rounded-xl border bg-card shadow-sm lg:col-span-2">

          <div className="flex items-center justify-between border-b p-5">

            <div>
              <h2 className="font-semibold">
                Rent Summary
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your recent rent invoices.
              </p>
            </div>

            <Link
              href="/resident/rent"
              className="text-sm font-medium text-primary hover:underline"
            >
              View All
            </Link>

          </div>

          <div className="overflow-x-auto">

            {invoices.length > 0 ? (
              <table className="w-full text-sm">

                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3 text-left font-medium">
                      Invoice
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-left font-medium">
                      Due Date
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                      Amount
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                      Paid
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                      Outstanding
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 text-center font-medium">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">

                  {invoices.slice(0, 6).map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-5 py-4 font-medium">
                        {invoice.invoice_number}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDate(invoice.due_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {formatCurrency(
                          Number(invoice.amount),
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-green-600">
                        {formatCurrency(
                          Number(invoice.paid_amount),
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-medium">
                        {formatCurrency(
                          Number(invoice.outstanding_amount),
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <StatusBadge
                          status={invoice.status}
                        />
                      </td>
                    </tr>
                  ))}

                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No invoices"
                  message="No rent invoices have been created for you yet."
                />
              </div>
            )}

          </div>
        </section>


        {/* NEXT PAYMENT */}

        <section className="rounded-xl border bg-card shadow-sm">

          <div className="border-b p-5">
            <h2 className="font-semibold">
              Next Payment
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your upcoming rent payment.
            </p>
          </div>

          <div className="p-5">

            {nextPendingInvoice ? (
              <div className="space-y-5">

                <div>
                  <p className="text-sm text-muted-foreground">
                    Outstanding Amount
                  </p>

                  <p className="mt-1 text-3xl font-bold">
                    {formatCurrency(
                      Number(
                        nextPendingInvoice.outstanding_amount,
                      ),
                    )}
                  </p>
                </div>

                <div className="space-y-3">

                  <InfoBox
                    label="Invoice"
                    value={
                      nextPendingInvoice.invoice_number
                    }
                  />

                  <InfoBox
                    label="Due Date"
                    value={formatDate(
                      nextPendingInvoice.due_date,
                    )}
                  />

                  <InfoBox
                    label="Invoice Amount"
                    value={formatCurrency(
                      Number(nextPendingInvoice.amount),
                    )}
                  />

                  <InfoBox
                    label="Already Paid"
                    value={formatCurrency(
                      Number(nextPendingInvoice.paid_amount),
                    )}
                  />

                </div>

                <Link
                  href="/resident/rent"
                  className="block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  View Rent Details
                </Link>

              </div>
            ) : (
              <EmptyState
                title="No payment due"
                message="You don't currently have any outstanding rent."
              />
            )}

          </div>
        </section>
      </div>


      {/* =====================================================
          RECENT PAYMENTS
      ====================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">

        <div className="flex items-center justify-between border-b p-5">

          <div>
            <h2 className="font-semibold">
              Recent Payments
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Your latest recorded payments.
            </p>
          </div>

          <Link
            href="/resident/payments"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All
          </Link>

        </div>

        <div className="overflow-x-auto">

          {payments.length > 0 ? (
            <table className="w-full text-sm">

              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 text-left font-medium">
                    Reference
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 text-left font-medium">
                    Date
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 text-left font-medium">
                    Method
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium">
                    Amount
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 text-center font-medium">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">

                {payments.slice(0, 5).map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-muted/30"
                  >

                    <td className="px-5 py-4 font-medium">
                      {payment.payment_reference ?? `#${payment.id}`}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(payment.payment_date)}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {payment.payment_method.replaceAll(
                        "_",
                        " ",
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium">
                      {formatCurrency(
                        Number(payment.amount),
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <StatusBadge
                        status={payment.status}
                      />
                    </td>

                  </tr>
                ))}

              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No payments"
                message="No payments have been recorded yet."
              />
            </div>
          )}

        </div>
      </section>


      {/* =====================================================
          PROFILE / NOTIFICATION SUMMARY
      ====================================================== */}

      <div className="grid gap-6 md:grid-cols-2">

        {/* PROFILE */}

        <section className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                My Information
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your basic resident information.
              </p>
            </div>

            <Link
              href="/resident/profile"
              className="text-sm font-medium text-primary hover:underline"
            >
              Edit
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            <InfoBox
              label="Full Name"
              value={profile?.full_name ?? "—"}
            />

            <InfoBox
              label="Phone"
              value={profile?.phone ?? "—"}
            />

            <InfoBox
              label="Joining Date"
              value={formatDate(
                dashboard.resident_details?.joining_date,
              )}
            />

            <InfoBox
              label="Emergency Contact"
              value={
                dashboard.resident_details
                  ?.emergency_contact_name ?? "—"
              }
            />

          </div>

        </section>


        {/* NOTIFICATIONS */}

        <section className="rounded-xl border bg-card p-5 shadow-sm">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Notifications
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your notification preferences.
              </p>
            </div>

            <Link
              href="/resident/settings"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </div>

          {dashboard.notification_preferences ? (
            <div className="mt-5 space-y-3">

              <PreferenceRow
                label="WhatsApp"
                enabled={
                  dashboard.notification_preferences
                    .whatsapp_enabled
                }
              />

              <PreferenceRow
                label="Rent Reminders"
                enabled={
                  dashboard.notification_preferences
                    .rent_reminders_enabled
                }
              />

              <PreferenceRow
                label="Payment Notifications"
                enabled={
                  dashboard.notification_preferences
                    .payment_notifications_enabled
                }
              />

              <PreferenceRow
                label="Checkout Reminders"
                enabled={
                  dashboard.notification_preferences
                    .checkout_reminders_enabled
                }
              />

              <PreferenceRow
                label="Announcements"
                enabled={
                  dashboard.notification_preferences
                    .announcement_notifications_enabled
                }
              />

            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Notification preferences have not been configured yet.
            </div>
          )}

        </section>

      </div>

    </div>
  );
}


/* ============================================================
   SMALL UI COMPONENTS
============================================================ */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-medium capitalize">
        {value}
      </p>
    </div>
  );
}

function PreferenceRow({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">
        {label}
      </span>

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          enabled
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-sm font-medium">{title}</p>

      <p className="mt-1 text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}