import type { ToolSet } from 'ai';
import { applicationTools } from './tools/application-tools';
import { documentTools } from './tools/document-tools';
import { jobTools } from './tools/job-tools';
import { profileTools } from './tools/profile-tools';
import { searchQueryTools } from './tools/search-query-tools';

export function buildAgentTools(profileId: string): ToolSet {
  return {
    ...documentTools(profileId),
    ...profileTools(profileId),
    ...searchQueryTools(profileId),
    ...jobTools(profileId),
    ...applicationTools(profileId),
  };
}

export const DESTRUCTIVE_TOOL_NAMES = ['deleteDocument', 'deleteSearchQuery', 'deleteApplication'] as const;
