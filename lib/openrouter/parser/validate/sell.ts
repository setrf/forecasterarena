import type { SellInstruction } from '@/lib/openrouter/parser/types';

export function validateSell(sell: SellInstruction): string | null {
  if (!sell.position_id) {
    return 'Missing position_id';
  }

  if (!sell.position_id.trim()) {
    return 'Position ID cannot be empty';
  }

  if (typeof sell.percentage !== 'number' || Number.isNaN(sell.percentage)) {
    return 'Invalid percentage';
  }

  if (sell.percentage < 1 || sell.percentage > 100) {
    return `Percentage must be 1-100, got ${sell.percentage}`;
  }

  return null;
}
