import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiClient } from '../lib/apiClient';
import { LoadingState, ErrorState } from '../components/StatusStates';

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => apiClient.get('/analytics/summary').then((r) => r.data),
  });

  if (isLoading) return <LoadingState label="Loading analytics…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>
      <ChartCard title="Leads by industry" data={data.industryDistribution} />
      <ChartCard title="Leads by country" data={data.countryDistribution} />
    </div>
  );
}

function ChartCard({ title, data }) {
  const chartData = data.map((d) => ({ name: d._id || 'Unknown', count: d.count }));
  return (
    <div className="rounded-2xl glass-panel p-6">
      <h2 className="text-sm font-medium text-gray-400 mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <Tooltip contentStyle={{ background: '#12121c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
          <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
