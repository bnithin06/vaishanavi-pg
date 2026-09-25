"use client";

/**
 * RoomManagement
 * ---------------------------------------------------------------------------
 * Production-oriented room and bed management UI for Vaishanavi PG.
 *
 * Responsibilities:
 * - Fetch rooms, beds and active allocations from Supabase.
 * - Display room occupancy.
 * - Search rooms.
 * - Filter rooms by occupancy.
 * - Paginate large room lists.
 * - Allocate vacant beds.
 * - Vacate occupied beds.
 * - Refresh data after successful mutations.
 *
 * Database RPCs:
 * - create_room()
 * - allocate_bed()
 * - vacate_bed()
 *
 * UI principles:
 * - Mobile first.
 * - Responsive from 360px to large desktop screens.
 * - No unnecessary horizontal scrolling.
 * - Comfortable touch targets.
 * - Compact information density for large PGs.
 */

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import AddRoomModal from "./AddRoomModal";
import AllocateBedModal from "./AllocateBedModal";
import VacateBedModal from "./VacateBedModal";

/* ==========================================================================
   TYPES
   ========================================================================== */

type Bed = {
  id: number;
  bedNumber: string;
  status: "vacant" | "occupied";
  residentName: string | null;
  residentPhone: string | null;
};

type Room = {
  id: number;
  roomNumber: string;
  sharingType: "1_sharing" | "2_sharing";
  status: "active" | "inactive";
  beds: Bed[];
};

type SupabaseBedAllocation = {
  id: number;
  status: "active" | "vacated";
  resident_id: string;
  profiles:
    | {
        full_name: string;
        phone: string | null;
      }
    | null;
};

type SupabaseBed = {
  id: number;
  bed_number: string;
  status: "vacant" | "occupied";
  bed_allocations: SupabaseBedAllocation[];
};

type SupabaseRoom = {
  id: number;
  room_number: string;
  sharing_type: "1_sharing" | "2_sharing";
  status: "active" | "inactive";
  beds: SupabaseBed[];
};

type RoomFilter =
  | "all"
  | "vacant"
  | "partial"
  | "full";

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const ROOMS_PER_PAGE = 10;

/* ==========================================================================
   MAIN COMPONENT
   ========================================================================== */

