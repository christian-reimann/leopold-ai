import type { ToolSet } from 'ai';
import type { AgentContext } from './context';
import { createApplicationTools } from './tools/application-tools';
import { documentTools } from './tools/document-tools';
import { jobTools } from './tools/job-tools';
import { profileTools } from './tools/profile-tools';
import { searchQueryTools } from './tools/search-query-tools';

export function buildAgentTools(context: AgentContext): ToolSet {
  return {
    ...documentTools,
    ...profileTools,
    ...searchQueryTools,
    ...jobTools,
    ...createApplicationTools(context),
  };
}

export const DESTRUCTIVE_TOOL_NAMES = ['deleteDocument', 'deleteSearchQuery', 'deleteApplication'] as const;
