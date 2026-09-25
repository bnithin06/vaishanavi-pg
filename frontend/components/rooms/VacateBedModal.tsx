"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type VacateBedModalProps = {
  open: boolean;
  bedId: number | null;
  bedNumber: string | null;
  residentName: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function VacateBedModal({
  open,
  bedId,
  bedNumber,
  residentName,
  onClose,
  onSuccess,
}: VacateBedModalProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || bedId === null) {
    return null;
  }

  const handleVacate = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc("vacate_bed", {
        p_bed_id: bedId,
      });

      if (error) {
        throw error;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to vacate bed."
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
              Vacate Bed
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Remove the resident from this bed.
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

        {/* Details */}

        <div
          className="
            mt-6
            rounded-xl
            border
            border-gray-200
            bg-gray-50
            p-4
          "
        >
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500">
                Bed
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {bedNumber}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium text-gray-500">
                Resident
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {residentName || "Unknown"}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-gray-600">
          Are you sure you want to vacate this bed?
          The allocation history will be preserved.
        </p>

        {error && (
          <div
            className="
              mt-4
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
            mt-6
            flex
            flex-col-reverse
            gap-3
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
            type="button"
            onClick={handleVacate}
            disabled={loading}
            className="
              w-full
              rounded-xl
              bg-red-600
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              shadow-sm
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:w-auto
            "
          >
            {loading ? "Vacating..." : "Vacate Bed"}
          </button>
        </div>
      </div>
    </div>
  );
}