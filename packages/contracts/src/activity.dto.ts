import { UserSummaryDto } from './auth.dto.js';
import { TargetType } from './enums.js';

export interface ActivityTimelineDto {
  id: string;
  targetType: TargetType;
  targetId: string;
  actionType: string;
  metadata: Record<string, unknown>;
  actor: UserSummaryDto;
  createdAt: string;
}

export interface SavedViewDto {
  id: string;
  name: string;
  targetType: TargetType;
  filterState: Record<string, unknown>;
  createdAt: string;
}

export interface SearchResultItemDto {
  id: string;
  type: 'ISSUE' | 'REVIEW' | 'USER' | 'REPOSITORY';
  number?: number;
  title: string;
  snippet?: string;
  status?: string;
  link: string;
}

