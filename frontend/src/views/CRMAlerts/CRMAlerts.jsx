import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CRMAlerts = () => {
  // TODO: Replace with actual Supabase data fetch
  // Example: const { data: alerts } = useQuery(['alerts'], fetchAlerts);

  const alerts = [
    {
      id: 1,
      type: 'critical',
      title: 'High Waste Detected - Flight UA205',
      description: 'Unusual waste levels detected on this route. Immediate review recommended.',
      timestamp: '10 minutes ago',
      status: 'active',
    },
    {
      id: 2,
      type: 'warning',
      title: 'Cart Loading Inefficiency',
      description: 'Loading efficiency below threshold for morning shift.',
      timestamp: '1 hour ago',
      status: 'active',
    },
    {
      id: 3,
      type: 'info',
      title: 'New Analysis Available',
      description: 'Computer vision analysis completed for 15 new photos.',
      timestamp: '2 hours ago',
      status: 'active',
    },
    {
      id: 4,
      type: 'critical',
      title: 'Inventory Shortage Alert',
      description: 'Low stock levels detected for beverage items.',
      timestamp: '3 hours ago',
      status: 'active',
    },
    {
      id: 5,
      type: 'resolved',
      title: 'Maintenance Completed',
      description: 'Cart #47 maintenance has been completed successfully.',
      timestamp: '5 hours ago',
      status: 'resolved',
    },
  ];

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
        <Button>Mark All as Read</Button>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">1</div>
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
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{alert.title}</h3>
                    {getAlertBadge(alert.type)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alert.timestamp}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMAlerts;
