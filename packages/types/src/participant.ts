export interface Participant {
  id: string;
  tourId: string;
  userId?: string;
  displayName: string;
  language: string;
  isOperator: boolean;
  joinedAt: string;
  leftAt?: string;
  questionsAsked: number;
}

export interface ParticipantMetadata {
  language: string;
  isOperator: boolean;
  displayName?: string;
}

export interface GuestJoinInput {
  tourId: string;
  displayName: string;
  language: string;
}