export default function RoomManagement() {
  const supabase = createClient();

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] =
    useState<RoomFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);

  /* Add Room */

  const [showAddRoomModal, setShowAddRoomModal] =
    useState(false);

  /* Allocate Bed */

  const [showAllocateModal, setShowAllocateModal] =
    useState(false);

  const [selectedBed, setSelectedBed] = useState<{
    id: number;
    bedNumber: string;
  } | null>(null);

  /* Vacate Bed */

  const [showVacateBedModal, setShowVacateBedModal] =
    useState(false);

  const [selectedOccupiedBed, setSelectedOccupiedBed] =
    useState<{
      id: number;
      bedNumber: string;
      residentName: string | null;
    } | null>(null);

  /* Expanded mobile/desktop room */

  const [expandedRooms, setExpandedRooms] =
    useState<Set<number>>(new Set());

  /* ------------------------------------------------------------------------
     Fetch Rooms
     ------------------------------------------------------------------------ */

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("rooms")
        .select(
          `
            id,
            room_number,
            sharing_type,
            status,
            beds (
              id,
              bed_number,
              status,
              bed_allocations (
                id,
                status,
                resident_id,
                profiles (
                  full_name,
                  phone
                )
              )
            )
          `
        )
        .order("room_number");

      if (error) {
        throw error;
      }

      const formattedRooms: Room[] = (
        (data ?? []) as unknown as SupabaseRoom[]
      ).map((room) => ({
        id: room.id,
        roomNumber: room.room_number,
        sharingType: room.sharing_type,
        status: room.status,

        beds: (room.beds ?? []).map((bed) => {
          const activeAllocation =
            (bed.bed_allocations ?? []).find(
              (allocation) =>
                allocation.status === "active"
            );

          return {
            id: bed.id,
            bedNumber: bed.bed_number,
            status: bed.status,

            residentName:
              activeAllocation?.profiles
                ?.full_name ?? null,

            residentPhone:
              activeAllocation?.profiles?.phone ??
              null,
          };
        }),
      }));

      setRooms(formattedRooms);
    } catch (err) {
      console.error(
        "Failed to fetch rooms:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load rooms."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------------
     Initial Load
     ------------------------------------------------------------------------ */

  useEffect(() => {
    fetchRooms();
  }, []);

  /* ------------------------------------------------------------------------
     Statistics
     ------------------------------------------------------------------------ */

  const summary = useMemo(() => {
    const allBeds = rooms.flatMap(
      (room) => room.beds
    );

    const vacantRooms = rooms.filter((room) => {
      const occupied = room.beds.filter(
        (bed) => bed.status === "occupied"
      ).length;

      return occupied === 0;
    });

    const partialRooms = rooms.filter((room) => {
      const occupied = room.beds.filter(
        (bed) => bed.status === "occupied"
      ).length;

      return (
        occupied > 0 &&
        occupied < room.beds.length
      );
    });

    const fullRooms = rooms.filter((room) => {
      const occupied = room.beds.filter(
        (bed) => bed.status === "occupied"
      ).length;

      return (
        room.beds.length > 0 &&
        occupied === room.beds.length
      );
    });

    return {
      totalRooms: rooms.length,
      totalBeds: allBeds.length,

      occupiedBeds: allBeds.filter(
        (bed) => bed.status === "occupied"
      ).length,

      vacantBeds: allBeds.filter(
        (bed) => bed.status === "vacant"
      ).length,

      vacantRooms: vacantRooms.length,
      partialRooms: partialRooms.length,
      fullRooms: fullRooms.length,
    };
  }, [rooms]);

  /* ------------------------------------------------------------------------
     Search + Filter
     ------------------------------------------------------------------------ */

  const filteredRooms = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        searchValue === "" ||
        room.roomNumber
          .toLowerCase()
          .includes(searchValue);

      if (!matchesSearch) {
        return false;
      }

      const occupiedBeds =
        room.beds.filter(
          (bed) => bed.status === "occupied"
        ).length;

      const totalBeds = room.beds.length;

      switch (filter) {
        case "vacant":
          return occupiedBeds === 0;

        case "partial":
          return (
            occupiedBeds > 0 &&
            occupiedBeds < totalBeds
          );

        case "full":
          return (
            totalBeds > 0 &&
            occupiedBeds === totalBeds
          );

        case "all":
        default:
          return true;
      }
    });
  }, [rooms, search, filter]);

  /* ------------------------------------------------------------------------
     Pagination
     ------------------------------------------------------------------------ */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRooms.length /
        ROOMS_PER_PAGE
    )
  );

  useEffect(() => {
    setCurrentPage((page) =>
      Math.min(page, totalPages)
    );
  }, [totalPages]);

  const paginatedRooms = useMemo(() => {
    const start =
      (currentPage - 1) *
      ROOMS_PER_PAGE;

    return filteredRooms.slice(
      start,
      start + ROOMS_PER_PAGE
    );
  }, [filteredRooms, currentPage]);

  const firstResult =
    filteredRooms.length === 0
      ? 0
      : (currentPage - 1) *
          ROOMS_PER_PAGE +
        1;

  const lastResult =
    Math.min(
      currentPage * ROOMS_PER_PAGE,
      filteredRooms.length
    );

  /* ------------------------------------------------------------------------
     Search
     ------------------------------------------------------------------------ */

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  /* ------------------------------------------------------------------------
     Filter
     ------------------------------------------------------------------------ */

  const handleFilter = (
    value: RoomFilter
  ) => {
    setFilter(value);
    setCurrentPage(1);
  };

  /* ------------------------------------------------------------------------
     Expand Room
     ------------------------------------------------------------------------ */

  const toggleRoom = (roomId: number) => {
    setExpandedRooms((previous) => {
      const next = new Set(previous);

      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }

      return next;
    });
  };

  /* ------------------------------------------------------------------------
     Allocate
     ------------------------------------------------------------------------ */

  const handleOpenAllocate = (
    bed: Bed
  ) => {
    setSelectedBed({
      id: bed.id,
      bedNumber: bed.bedNumber,
    });

    setShowAllocateModal(true);
  };

  const handleCloseAllocate = () => {
    setShowAllocateModal(false);
    setSelectedBed(null);
  };

  const handleAllocationSuccess =
    async () => {
      await fetchRooms();
    };

  /* ------------------------------------------------------------------------
     Vacate
     ------------------------------------------------------------------------ */

  const handleOpenVacate = (
    bed: Bed
  ) => {
    setSelectedOccupiedBed({
      id: bed.id,
      bedNumber: bed.bedNumber,
      residentName: bed.residentName,
    });

    setShowVacateBedModal(true);
  };

  const handleCloseVacate = () => {
    setShowVacateBedModal(false);
    setSelectedOccupiedBed(null);
  };

  const handleVacateSuccess =
    async () => {
      await fetchRooms();
    };

  /* ==========================================================================
     LOADING STATE
     ========================================================================== */

  if (loading) {
    return <RoomManagementSkeleton />;
  }

  /* ==========================================================================
     ERROR STATE
     ========================================================================== */

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">

        <div className="flex gap-3">

          <div className="mt-0.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
              !
            </span>
          </div>

          <div className="min-w-0 flex-1">

            <h2 className="text-sm font-bold text-red-800">
              Unable to load rooms
            </h2>

            <p className="mt-1 break-words text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchRooms}
              className="
                mt-4
                min-h-11
                rounded-xl
                bg-red-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-red-700
                focus:outline-none
                focus:ring-2
                focus:ring-red-500
                focus:ring-offset-2
              "
            >
              Try Again
            </button>

          </div>

        </div>

      </section>
    );
  }

  /* ==========================================================================
     MAIN UI
     ========================================================================== */

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">

      {/* ====================================================================
         HEADER
         ==================================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                  <path d="M8 7h2" />
                  <path d="M14 7h2" />
                  <path d="M8 11h2" />
                  <path d="M14 11h2" />
                  <path d="M8 15h2" />
                  <path d="M14 15h2" />
                </svg>
              </div>

              <h1 className="truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                Room Management
              </h1>

            </div>

            <p className="mt-2 text-sm text-gray-500">
              Manage rooms, beds and resident occupancy.
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              setShowAddRoomModal(true)
            }
            className="
              flex
              min-h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-gray-900
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-gray-800
              focus:outline-none
              focus:ring-2
              focus:ring-gray-900
              focus:ring-offset-2
              sm:w-auto
            "
          >
            <span className="text-lg leading-none">
              +
            </span>

            <span>Add Room</span>
          </button>

        </div>

      </section>

      {/* ====================================================================
         SUMMARY
         ==================================================================== */}

      <section
        aria-label="Room summary"
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-4
        "
      >

        <StatCard
          label="Rooms"
          value={summary.totalRooms}
          description="Total rooms"
        />

        <StatCard
          label="Beds"
          value={summary.totalBeds}
          description="Total beds"
        />

        <StatCard
          label="Occupied"
          value={summary.occupiedBeds}
          description="Occupied beds"
        />

        <StatCard
          label="Vacant"
          value={summary.vacantBeds}
          description="Available beds"
        />

      </section>

      {/* ====================================================================
         SEARCH + FILTER
         ==================================================================== */}

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          {/* Search */}

          <div className="w-full lg:max-w-md">

            <label
              htmlFor="room-search"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Search
            </label>

            <div className="relative">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  h-5
                  w-5
                  -translate-y-1/2
                  text-gray-400
                "
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />
                <path d="m20 20-3.5-3.5" />
              </svg>

              <input
                id="room-search"
                type="search"
                value={search}
                onChange={(event) =>
                  handleSearch(
                    event.target.value
                  )
                }
                placeholder="Search room number..."
                className="
                  min-h-11
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  py-3
                  pl-11
                  pr-10
                  text-base
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-900/10
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    handleSearch("")
                  }
                  aria-label="Clear search"
                  className="
                    absolute
                    right-2
                    top-1/2
                    flex
                    h-8
                    w-8
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    text-gray-400
                    hover:bg-gray-100
                    hover:text-gray-700
                  "
                >
                  ×
                </button>
              )}

            </div>

          </div>

          {/* Filters */}

          <div className="w-full lg:w-auto">

            <p className="mb-2 text-sm font-semibold text-gray-700">
              Occupancy
            </p>

            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-gray-100 p-1">

              <FilterButton
                label="All"
                count={summary.totalRooms}
                active={
                  filter === "all"
                }
                onClick={() =>
                  handleFilter("all")
                }
              />

              <FilterButton
                label="Vacant"
                count={summary.vacantRooms}
                active={
                  filter === "vacant"
                }
                onClick={() =>
                  handleFilter("vacant")
                }
              />

              <FilterButton
                label="Partial"
                count={summary.partialRooms}
                active={
                  filter === "partial"
                }
                onClick={() =>
                  handleFilter("partial")
                }
              />

              <FilterButton
                label="Full"
                count={summary.fullRooms}
                active={
                  filter === "full"
                }
                onClick={() =>
                  handleFilter("full")
                }
              />

            </div>

          </div>

        </div>

      </section>

      {/* ====================================================================
         RESULT HEADER
         ==================================================================== */}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Rooms
          </h2>

          {filteredRooms.length > 0 && (
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              Showing {firstResult}–{lastResult} of{" "}
              {filteredRooms.length} rooms
            </p>
          )}

        </div>

        {(search || filter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
              setCurrentPage(1);
            }}
            className="
              self-start
              text-sm
              font-semibold
              text-gray-600
              underline
              underline-offset-2
              hover:text-gray-900
            "
          >
            Clear filters
          </button>
        )}

      </div>

      {/* ====================================================================
         EMPTY STATE
         ==================================================================== */}

      {filteredRooms.length === 0 && (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7 text-gray-400"
            >
              <path d="M3 21h18" />
              <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
              <path d="M8 8h8" />
              <path d="M8 12h8" />
            </svg>

          </div>

          <h3 className="mt-4 text-base font-bold text-gray-900">
            {rooms.length === 0
              ? "No rooms yet"
              : "No matching rooms"}
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
            {rooms.length === 0
              ? "Create your first room to start managing beds and residents."
              : "Try a different room number or occupancy filter."}
          </p>

          {rooms.length === 0 ? (
            <button
              type="button"
              onClick={() =>
                setShowAddRoomModal(true)
              }
              className="
                mt-5
                min-h-11
                rounded-xl
                bg-gray-900
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-gray-800
              "
            >
              Add First Room
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setCurrentPage(1);
              }}
              className="
                mt-5
                min-h-11
                rounded-xl
                border
                border-gray-300
                bg-white
                px-5
                py-3
                text-sm
                font-semibold
                text-gray-700
                transition
                hover:bg-gray-50
              "
            >
              Clear Filters
            </button>
          )}

        </section>
      )}

      {/* ====================================================================
         DESKTOP TABLE
         ==================================================================== */}

      {paginatedRooms.length > 0 && (
        <section className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">

          {/* Table Header */}

          <div className="grid grid-cols-[1.1fr_0.8fr_1.8fr_0.9fr_0.8fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3">

            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Room
            </div>

            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Sharing
            </div>

            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Beds
            </div>

            <div className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Occupancy
            </div>

            <div className="text-right text-xs font-bold uppercase tracking-wide text-gray-500">
              Actions
            </div>

          </div>

          {/* Table Rows */}

          <div className="divide-y divide-gray-100">

            {paginatedRooms.map((room) => (
              <DesktopRoomRow
                key={room.id}
                room={room}
                expanded={
                  expandedRooms.has(
                    room.id
                  )
                }
                onToggle={() =>
                  toggleRoom(room.id)
                }
                onAllocate={
                  handleOpenAllocate
                }
                onVacate={
                  handleOpenVacate
                }
              />
            ))}

          </div>

        </section>
      )}

      {/* ====================================================================
         MOBILE ROOM LIST
         ==================================================================== */}

      {paginatedRooms.length > 0 && (
        <section className="space-y-3 md:hidden">

          {paginatedRooms.map((room) => (
            <MobileRoomCard
              key={room.id}
              room={room}
              expanded={
                expandedRooms.has(
                  room.id
                )
              }
              onToggle={() =>
                toggleRoom(room.id)
              }
              onAllocate={
                handleOpenAllocate
              }
              onVacate={
                handleOpenVacate
              }
            />
          ))}

        </section>
      )}

      {/* ====================================================================
         PAGINATION
         ==================================================================== */}

      {filteredRooms.length >
        ROOMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* ====================================================================
         MODALS
         ==================================================================== */}

      <AddRoomModal
        open={showAddRoomModal}
        onClose={() =>
          setShowAddRoomModal(false)
        }
        onSuccess={fetchRooms}
      />

      <AllocateBedModal
        open={showAllocateModal}
        bedId={
          selectedBed?.id ?? null
        }
        bedNumber={
          selectedBed?.bedNumber ??
          null
        }
        onClose={handleCloseAllocate}
        onSuccess={
          handleAllocationSuccess
        }
      />

      <VacateBedModal
        open={showVacateBedModal}
        bedId={
          selectedOccupiedBed?.id ??
          null
        }
        bedNumber={
          selectedOccupiedBed?.bedNumber ??
          null
        }
        residentName={
          selectedOccupiedBed?.residentName ??
          null
        }
        onClose={handleCloseVacate}
        onSuccess={
          handleVacateSuccess
        }
      />

    </div>
  );
}

