// Dummy data layer — will be swapped with Lovable Cloud later.
// Single source of truth for stations, rooms, and bookings during mockup phase.

export type RoomType = "meeting" | "office" | "collaboration";
export type BookingStatus = "pending" | "confirmed" | "rejected";

export interface Station {
  id: string;
  name: string;
  region: 1 | 2 | 3;
}

export interface Room {
  id: string;
  stationId: string;
  name: string;
  type: RoomType;
  capacity: number;
}

export interface Booking {
  id: number;
  roomId: string;
  requesterName: string;
  email: string;
  origin: string; // "MRT — Departemen X" atau "Mitra — PT Y"
  attendees: number;
  equipment: { item: string; qty: number }[];
  date: string; // ISO yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: BookingStatus;
  createdAt: string;
  rejectionReason?: string;
  phone?: string;
  visitorType?: "internal" | "external";
  attended?: boolean;
}

export const STATIONS: Station[] = [
  // Region 1
  { id: "lebak-bulus", name: "Lebak Bulus", region: 1 },
  { id: "fatmawati", name: "Fatmawati", region: 1 },
  { id: "cipete-raya", name: "Cipete Raya", region: 1 },
  { id: "haji-nawi", name: "Haji Nawi", region: 1 },
  // Region 2
  { id: "blok-a", name: "Blok A", region: 2 },
  { id: "blok-m", name: "Blok M", region: 2 },
  { id: "asean", name: "ASEAN", region: 2 },
  { id: "senayan", name: "Senayan", region: 2 },
  { id: "istora", name: "Istora", region: 2 },
  // Region 3
  { id: "bendungan-hilir", name: "Bendungan Hilir", region: 3 },
  { id: "setiabudi", name: "Setiabudi", region: 3 },
  { id: "dukuh-atas", name: "Dukuh Atas", region: 3 },
  { id: "bundaran-hi", name: "Bundaran HI", region: 3 },
];

export const ROOMS: Room[] = [
  // Region 1
  { id: "haji-nawi-meeting", stationId: "haji-nawi", name: "Meeting Room", type: "meeting", capacity: 10 },
  { id: "cipete-raya-office", stationId: "cipete-raya", name: "Station Office", type: "office", capacity: 6 },
  // Region 2
  { id: "blok-a-office", stationId: "blok-a", name: "Station Office", type: "office", capacity: 6 },
  { id: "blok-m-meeting", stationId: "blok-m", name: "Meeting Room", type: "meeting", capacity: 12 },
  // Region 3
  { id: "benhil-office", stationId: "bendungan-hilir", name: "Station Office", type: "office", capacity: 6 },
  { id: "setiabudi-office", stationId: "setiabudi", name: "Station Office", type: "office", capacity: 6 },
  { id: "hi-meeting", stationId: "bundaran-hi", name: "Meeting Room", type: "meeting", capacity: 14 },
  { id: "hi-collab", stationId: "bundaran-hi", name: "Collaboration Room", type: "collaboration", capacity: 20 },
  { id: "hi-office", stationId: "bundaran-hi", name: "Station Office", type: "office", capacity: 8 },
];

// Seed a few example bookings (today-ish so the calendar looks alive)
const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const offset = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const seedBookings: Booking[] = [
  {
    id: 1,
    roomId: "hi-meeting",
    requesterName: "Arvin",
    email: "arvin@mrtjakarta.co.id",
    origin: "MRT — TCM",
    attendees: 8,
    equipment: [{ item: "Proyektor", qty: 1 }, { item: "Kabel Roll", qty: 2 }],
    date: offset(2),
    startTime: "14:00",
    endTime: "17:00",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    phone: "08123456789",
    visitorType: "internal",
  },
  {
    id: 2,
    roomId: "hi-collab",
    requesterName: "PT VMI",
    email: "pic@vmi.co.id",
    origin: "Mitra — PT VMI",
    attendees: 12,
    equipment: [{ item: "Proyektor", qty: 1 }, { item: "Layar Proyektor", qty: 1 }],
    date: offset(1),
    startTime: "14:00",
    endTime: "15:30",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    phone: "08987654321",
    visitorType: "external",
  },
];

// In-memory store with localStorage persistence (mockup only)
const STORAGE_KEY = "mrtj-bookings-v1";

function loadBookings(): Booking[] {
  if (typeof window === "undefined") return seedBookings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedBookings));
      return seedBookings;
    }
    return JSON.parse(raw) as Booking[];
  } catch {
    return seedBookings;
  }
}

function saveBookings(b: Booking[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
}

export const bookingsStore = {
  list(): Booking[] {
    return loadBookings();
  },
  add(input: Omit<Booking, "id" | "status" | "createdAt">): Booking {
    const all = loadBookings();
    const next: Booking = {
      ...input,
      id: (all[0]?.id ?? 0) + Math.floor(Math.random() * 100) + 1,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const updated = [next, ...all];
    saveBookings(updated);
    return next;
  },
  updateStatus(id: number, status: BookingStatus): void {
    const all = loadBookings();
    const updated = all.map((b) => (b.id === id ? { ...b, status } : b));
    saveBookings(updated);
  },
  reset() {
    saveBookings(seedBookings);
  },
};

export const REGION_LABEL: Record<1 | 2 | 3, string> = {
  1: "Region 1 · Lebak Bulus → Haji Nawi",
  2: "Region 2 · Blok A → Istora",
  3: "Region 3 · Bendungan Hilir → Bundaran HI",
};

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  meeting: "Meeting Room",
  office: "Station Office",
  collaboration: "Collaboration Room",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu",
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
};

export function getStation(id: string) {
  return STATIONS.find((s) => s.id === id);
}

export function getRoom(id: string) {
  return ROOMS.find((r) => r.id === id);
}

export function getRoomsByStation(stationId: string) {
  return ROOMS.filter((r) => r.stationId === stationId);
}

export function getStationsByRegion(region: 1 | 2 | 3) {
  return STATIONS.filter((s) => s.region === region);
}

export function stationHasRooms(stationId: string) {
  return ROOMS.some((r) => r.stationId === stationId);
}
