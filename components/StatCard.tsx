export default function StatCard({
  title,
  value,
  change,
  positive
}: {
  title: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="text-2xl font-bold">
        {value}
      </div>
      {change && (
        <div className={`text-sm mt-1 ${positive ? 'positive' : 'negative'}`}>
          {change}
        </div>
      )}
    </div>
  );
}
