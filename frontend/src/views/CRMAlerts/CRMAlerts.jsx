import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchAlerts, fetchInventoryMovements } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const CRMAlerts = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();

  // Expiry alerts (severity in `level`)
  const {
    data: alertsResp,
    error: alertsError,
    isLoading: alertsLoading,
    isFetching: alertsFetching,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      if (err?.status === 401) signOut();
      else console.error('Error fetching alerts', err);
    },
  });

  // Inventory movements (informational)
  const {
    data: movementsResp,
    error: movementsError,
    isLoading: movementsLoading,
    isFetching: movementsFetching,
    refetch: refetchMovements,
  } = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: () => fetchInventoryMovements(), // example param
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    onError: (err) => {
      if (err?.status === 401) signOut();
      else console.error('Error fetching movements', err);
    },
  });

  // Normalize backend shapes:
  // alertsResp may be { data: { alerts, count } } or { alerts }
  const expiryAlerts = Array.isArray(alertsResp?.data?.alerts)
    ? alertsResp.data.alerts
    : Array.isArray(alertsResp?.alerts)
    ? alertsResp.alerts
    : [];

  // movementsResp may be { data: { movements, count } } or { movements }
  const movements = Array.isArray(movementsResp?.data?.movements)
    ? movementsResp.data.movements
    : Array.isArray(movementsResp?.movements)
    ? movementsResp.movements
    : [];

  // Merge into a single list for the UI (expiry alerts first)
  const combined = [
    ...expiryAlerts.map(a => ({ ...a, source: 'expiry' })),
    ...movements.map(m => ({
      id: m.id || `mv-${m.item_id || Date.now()}`,
      type: 'info',
      title: `${m.movement_type?.toUpperCase() || 'Movement'} - ${m.item_name || m.product?.name || 'Item'}`,
      description: m.notes || `${m.qty_change || 0} units`,
      timestamp: m?.created_at || m?.createdAt || m?.created,
      status: 'active',
      source: 'movement',
      severity: 'info',
      raw: m,
    })),
  ];

  const totalCount = combined.length;
  const criticalCount = expiryAlerts.filter(a => (a.level || a.severity) === 'critical').length;
  const warningCount = expiryAlerts.filter(a => (a.level || a.severity) === 'warning').length;
  const infoCount = combined.filter(c => c.source === 'movement' || (c.level || c.severity) === 'info').length;

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertBadge = (type) => {
    switch (type) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 text-white">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-500 text-white">Info</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500 text-white">Resolved</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CRM Alerts</h2>
          <p className="text-muted-foreground mt-1">
            Real-time notifications and system alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { refetchAlerts(); refetchMovements(); }}>Refresh</Button>
          {/*<Button>Mark All as Read</Button>*/}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{infoCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {combined.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">{getAlertIcon(alert.level || alert.type || (alert.source === 'movement' ? 'info' : 'info'))}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{alert.title || alert.message || alert.raw?.message}</h3>
                    {getAlertBadge(alert.level || alert.severity || (alert.source === 'movement' ? 'info' : 'info'))}
                  </div>
                  {/*<p className="text-sm text-muted-foreground">
                    {alert.description || alert.message || (alert.raw && JSON.stringify(alert.raw))}
                  </p>*/}
                  <p className="text-sm text-muted-foreground">
                    {alert.timestamp}
                  </p>
                </div>
                {/*<Button variant="outline" size="sm">
                  View Details
                </Button>*/}
              </div>
            ))}
            {combined.length === 0 && <div className="text-muted-foreground p-4">No alerts found.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMAlerts;
