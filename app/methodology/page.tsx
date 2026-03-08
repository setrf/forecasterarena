import MethodologyPageContent from '@/features/methodology/MethodologyPageContent';
import { getPublicCatalogModels } from '@/lib/catalog/public';

export const metadata = {
  title: 'Methodology | Forecaster Arena',
  description: 'Complete academic methodology for Forecaster Arena - testing LLM forecasting capabilities with real prediction markets.',
};

export default function MethodologyPage() {
  return <MethodologyPageContent models={getPublicCatalogModels()} />;
}