/* ==========================================================================
   STAT CARD
   ========================================================================== */

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">

      <p className="truncate text-xs font-semibold text-gray-500 sm:text-sm">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        {value}
      </p>

      <p className="mt-1 truncate text-[11px] text-gray-400 sm:text-xs">
        {description}
      </p>

    </div>
  );
}

/* ==========================================================================
   FILTER BUTTON
   ========================================================================== */

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        min-h-10
        rounded-lg
        px-2
        py-2
        text-[11px]
        font-semibold
        transition
        sm:text-xs
        ${
          active
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-900"
        }
      `}
    >
      {label}

      <span
        className={`
          ml-1
          ${
            active
              ? "text-gray-500"
              : "text-gray-400"
          }
        `}
      >
        {count}
      </span>
    </button>
  );
}

/* ==========================================================================
   DESKTOP ROOM ROW
   ========================================================================== */

function DesktopRoomRow({
  room,
  expanded,
  onToggle,
  onAllocate,
  onVacate,
}: {
  room: Room;
  expanded: boolean;
  onToggle: () => void;
  onAllocate: (bed: Bed) => void;
  onVacate: (bed: Bed) => void;
}) {
  const occupiedBeds =
    room.beds.filter(
      (bed) => bed.status === "occupied"
    ).length;

  const totalBeds = room.beds.length;

  const vacantBeds =
    totalBeds - occupiedBeds;

  const isFull =
    totalBeds > 0 &&
    occupiedBeds === totalBeds;

  const isPartial =
    occupiedBeds > 0 &&
    occupiedBeds < totalBeds;

  return (
    <div>

      {/* Main Row */}

      <div className="grid grid-cols-[1.1fr_0.8fr_1.8fr_0.9fr_0.8fr] items-center gap-4 px-5 py-4">

        {/* Room */}

        <div className="min-w-0">

          <p className="truncate text-sm font-bold text-gray-900">
            Room {room.roomNumber}
          </p>

          <p className="mt-0.5 text-xs text-gray-400">
            {totalBeds}{" "}
            {totalBeds === 1
              ? "bed"
              : "beds"}
          </p>

        </div>

        {/* Sharing */}

        <div>

          <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700">
            {room.sharingType ===
            "1_sharing"
              ? "1 Sharing"
              : "2 Sharing"}
          </span>

        </div>

        {/* Beds */}

        <div className="min-w-0">

          <div className="flex flex-wrap gap-1.5">

            {room.beds.map((bed) => (
              <BedCompact
                key={bed.id}
                bed={bed}
              />
            ))}

          </div>

        </div>

        {/* Occupancy */}

        <div>

          <OccupancyBadge
            occupied={occupiedBeds}
            total={totalBeds}
            full={isFull}
            partial={isPartial}
          />

          <p className="mt-1 text-xs text-gray-400">
            {vacantBeds} vacant
          </p>

        </div>

        {/* Actions */}

        <div className="flex justify-end">

          <button
            type="button"
            onClick={onToggle}
            className="
              inline-flex
              min-h-10
              items-center
              gap-1.5
              rounded-xl
              border
              border-gray-200
              bg-white
              px-3
              py-2
              text-xs
              font-semibold
              text-gray-700
              transition
              hover:bg-gray-50
              focus:outline-none
              focus:ring-2
              focus:ring-gray-900
              focus:ring-offset-1
            "
          >
            {expanded
              ? "Hide"
              : "Manage"}

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`
                h-4
                w-4
                transition-transform
                ${
                  expanded
                    ? "rotate-180"
                    : ""
                }
              `}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>

          </button>

        </div>

      </div>

      {/* Expanded Details */}

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">

            {room.beds.map((bed) => (
              <BedManagementCard
                key={bed.id}
                bed={bed}
                onAllocate={onAllocate}
                onVacate={onVacate}
              />
            ))}

          </div>

        </div>
      )}

    </div>
  );
}

/* ==========================================================================
   MOBILE ROOM CARD
   ========================================================================== */

function MobileRoomCard({
  room,
  expanded,
  onToggle,
  onAllocate,
  onVacate,
}: {
  room: Room;
  expanded: boolean;
  onToggle: () => void;
  onAllocate: (bed: Bed) => void;
  onVacate: (bed: Bed) => void;
}) {
  const occupiedBeds =
    room.beds.filter(
      (bed) => bed.status === "occupied"
    ).length;

  const totalBeds = room.beds.length;

  const isFull =
    totalBeds > 0 &&
    occupiedBeds === totalBeds;

  const isPartial =
    occupiedBeds > 0 &&
    occupiedBeds < totalBeds;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* Header */}

      <button
        type="button"
        onClick={onToggle}
        className="
          flex
          min-h-20
          w-full
          items-center
          justify-between
          gap-3
          p-4
          text-left
          active:bg-gray-50
        "
      >

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <h3 className="truncate text-base font-bold text-gray-900">
              Room {room.roomNumber}
            </h3>

            <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
              {room.sharingType ===
              "1_sharing"
                ? "1 Sharing"
                : "2 Sharing"}
            </span>

          </div>

          <p className="mt-1 text-xs text-gray-500">
            {occupiedBeds} of{" "}
            {totalBeds} beds occupied
          </p>

        </div>

        <div className="flex shrink-0 items-center gap-2">

          <OccupancyBadge
            occupied={occupiedBeds}
            total={totalBeds}
            full={isFull}
            partial={isPartial}
          />

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`
              h-5
              w-5
              text-gray-400
              transition-transform
              ${
                expanded
                  ? "rotate-180"
                  : ""
              }
            `}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>

        </div>

      </button>

      {/* Expanded Beds */}

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-3">

          <div className="space-y-2">

            {room.beds.map((bed) => (
              <BedManagementCard
                key={bed.id}
                bed={bed}
                onAllocate={onAllocate}
                onVacate={onVacate}
              />
            ))}

          </div>

        </div>
      )}

    </article>
  );
}

/* ==========================================================================
   BED COMPACT
   ========================================================================== */

function BedCompact({
  bed,
}: {
  bed: Bed;
}) {
  const occupied =
    bed.status === "occupied";

  return (
    <div
      className={`
        inline-flex
        max-w-full
        items-center
        gap-1.5
        rounded-lg
        border
        px-2
        py-1.5
        ${
          occupied
            ? "border-orange-200 bg-orange-50"
            : "border-green-200 bg-green-50"
        }
      `}
    >

      <span
        className={`
          h-1.5
          w-1.5
          shrink-0
          rounded-full
          ${
            occupied
              ? "bg-orange-500"
              : "bg-green-500"
          }
        `}
      />

      <span className="truncate text-xs font-semibold text-gray-700">
        {bed.bedNumber}
      </span>

      {occupied &&
        bed.residentName && (
          <span className="max-w-24 truncate text-[11px] text-gray-500">
            · {bed.residentName}
          </span>
        )}

    </div>
  );
}

/* ==========================================================================
   BED MANAGEMENT CARD
   ========================================================================== */

function BedManagementCard({
  bed,
  onAllocate,
  onVacate,
}: {
  bed: Bed;
  onAllocate: (bed: Bed) => void;
  onVacate: (bed: Bed) => void;
}) {
  const occupied =
    bed.status === "occupied";

  return (
    <div
      className={`
        rounded-xl
        border
        bg-white
        p-3
        ${
          occupied
            ? "border-orange-200"
            : "border-green-200"
        }
      `}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-sm font-bold text-gray-900">
            {bed.bedNumber}
          </p>

          {occupied ? (
            <div className="mt-1">

              <p className="truncate text-sm text-gray-700">
                {bed.residentName ??
                  "Resident"}
              </p>

              {bed.residentPhone && (
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {bed.residentPhone}
                </p>
              )}

            </div>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Available
            </p>
          )}

        </div>

        <span
          className={`
            shrink-0
            rounded-full
            px-2
            py-1
            text-[10px]
            font-bold
            ${
              occupied
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
            }
          `}
        >
          {occupied
            ? "Occupied"
            : "Vacant"}
        </span>

      </div>

      <div className="mt-3">

        {occupied ? (
          <button
            type="button"
            onClick={() =>
              onVacate(bed)
            }
            className="
              min-h-10
              w-full
              rounded-xl
              border
              border-red-200
              bg-white
              px-3
              py-2.5
              text-xs
              font-bold
              text-red-600
              transition
              hover:bg-red-50
              focus:outline-none
              focus:ring-2
              focus:ring-red-500
              focus:ring-offset-1
            "
          >
            Vacate Bed
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onAllocate(bed)
            }
            className="
              min-h-10
              w-full
              rounded-xl
              bg-gray-900
              px-3
              py-2.5
              text-xs
              font-bold
              text-white
              transition
              hover:bg-gray-800
              focus:outline-none
              focus:ring-2
              focus:ring-gray-900
              focus:ring-offset-1
            "
          >
            Allocate Bed
          </button>
        )}

      </div>

    </div>
  );
}

/* ==========================================================================
   OCCUPANCY BADGE
   ========================================================================== */

function OccupancyBadge({
  occupied,
  total,
  full,
  partial,
}: {
  occupied: number;
  total: number;
  full: boolean;
  partial: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-bold
        ${
          full
            ? "border-orange-200 bg-orange-50 text-orange-700"
            : partial
            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
            : "border-green-200 bg-green-50 text-green-700"
        }
      `}
    >
      {occupied}/{total}
    </span>
  );
}

