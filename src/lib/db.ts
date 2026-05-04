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
    equipment: input.equipment ?? [],
    date: input.date,
    start_time: input.startTime,
    end_time: input.endTime,
    phone: input.phone ?? null,
    visitor_type: input.visitorType ?? "internal",
    status: "confirmed",
  })
    .select()
    .single();
  if (error) throw error;
  return dbToBooking(data);
}

export async function updateBookingStatus(
  id: number,
  status: BookingStatus,
  rejectionReason?: string
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status, ...(rejectionReason && { rejection_reason: rejectionReason }) })
    .eq("id", id);
  if (error) throw error;
}

// CRUD Rooms
export async function addRoom(room: Omit<Room, "id">): Promise<Room> {
  const id = `${room.stationId}-${room.type}-${Date.now()}`;
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      id,
      station_id: room.stationId,
      name: room.name,
      type: room.type,
      capacity: room.capacity,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, stationId: data.station_id, name: data.name, type: data.type, capacity: data.capacity };
}

export async function updateRoom(id: string, updates: Partial<Pick<Room, "name" | "type" | "capacity">>): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({
      ...(updates.name && { name: updates.name }),
      ...(updates.type && { type: updates.type }),
      ...(updates.capacity && { capacity: updates.capacity }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

// Activity Logs
export async function addLog(action: string, actor: string, detail?: string): Promise<void> {
  await supabase.from("activity_logs").insert({ action, actor, detail });
}

export async function getLogs(limit = 50, offset = 0): Promise<{ id: number; action: string; actor: string; detail: string | null; created_at: string }[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data;
}

export async function getLogsCount(): Promise<number> {
  const { count, error } = await supabase
    .from("activity_logs")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
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
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status as BookingStatus,
    createdAt: r.created_at,
    rejectionReason: r.rejection_reason ?? undefined,
    phone: r.phone ?? undefined,
    visitorType: r.visitor_type ?? "internal",
    equipment: r.equipment ?? [],
    attended: r.attended ?? false,
  };
}

export async function deleteBooking(id: number): Promise<void> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

export async function getUserProfile(userId: string): Promise<{ id: string; name: string; role: string; region?: number; station_id?: string } | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function markAttended(id: number): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ attended: true })
    .eq("id", id);
  if (error) throw error;
}