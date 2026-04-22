import MethodologyPageContent from '@/features/methodology/MethodologyPageContent';
import { getPublicCatalogModels } from '@/lib/catalog/public';

export const metadata = {
  title: 'Methodology v2 | Forecaster Arena',
  description: 'Forecaster Arena methodology v2: LLM evaluation grounded in unsettled real-world events, paper portfolios, and deterministic portfolio-value scoring.',
};

export default function MethodologyPage() {
  return <MethodologyPageContent models={getPublicCatalogModels()} />;
}
