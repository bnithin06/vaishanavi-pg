"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AllocateBedModalProps = {
  open: boolean;
  bedId: number | null;
  bedNumber: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type Resident = {
  id: string;
  full_name: string;
  phone: string | null;
};

export default function AllocateBedModal({
  open,
  bedId,
  bedNumber,
  onClose,
  onSuccess,
}: AllocateBedModalProps) {
  const supabase = createClient();

  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState("");
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fetchResidents = async () => {
      try {
        setLoadingResidents(true);
        setError(null);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .eq("is_active", true)
          .order("full_name");

        if (error) {
          throw error;
        }

        setResidents(data ?? []);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load residents."
        );
      } finally {
        setLoadingResidents(false);
      }
    };

    fetchResidents();
  }, [open]);

  if (!open || bedId === null) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedResident) {
      setError("Please select a resident.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc("allocate_bed", {
        p_bed_id: bedId,
        p_resident_id: selectedResident,
      });

      if (error) {
        throw error;
      }

      setSelectedResident("");

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to allocate bed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        bg-black/40
        sm:items-center
        sm:p-4
      "
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          rounded-t-3xl
          bg-white
          p-5
          shadow-xl
          sm:max-w-md
          sm:rounded-2xl
          sm:p-6
        "
      >
        {/* Header */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Allocate Bed
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Allocate{" "}
              <span className="font-semibold text-gray-700">
                {bedNumber}
              </span>{" "}
              to a resident.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              text-xl
              text-gray-500
              hover:bg-gray-100
              disabled:opacity-50
            "
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div>
            <label
              htmlFor="resident"
              className="
                mb-2
                block
                text-sm
                font-semibold
                text-gray-700
              "
            >
              Select Resident
            </label>

            {loadingResidents ? (
              <div
                className="
                  rounded-xl
                  border
                  border-gray-300
                  bg-gray-50
                  px-4
                  py-3
                  text-sm
                  text-gray-500
                "
              >
                Loading residents...
              </div>
            ) : residents.length === 0 ? (
              <div
                className="
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  p-4
                "
              >
                <p className="text-sm font-medium text-amber-700">
                  No active residents found.
                </p>
              </div>
            ) : (
              <select
                id="resident"
                value={selectedResident}
                onChange={(event) =>
                  setSelectedResident(event.target.value)
                }
                disabled={loading}
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  px-4
                  py-3
                  text-base
                  text-gray-900
                  outline-none
                  focus:border-gray-900
                  focus:ring-2
                  focus:ring-gray-900/10
                  disabled:bg-gray-100
                "
              >
                <option value="">
                  Select a resident
                </option>

                {residents.map((resident) => (
                  <option
                    key={resident.id}
                    value={resident.id}
                  >
                    {resident.full_name}
                    {resident.phone
                      ? ` - ${resident.phone}`
                      : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-200
                bg-red-50
                p-4
              "
            >
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}

          <div
            className="
              flex
              flex-col-reverse
              gap-3
              pt-2
              sm:flex-row
              sm:justify-end
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                w-full
                rounded-xl
                border
                border-gray-300
                px-5
                py-3
                text-sm
                font-semibold
                text-gray-700
                hover:bg-gray-50
                disabled:opacity-50
                sm:w-auto
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                loadingResidents ||
                residents.length === 0 ||
                !selectedResident
              }
              className="
                w-full
                rounded-xl
                bg-gray-900
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                shadow-sm
                hover:bg-gray-800
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:w-auto
              "
            >
              {loading
                ? "Allocating..."
                : "Allocate Bed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}