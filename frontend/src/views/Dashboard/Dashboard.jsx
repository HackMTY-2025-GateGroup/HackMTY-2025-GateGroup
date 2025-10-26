import { Package, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import DataCard from '@/components/DataCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { fetchKPIs, fetchAnalytics } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { signOut } = useAuth();

  // KPI summary
  const { data: kpisResp, error: kpisError, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: fetchKPIs,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      if (err?.status === 401) signOut();
      else console.error('Error fetching KPIs', err);
    },
  });

  // Analytics time series for charts (fetch last 30 days by default)
  const { data: analyticsResp, error: analyticsError } = useQuery({
    queryKey: ['analytics', { range: '30d' }],
    queryFn: () => fetchAnalytics({ range: '30d' }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      if (err?.status === 401) signOut();
      else console.error('Error fetching analytics', err);
    },
  });

  // Normalize KPI values (backend may return different shapes)
  const kpis = kpisResp?.data?.kpis || kpisResp?.kpis || {};

  const kpiData = [
    {
      title: 'Total Waste Reduced',
      value: kpis.totalWaste ?? '2,847 kg',
      icon: TrendingDown,
      description: 'This month',
      trend: { type: 'positive', value: kpis.wasteTrend ?? '+12% from last month' },
    },
    {
      title: 'Cart Loading Efficiency',
      value: kpis.efficiency ? `${kpis.efficiency}%` : '94.2%',
      icon: CheckCircle,
      description: 'Average efficiency',
      trend: { type: 'positive', value: kpis.efficiencyTrend ?? '+5.3% improvement' },
    },
    {
      title: 'Active Alerts',
      value: kpis.activeAlerts ?? kpis.alerts ?? '7',
      icon: AlertTriangle,
      description: 'Requiring attention',
      trend: { type: 'negative', value: kpis.alertsTrend ?? '+2 from yesterday' },
    },
    {
      title: 'Items Analyzed',
      value: kpis.itemsAnalyzed ?? '12,458',
      icon: Package,
      description: 'Via computer vision',
      trend: { type: 'positive', value: kpis.itemsTrend ?? '+1,234 this week' },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of waste management and operational efficiency</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <DataCard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts Placeholder - data available at analyticsResp */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waste Reduction Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
              {!analyticsResp ? (
                <p className="text-muted-foreground">Loading timeseries...</p>
              ) : (
                <p className="text-muted-foreground">Chart rendering component should consume analytics data here.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loading Efficiency by Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg">
              <p className="text-muted-foreground">
                Chart placeholder — use analytics data ({JSON.stringify(analyticsResp?.data || analyticsResp || {})})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Photo analysis completed for Flight AA{100 + item}</p>
                  <p className="text-xs text-muted-foreground">{item} hour{item > 1 ? 's' : ''} ago</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
