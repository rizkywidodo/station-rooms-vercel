import { supabase } from "./supabase";
import type { BookingStatus, Booking, Station, Room } from "./dummy-data";

// Stations
export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase.from("stations").select("*");
  if (error) throw error;
  return data.map((s) => ({ id: s.id, name: s.name, region: s.region as 1 | 2 | 3 }));
}

// Rooms
export async function getRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from("rooms").select("*");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    stationId: r.station_id,
    name: r.name,
    type: r.type as Room["type"],
    capacity: r.capacity,
  }));
}

export async function getRoomsByStationId(stationId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("station_id", stationId);
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    stationId: r.station_id,
    name: r.name,
    type: r.type as Room["type"],
    capacity: r.capacity,
  }));
}

// Bookings
export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbToBooking);
}

export async function addBooking(
  input: Omit<Booking, "id" | "status" | "createdAt">
): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      room_id: input.roomId,
      requester_name: input.requesterName,
      email: input.email,
      origin: input.origin,
      attendees: input.attendees,
      notes: input.notes,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToBooking(data);
}

export async function updateBookingStatus(
  id: number,
  status: BookingStatus
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// Helper
function dbToBooking(r: any): Booking {
  return {
    id: r.id,
    roomId: r.room_id,
    requesterName: r.requester_name,
    email: r.email,
    origin: r.origin,
    attendees: r.attendees,
    notes: r.notes ?? "",
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status as BookingStatus,
    createdAt: r.created_at,
  };
}
