import { supabase } from './client';
import type { Participant, GuestJoinInput } from '@tourlingo/types';

export async function getTourParticipants(tourId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('tour_id', tourId)
    .is('left_at', null)
    .order('joined_at', { ascending: true });

  if (error || !data) return [];

  return data.map(mapParticipantFromDb);
}

export async function addParticipant(input: GuestJoinInput): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      tour_id: input.tourId,
      display_name: input.displayName,
      language: input.language,
      is_operator: false,
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapParticipantFromDb(data);
}

export async function removeParticipant(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('participants')
    .update({ left_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

export async function incrementQuestionCount(id: string): Promise<boolean> {
  const { error } = await supabase.rpc('increment_questions_asked', {
    participant_id: id,
  });

  return !error;
}

function mapParticipantFromDb(data: any): Participant {
  return {
    id: data.id,
    tourId: data.tour_id,
    userId: data.user_id,
    displayName: data.display_name,
    language: data.language,
    isOperator: data.is_operator,
    joinedAt: data.joined_at,
    leftAt: data.left_at,
    questionsAsked: data.questions_asked,
  };
}