/* ==========================================================================
   PAGINATION
   ========================================================================== */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getPaginationPages(
    currentPage,
    totalPages
  );

  return (
    <nav
      aria-label="Room pagination"
      className="flex items-center justify-center gap-1.5 sm:gap-2"
    >

      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() =>
          onPageChange(
            currentPage - 1
          )
        }
        className="
          flex
          min-h-10
          items-center
          gap-1
          rounded-xl
          border
          border-gray-200
          bg-white
          px-3
          py-2
          text-xs
          font-semibold
          text-gray-700
          shadow-sm
          transition
          hover:bg-gray-50
          disabled:pointer-events-none
          disabled:opacity-40
          sm:text-sm
        "
      >
        <span>‹</span>
        <span className="hidden sm:inline">
          Previous
        </span>
      </button>

      <div className="flex items-center gap-1">

        {pages.map(
          (page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1.5 text-sm text-gray-400"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() =>
                  onPageChange(page)
                }
                aria-current={
                  page === currentPage
                    ? "page"
                    : undefined
                }
                className={`
                  flex
                  h-10
                  min-w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  px-2
                  text-xs
                  font-bold
                  transition
                  sm:text-sm
                  ${
                    page === currentPage
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                {page}
              </button>
            )
        )}

      </div>

      <button
        type="button"
        disabled={
          currentPage === totalPages
        }
        onClick={() =>
          onPageChange(
            currentPage + 1
          )
        }
        className="
          flex
          min-h-10
          items-center
          gap-1
          rounded-xl
          border
          border-gray-200
          bg-white
          px-3
          py-2
          text-xs
          font-semibold
          text-gray-700
          shadow-sm
          transition
          hover:bg-gray-50
          disabled:pointer-events-none
          disabled:opacity-40
          sm:text-sm
        "
      >
        <span className="hidden sm:inline">
          Next
        </span>
        <span>›</span>
      </button>

    </nav>
  );
}

/* ==========================================================================
   PAGINATION HELPER
   ========================================================================== */

function getPaginationPages(
  currentPage: number,
  totalPages: number
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1
    );
  }

  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "...",
      totalPages,
    ];
  }

  if (
    currentPage >=
    totalPages - 3
  ) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

/* ==========================================================================
   LOADING SKELETON
   ========================================================================== */

function RoomManagementSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">

      {/* Header */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="space-y-3">

            <div className="h-6 w-48 animate-pulse rounded-lg bg-gray-200" />

            <div className="h-4 w-64 animate-pulse rounded-lg bg-gray-100" />

          </div>

          <div className="h-11 w-full animate-pulse rounded-xl bg-gray-200 sm:w-32" />

        </div>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />

            <div className="mt-3 h-8 w-12 animate-pulse rounded bg-gray-200" />

            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        ))}

      </div>

      {/* Search */}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

        <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />

        <div className="mt-2 h-11 w-full animate-pulse rounded-xl bg-gray-100" />

      </div>

      {/* Rooms */}

      <div className="space-y-3">

        {Array.from({
          length: 5,
        }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}

      </div>

    </div>
  );
}