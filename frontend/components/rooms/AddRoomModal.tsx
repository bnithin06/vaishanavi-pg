"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AddRoomModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddRoomModal({
  open,
  onClose,
  onSuccess,
}: AddRoomModalProps) {
  const supabase = createClient();

  const [roomNumber, setRoomNumber] = useState("");
  const [sharingType, setSharingType] = useState<
    "1_sharing" | "2_sharing"
  >("1_sharing");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedRoomNumber = roomNumber.trim();

    if (!trimmedRoomNumber) {
      setError("Room number is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.rpc("create_room", {
        p_room_number: trimmedRoomNumber,
        p_sharing_type: sharingType,
      });

      if (error) {
        throw error;
      }

      setRoomNumber("");
      setSharingType("1_sharing");

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create room."
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
        p-0
        sm:items-center
        sm:p-4
      "
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
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
              Add Room
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create a room and its beds.
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

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          {/* Room Number */}
          <div>
            <label
              htmlFor="room-number"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Room Number
            </label>

            <input
              id="room-number"
              type="text"
              value={roomNumber}
              onChange={(event) =>
                setRoomNumber(event.target.value)
              }
              placeholder="Example: 103"
              disabled={loading}
              autoFocus
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
                transition
                placeholder:text-gray-400
                focus:border-gray-900
                focus:ring-2
                focus:ring-gray-900/10
                disabled:bg-gray-100
              "
            />
          </div>

          {/* Sharing Type */}
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700">
              Sharing Type
            </p>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={loading}
                onClick={() => setSharingType("1_sharing")}
                className={`
                  rounded-xl
                  border
                  px-4
                  py-4
                  text-left
                  transition
                  ${
                    sharingType === "1_sharing"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <span className="block font-semibold">
                  1 Sharing
                </span>

                <span
                  className={`
                    mt-1 block text-xs
                    ${
                      sharingType === "1_sharing"
                        ? "text-gray-300"
                        : "text-gray-500"
                    }
                  `}
                >
                  1 bed
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => setSharingType("2_sharing")}
                className={`
                  rounded-xl
                  border
                  px-4
                  py-4
                  text-left
                  transition
                  ${
                    sharingType === "2_sharing"
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <span className="block font-semibold">
                  2 Sharing
                </span>

                <span
                  className={`
                    mt-1 block text-xs
                    ${
                      sharingType === "2_sharing"
                        ? "text-gray-300"
                        : "text-gray-500"
                    }
                  `}
                >
                  2 beds
                </span>
              </button>

            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

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
              disabled={loading}
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
              {loading ? "Creating..." : "Create Room"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}