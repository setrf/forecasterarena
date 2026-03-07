import type { ExportState } from '@/features/admin/dashboard/types';

export const initialExportState: ExportState = {
  cohortId: '',
  from: '',
  to: '',
  includePrompts: false
};
