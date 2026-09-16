import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    roomsResult,
    bedsResult,
    residentsResult,
    allocationsResult,
    invoicesResult,
    paymentsResult,
    announcementsResult,
  ] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, room_number, capacity, status")
      .order("room_number"),

    supabase
      .from("beds")
      .select("id, room_id, bed_number, status"),

    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("is_active", true),

    supabase
      .from("bed_allocations")
      .select("id, resident_id, bed_id, allocated_at, status")
      .eq("status", "active"),

    supabase
      .from("rent_invoices")
      .select("id, resident_id, amount, due_date, status")
      .order("due_date", { ascending: true }),

    supabase
      .from("payments")
      .select(
        "id, resident_id, amount, payment_date, payment_method, status",
      )
      .eq("status", "completed")
      .order("payment_date", { ascending: false })
      .limit(10),

    supabase
      .from("announcements")
      .select(
        "id, title, message, announcement_type, publish_at",
      )
      .eq("is_active", true)
      .order("publish_at", { ascending: false })
      .limit(5),
  ]);

  const rooms = roomsResult.data ?? [];
  const beds = bedsResult.data ?? [];
  const residents = residentsResult.data ?? [];
  const allocations = allocationsResult.data ?? [];
  const invoices = invoicesResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const announcements = announcementsResult.data ?? [];

  // ---------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------

  const totalRooms = rooms.length;
  const totalBeds = beds.length;

  const occupiedBeds = beds.filter(
    (bed) => bed.status === "occupied",
  ).length;

  const availableBeds = beds.filter(
    (bed) => bed.status === "available",
  ).length;

  const maintenanceBeds = beds.filter(
    (bed) => bed.status === "maintenance",
  ).length;

  const totalResidents = residents.length;

  const pendingInvoices = invoices.filter(
    (invoice) =>
      invoice.status === "pending" ||
      invoice.status === "partially_paid" ||
      invoice.status === "overdue",
  );

  const pendingAmount = pendingInvoices.reduce(
    (total, invoice) => total + Number(invoice.amount),
    0,
  );

  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === "overdue",
  );

  const totalCollected = payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );

  const occupancyPercentage =
    totalBeds > 0
      ? Math.round((occupiedBeds / totalBeds) * 100)
      : 0;

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const getResidentName = (residentId: string) => {
    const resident = residents.find(
      (item) => item.id === residentId,
    );

    return resident?.full_name || "Unknown Resident";
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));

  // ---------------------------------------------------------
  // Room occupancy
  // ---------------------------------------------------------

  const roomOccupancy = rooms.map((room) => {
    const roomBeds = beds.filter(
      (bed) => bed.room_id === room.id,
    );

    const occupied = roomBeds.filter(
      (bed) => bed.status === "occupied",
    ).length;

    const percentage =
      roomBeds.length > 0
        ? Math.round((occupied / roomBeds.length) * 100)
        : 0;

    return {
      ...room,
      totalBeds: roomBeds.length,
      occupied,
      percentage,
    };
  });

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="space-y-6 p-1 sm:p-2">

      {/* Header */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your hostel operations.
        </p>
      </div>

      {/* Quick Actions */}

      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Quick Actions
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

          <QuickAction
            href="/admin/residents/new"
            label="Add Resident"
            icon="+"
          />

          <QuickAction
            href="/admin/rooms/new"
            label="Add Room"
            icon="+"
          />

          <QuickAction
            href="/admin/allocations"
            label="Allocate Bed"
            icon="→"
          />

          <QuickAction
            href="/admin/payments/new"
            label="Record Payment"
            icon="₹"
          />

        </div>
      </div>

      {/* Main statistics */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title="Residents"
          value={totalResidents}
          description="Active residents"
        />

        <StatCard
          title="Rooms"
          value={totalRooms}
          description="Registered rooms"
        />

        <StatCard
          title="Occupied Beds"
          value={`${occupiedBeds}/${totalBeds}`}
          description={`${occupancyPercentage}% occupancy`}
        />

        <StatCard
          title="Available Beds"
          value={availableBeds}
          description={`${maintenanceBeds} maintenance`}
        />

      </div>

      {/* Financial statistics */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <StatCard
          title="Rent Collected"
          value={formatCurrency(totalCollected)}
          description="Completed payments"
        />

        <StatCard
          title="Pending Rent"
          value={formatCurrency(pendingAmount)}
          description={`${pendingInvoices.length} pending invoices`}
        />

        <StatCard
          title="Overdue"
          value={overdueInvoices.length}
          description="Overdue invoices"
        />

      </div>

      {/* Occupancy + Payments */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Room occupancy */}

        <DashboardSection
          title="Room Occupancy"
          description="Current room and bed availability"
        >

          {roomOccupancy.length === 0 ? (
            <EmptyState message="No rooms found." />
          ) : (
            <div className="divide-y">

              {roomOccupancy.map((room) => (
                <div
                  key={room.id}
                  className="p-4"
                >

                  <div className="flex items-center justify-between">

                    <div>
                      <p className="font-medium">
                        Room {room.room_number}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {room.occupied} / {room.totalBeds} beds occupied
                      </p>
                    </div>

                    <p className="text-sm font-semibold">
                      {room.percentage}%
                    </p>

                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">

                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${room.percentage}%`,
                      }}
                    />

                  </div>

                </div>
              ))}

            </div>
          )}

        </DashboardSection>

        {/* Recent payments */}

        <DashboardSection
          title="Recent Payments"
          description="Latest completed payments"
        >

          {payments.length === 0 ? (
            <EmptyState message="No payments found." />
          ) : (
            <div className="divide-y">

              {payments.slice(0, 5).map((payment) => (

                <div
                  key={payment.id}
                  className="flex items-center justify-between gap-4 p-4"
                >

                  <div className="min-w-0">

                    <p className="truncate font-medium">
                      {getResidentName(payment.resident_id)}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.payment_date)}
                    </p>

                  </div>

                  <div className="shrink-0 text-right">

                    <p className="font-semibold">
                      {formatCurrency(Number(payment.amount))}
                    </p>

                    <p className="text-xs capitalize text-muted-foreground">
                      {String(payment.payment_method).replace(
                        "_",
                        " ",
                      )}
                    </p>

                  </div>

                </div>

              ))}

            </div>
          )}

        </DashboardSection>

      </div>

      {/* Residents */}

      <DashboardSection
        title="Residents"
        description="Active hostel residents"
      >

        {residents.length === 0 ? (
          <EmptyState message="No residents found." />
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[600px] text-sm">

              <thead className="border-b bg-muted/40">

                <tr>

                  <th className="px-5 py-3 text-left font-medium">
                    Name
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Phone
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Allocation
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y">

                {residents.slice(0, 10).map((resident) => {

                  const allocation = allocations.find(
                    (item) =>
                      item.resident_id === resident.id,
                  );

                  const bed = beds.find(
                    (item) =>
                      item.id === allocation?.bed_id,
                  );

                  const room = rooms.find(
                    (item) =>
                      item.id === bed?.room_id,
                  );

                  return (
                    <tr key={resident.id}>

                      <td className="px-5 py-4 font-medium">
                        {resident.full_name || "Unnamed"}
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">
                        {resident.phone || "-"}
                      </td>

                      <td className="px-5 py-4">
                        {room && bed
                          ? `Room ${room.room_number} / Bed ${bed.bed_number}`
                          : "Not allocated"}
                      </td>

                      <td className="px-5 py-4">

                        <StatusBadge
                          active={!!allocation}
                        />

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </DashboardSection>

      {/* Announcements */}

      <DashboardSection
        title="Recent Announcements"
        description="Latest hostel announcements"
      >

        {announcements.length === 0 ? (
          <EmptyState message="No announcements." />
        ) : (

          <div className="divide-y">

            {announcements.map((announcement) => (

              <div
                key={announcement.id}
                className="p-5"
              >

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <h3 className="font-medium">
                      {announcement.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {announcement.message}
                    </p>

                  </div>

                  <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                    {announcement.announcement_type}
                  </span>

                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(announcement.publish_at)}
                </p>

              </div>

            ))}

          </div>

        )}

      </DashboardSection>

    </div>
  );
}


/* ============================================================
   STAT CARD
   ============================================================ */

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">

      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        {description}
      </p>

    </div>
  );
}


/* ============================================================
   QUICK ACTION
   ============================================================ */

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-20 items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted/50 active:scale-[0.98]"
    >

      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
        {icon}
      </span>

      <span className="text-sm font-medium">
        {label}
      </span>

    </Link>
  );
}


/* ============================================================
   SECTION
   ============================================================ */

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">

      <div className="border-b p-5">

        <h2 className="font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>

      </div>

      {children}

    </section>
  );
}


/* ============================================================
   EMPTY STATE
   ============================================================ */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}


/* ============================================================
   STATUS BADGE
   ============================================================ */

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {active ? "Allocated" : "Not allocated"}
    </span>
  );
}