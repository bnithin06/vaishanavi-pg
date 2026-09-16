import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const [
    roomsResult,
    bedsResult,
    allocationsResult,
    residentsResult,
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
      .select("id, room_id, bed_number, status")
      .order("bed_number"),

    supabase
      .from("bed_allocations")
      .select(
        "id, resident_id, bed_id, allocated_at, checkout_at, status",
      )
      .eq("status", "active"),

    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .eq("is_active", true),

    supabase
      .from("rent_invoices")
      .select(
        "id, resident_id, amount, due_date, status",
      )
      .in("status", [
        "pending",
        "partially_paid",
        "overdue",
      ]),

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

  // ---------------------------------------------------------
  // Handle query errors
  // ---------------------------------------------------------

  if (roomsResult.error) {
    console.error("Manager dashboard - rooms:", roomsResult.error);
  }

  if (bedsResult.error) {
    console.error("Manager dashboard - beds:", bedsResult.error);
  }

  if (allocationsResult.error) {
    console.error(
      "Manager dashboard - allocations:",
      allocationsResult.error,
    );
  }

  if (residentsResult.error) {
    console.error(
      "Manager dashboard - residents:",
      residentsResult.error,
    );
  }

  if (invoicesResult.error) {
    console.error(
      "Manager dashboard - invoices:",
      invoicesResult.error,
    );
  }

  if (paymentsResult.error) {
    console.error(
      "Manager dashboard - payments:",
      paymentsResult.error,
    );
  }

  if (announcementsResult.error) {
    console.error(
      "Manager dashboard - announcements:",
      announcementsResult.error,
    );
  }

  // ---------------------------------------------------------
  // Data
  // ---------------------------------------------------------

  const rooms = roomsResult.data ?? [];
  const beds = bedsResult.data ?? [];
  const allocations = allocationsResult.data ?? [];
  const residents = residentsResult.data ?? [];
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

  const occupancyPercentage =
    totalBeds > 0
      ? Math.round((occupiedBeds / totalBeds) * 100)
      : 0;

  /*
   * NOTE:
   * This currently sums invoice amounts.
   *
   * When payment_allocations are fully implemented,
   * replace this with actual outstanding balances.
   */
  const pendingAmount = invoices.reduce(
    (total, invoice) => total + Number(invoice.amount),
    0,
  );

  const overdueInvoices = invoices.filter(
    (invoice) => invoice.status === "overdue",
  );

  const today = new Date();

  // ---------------------------------------------------------
  // Upcoming checkouts - next 7 days
  // ---------------------------------------------------------

  const upcomingCheckouts = allocations
    .filter((allocation) => {
      if (!allocation.checkout_at) {
        return false;
      }

      const checkoutDate = new Date(
        allocation.checkout_at,
      );

      const difference =
        checkoutDate.getTime() - today.getTime();

      const days =
        difference / (1000 * 60 * 60 * 24);

      return days >= 0 && days <= 7;
    })
    .sort(
      (a, b) =>
        new Date(a.checkout_at!).getTime() -
        new Date(b.checkout_at!).getTime(),
    );

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

    const available = roomBeds.filter(
      (bed) => bed.status === "available",
    ).length;

    const percentage =
      roomBeds.length > 0
        ? Math.round(
            (occupied / roomBeds.length) * 100,
          )
        : 0;

    return {
      ...room,
      totalBeds: roomBeds.length,
      occupied,
      available,
      percentage,
    };
  });

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const getResidentName = (residentId: string) =>
    residents.find(
      (resident) => resident.id === residentId,
    )?.full_name ?? "Unknown Resident";

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
  // UI
  // ---------------------------------------------------------

  return (
    <div className="space-y-6 p-1 sm:p-2">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manager Dashboard
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Manage daily hostel operations.
        </p>
      </div>

      {/* =====================================================
          QUICK ACTIONS
          ===================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">
            Quick Actions
          </h2>

          <p className="text-xs text-muted-foreground">
            Common tasks for daily hostel operations
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

          <ActionCard
            href="/manager/residents/new"
            title="Add Resident"
            description="Register a new resident"
            icon="+"
          />

          <ActionCard
            href="/manager/allocations/new"
            title="Allocate Bed"
            description="Assign a resident to a bed"
            icon="→"
          />

          <ActionCard
            href="/manager/payments/new"
            title="Record Payment"
            description="Record rent payment"
            icon="₹"
          />

          <ActionCard
            href="/manager/announcements/new"
            title="Announcement"
            description="Post hostel announcement"
            icon="!"
          />

        </div>
      </section>

      {/* =====================================================
          HOSTEL STATISTICS
          ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title="Residents"
          value={residents.length}
          description="Active residents"
        />

        <StatCard
          title="Occupied Beds"
          value={`${occupiedBeds}/${totalBeds}`}
          description={`${occupancyPercentage}% occupancy`}
        />

        <StatCard
          title="Available Beds"
          value={availableBeds}
          description={`${maintenanceBeds} under maintenance`}
        />

        <StatCard
          title="Upcoming Checkouts"
          value={upcomingCheckouts.length}
          description="Next 7 days"
        />

      </div>

      {/* =====================================================
          FINANCIAL STATISTICS
          ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        <StatCard
          title="Pending Rent"
          value={formatCurrency(pendingAmount)}
          description={`${invoices.length} outstanding invoices`}
        />

        <StatCard
          title="Overdue Payments"
          value={overdueInvoices.length}
          description="Require attention"
        />

        <StatCard
          title="Total Rooms"
          value={totalRooms}
          description={`${totalBeds} total beds`}
        />

      </div>

      {/* =====================================================
          ROOM OCCUPANCY + CHECKOUTS
          ===================================================== */}

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

                  <div className="flex items-center justify-between gap-4">

                    <div className="min-w-0">

                      <p className="font-medium">
                        Room {room.room_number}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {room.occupied} occupied ·{" "}
                        {room.available} available
                      </p>

                    </div>

                    <span className="shrink-0 text-sm font-semibold">
                      {room.percentage}%
                    </span>

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

        {/* Upcoming checkouts */}

        <DashboardSection
          title="Upcoming Checkouts"
          description="Residents scheduled to leave within 7 days"
        >

          {upcomingCheckouts.length === 0 ? (
            <EmptyState message="No upcoming checkouts." />
          ) : (
            <div className="divide-y">

              {upcomingCheckouts
                .slice(0, 8)
                .map((allocation) => {

                  const resident = residents.find(
                    (item) =>
                      item.id === allocation.resident_id,
                  );

                  const bed = beds.find(
                    (item) =>
                      item.id === allocation.bed_id,
                  );

                  const room = rooms.find(
                    (item) =>
                      item.id === bed?.room_id,
                  );

                  return (
                    <div
                      key={allocation.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >

                      <div className="min-w-0">

                        <p className="truncate font-medium">
                          {resident?.full_name ??
                            "Unknown Resident"}
                        </p>

                        <p className="text-sm text-muted-foreground">

                          {room
                            ? `Room ${room.room_number}`
                            : "Room unavailable"}

                          {bed
                            ? ` / Bed ${bed.bed_number}`
                            : ""}

                        </p>

                      </div>

                      <div className="shrink-0 text-right">

                        <p className="text-sm font-medium">
                          {allocation.checkout_at
                            ? formatDate(
                                allocation.checkout_at,
                              )
                            : "-"}
                        </p>

                        <span className="text-xs text-yellow-700">
                          Upcoming
                        </span>

                      </div>

                    </div>
                  );
                })}

            </div>
          )}

        </DashboardSection>

      </div>

      {/* =====================================================
          CURRENT RESIDENTS
          ===================================================== */}

      <DashboardSection
        title="Current Residents"
        description="Residents currently staying in the hostel"
      >

        {allocations.length === 0 ? (
          <EmptyState message="No active allocations." />
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[650px] text-sm">

              <thead className="border-b bg-muted/40">

                <tr>

                  <th className="px-5 py-3 text-left font-medium">
                    Resident
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Room
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Bed
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Allocated
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y">

                {allocations
                  .slice(0, 10)
                  .map((allocation) => {

                    const resident = residents.find(
                      (item) =>
                        item.id ===
                        allocation.resident_id,
                    );

                    const bed = beds.find(
                      (item) =>
                        item.id === allocation.bed_id,
                    );

                    const room = rooms.find(
                      (item) =>
                        item.id === bed?.room_id,
                    );

                    return (
                      <tr key={allocation.id}>

                        <td className="px-5 py-4 font-medium">
                          {resident?.full_name ??
                            "Unknown Resident"}
                        </td>

                        <td className="px-5 py-4">
                          {room
                            ? `Room ${room.room_number}`
                            : "-"}
                        </td>

                        <td className="px-5 py-4">
                          {bed
                            ? `Bed ${bed.bed_number}`
                            : "-"}
                        </td>

                        <td className="px-5 py-4 text-muted-foreground">
                          {allocation.allocated_at
                            ? formatDate(
                                allocation.allocated_at,
                              )
                            : "-"}
                        </td>

                        <td className="px-5 py-4">

                          <StatusBadge
                            status="Active"
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

      {/* =====================================================
          RECENT PAYMENTS
          ===================================================== */}

      <DashboardSection
        title="Recent Payments"
        description="Latest completed rent payments"
      >

        {payments.length === 0 ? (
          <EmptyState message="No payments found." />
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[650px] text-sm">

              <thead className="border-b bg-muted/40">

                <tr>

                  <th className="px-5 py-3 text-left font-medium">
                    Resident
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Amount
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Method
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Date
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y">

                {payments.slice(0, 8).map((payment) => (

                  <tr key={payment.id}>

                    <td className="px-5 py-4 font-medium">
                      {getResidentName(
                        payment.resident_id,
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {formatCurrency(
                        Number(payment.amount),
                      )}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {String(
                        payment.payment_method ?? "-",
                      ).replaceAll("_", " ")}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(
                        payment.payment_date,
                      )}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </DashboardSection>

      {/* =====================================================
          ANNOUNCEMENTS
          ===================================================== */}

      <DashboardSection
        title="Announcements"
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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                  <div className="min-w-0">

                    <h3 className="font-medium">
                      {announcement.title}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {announcement.message}
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(
                        announcement.publish_at,
                      )}
                    </p>

                  </div>

                  <span className="w-fit shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                    {String(
                      announcement.announcement_type ?? "general",
                    ).replaceAll("_", " ")}
                  </span>

                </div>

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
   ACTION CARD
   ============================================================ */

function ActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted/50 active:scale-[0.98]"
    >

      <div className="flex items-start gap-3">

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
          {icon}
        </span>

        <div className="min-w-0">

          <p className="font-medium group-hover:underline">
            {title}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>

        </div>

      </div>

    </Link>
  );
}


/* ============================================================
   DASHBOARD SECTION
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
   STATUS BADGE
   ============================================================ */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus = status.toLowerCase();

  const classes =
    normalizedStatus === "active"
      ? "bg-green-100 text-green-700"
      : "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {status}
    </span>
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