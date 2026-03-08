import type { AdminBenchmarkOverview } from '@/lib/application/admin-benchmark';
import type { ResultMessage } from '@/features/admin/dashboard/types';

export type BenchmarkOverview = AdminBenchmarkOverview;
export type BenchmarkResultMessage = ResultMessage;
export type BenchmarkRolloverPreview = import('@/lib/application/admin-benchmark').AdminBenchmarkRolloverPreview;

export interface ReleaseFormState {
  familyId: string;
  releaseName: string;
  openrouterId: string;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
  notes: string;
}

export interface ConfigAssignmentState {
  familyId: string;
  releaseId: string;
  inputPricePerMillion: string;
  outputPricePerMillion: string;
}

export interface ConfigFormState {
  versionName: string;
  methodologyVersion: string;
  notes: string;
  assignments: ConfigAssignmentState[];
}
