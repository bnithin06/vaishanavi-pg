export type Room = {
  id: string;
  room_number: string;
  floor: number | null;
  capacity: number;
  created_at: string;
  updated_at: string;
};

export type Bed = {
  id: string;
  room_id: string;
  bed_number: string;
  status: 'available' | 'occupied';
  resident_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Resident = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  joining_date: string | null;
  checkout_date: string | null;
  status: 'active' | 'checked_out';
  created_at: string;
  updated_at: string;
};

export type BedWithResident = Bed & {
  residents?: Resident | null;
};

export type RoomWithBeds = Room & {
  beds: BedWithResident[];
};