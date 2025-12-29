import { supabase } from './client';
import type { Tour, CreateTourInput, UpdateTourInput } from '@tourlingo/types';

export async function getTourByCode(code: string): Promise<Tour | null> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('access_code', code.toUpperCase())
    .single();

  if (error || !data) return null;

  return mapTourFromDb(data);
}

export async function getTourById(id: string): Promise<Tour | null> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return mapTourFromDb(data);
}

export async function getOperatorTours(operatorId: string): Promise<Tour[]> {
  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('operator_id', operatorId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(mapTourFromDb);
}

export async function createTour(input: CreateTourInput): Promise<Tour | null> {
  const accessCode = generateAccessCode();

  const { data, error } = await supabase
    .from('tours')
    .insert({
      operator_id: input.operatorId,
      name: input.name,
      access_code: accessCode,
      max_guests: input.maxGuests || 16,
      status: 'created',
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapTourFromDb(data);
}

export async function updateTour(
  id: string,
  input: UpdateTourInput
): Promise<Tour | null> {
  const updates: Record<string, any> = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.status !== undefined) updates.status = input.status;
  if (input.startedAt !== undefined) updates.started_at = input.startedAt;
  if (input.endedAt !== undefined) updates.ended_at = input.endedAt;

  const { data, error } = await supabase
    .from('tours')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;

  return mapTourFromDb(data);
}

export async function startTour(id: string): Promise<Tour | null> {
  return updateTour(id, {
    status: 'live',
    startedAt: new Date().toISOString(),
  });
}

export async function endTour(id: string): Promise<Tour | null> {
  return updateTour(id, {
    status: 'ended',
    endedAt: new Date().toISOString(),
  });
}

export async function deleteTour(id: string): Promise<boolean> {
  const { error } = await supabase.from('tours').delete().eq('id', id);
  return !error;
}

// Helpers

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function mapTourFromDb(data: any): Tour {
  return {
    id: data.id,
    operatorId: data.operator_id,
    name: data.name,
    accessCode: data.access_code,
    status: data.status,
    maxGuests: data.max_guests,
    livekitRoomName: data.livekit_room_name,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
