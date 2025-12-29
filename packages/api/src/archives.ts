import { supabase } from './client';
import type { TourArchive, TranscriptSegment } from '@tourlingo/types';

export async function getArchiveByTourId(tourId: string): Promise<TourArchive | null> {
  const { data, error } = await supabase
    .from('archives')
    .select('*')
    .eq('tour_id', tourId)
    .single();

  if (error || !data) return null;

  return mapArchiveFromDb(data);
}

export async function getOperatorArchives(operatorId: string): Promise<TourArchive[]> {
  const { data, error } = await supabase
    .from('archives')
    .select(`
      *,
      tours!inner(operator_id)
    `)
    .eq('tours.operator_id', operatorId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(mapArchiveFromDb);
}

export async function createArchive(
  tourId: string,
  stats: {
    durationSeconds: number;
    guestCount: number;
    languages: string[];
    questionCount: number;
  }
): Promise<TourArchive | null> {
  const { data, error } = await supabase
    .from('archives')
    .insert({
      tour_id: tourId,
      duration_seconds: stats.durationSeconds,
      guest_count: stats.guestCount,
      languages: stats.languages,
      question_count: stats.questionCount,
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapArchiveFromDb(data);
}

export async function getTranscriptSegments(
  archiveId: string
): Promise<TranscriptSegment[]> {
  const { data, error } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('archive_id', archiveId)
    .order('timestamp_ms', { ascending: true });

  if (error || !data) return [];

  return data.map(mapSegmentFromDb);
}

export async function addTranscriptSegment(
  archiveId: string,
  segment: Omit<TranscriptSegment, 'id' | 'archiveId' | 'createdAt'>
): Promise<TranscriptSegment | null> {
  const { data, error } = await supabase
    .from('transcript_segments')
    .insert({
      archive_id: archiveId,
      speaker_id: segment.speakerId,
      speaker_name: segment.speakerName,
      speaker_role: segment.speakerRole,
      original_text: segment.originalText,
      original_language: segment.originalLanguage,
      translations: segment.translations,
      timestamp_ms: segment.timestampMs,
      duration_ms: segment.durationMs,
      is_question: segment.isQuestion,
    })
    .select()
    .single();

  if (error || !data) return null;

  return mapSegmentFromDb(data);
}

function mapArchiveFromDb(data: any): TourArchive {
  return {
    id: data.id,
    tourId: data.tour_id,
    durationSeconds: data.duration_seconds,
    guestCount: data.guest_count,
    languages: data.languages || [],
    questionCount: data.question_count,
    operatorAudioUrl: data.operator_audio_url,
    createdAt: data.created_at,
  };
}

function mapSegmentFromDb(data: any): TranscriptSegment {
  return {
    id: data.id,
    archiveId: data.archive_id,
    speakerId: data.speaker_id,
    speakerName: data.speaker_name,
    speakerRole: data.speaker_role,
    originalText: data.original_text,
    originalLanguage: data.original_language,
    translations: data.translations || {},
    timestampMs: data.timestamp_ms,
    durationMs: data.duration_ms,
    isQuestion: data.is_question,
    createdAt: data.created_at,
  };
}
