import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { 
  Car, 
  Gauge, 
  Fuel, 
  Calendar, 
  AlertTriangle, 
  Wrench, 
  Clock, 
  Activity, 
  DollarSign,
  TrendingUp,
  Users as _Users,
  Settings as _Settings,
  FileText
} from "lucide-preact";

// Mock data - replace with actual API calls
const vehicles = [
  {
    id: "1",
    name: "Ford F-150",
    model: "2023 XLT",
    status: "Active",
    healthScore: 92,
    mileage: 15420,
    fuelLevel: 75,
    nextService: "Jan 15, 2026",
    nextServiceDays: 9,
    image: "/api/placeholder/400/300"
  },
  {
    id: "2", 
    name: "RV Adventure",
    model: "2022 Class A",
    status: "Maintenance",
    healthScore: 78,
    mileage: 32500,
    fuelLevel: 60,
    nextService: "Feb 1, 2026",
    nextServiceDays: 26,
    image: "/api/placeholder/400/300"
  },
  {
    id: "3",
    name: "Harley Davidson",
    model: "2021 Street Glide",
    status: "Active",
    healthScore: 88,
    mileage: 8900,
    fuelLevel: 90,
    nextService: "Mar 10, 2026",
    nextServiceDays: 63,
    image: "/api/placeholder/400/300"
  }
];

const maintenanceAlerts = [
  {
    id: "1",
    type: "Oil Change",
    vehicle: "Ford F-150",
    priority: "High",
    description: "Regular oil change required",
    dueDate: "Jan 15, 2026"
  },
  {
    id: "2",
    type: "Tire Rotation",
    vehicle: "RV Adventure",
    priority: "Medium",
    description: "Rotate and inspect tires",
    dueDate: "Jan 30, 2026"
  },
  {
    id: "3",
    type: "Brake Inspection",
    vehicle: "Harley Davidson",
    priority: "Low",
    description: "Annual brake system check",
    dueDate: "Feb 15, 2026"
  }
];

const recentActivities = [
  {
    id: "1",
    description: "Completed oil change",
    vehicle: "Ford F-150",
    cost: "$89.99",
    date: "2 days ago",
    icon: <Wrench className="h-5 w-5 text-blue-500" />
  },
  {
    id: "2",
    description: "Fuel tank refill",
    vehicle: "RV Adventure",
    cost: "$245.00",
    date: "5 days ago",
    icon: <Fuel className="h-5 w-5 text-green-500" />
  },
  {
    id: "3",
    description: "Insurance renewal",
    vehicle: "All Vehicles",
    cost: "$1,250.00",
    date: "1 week ago",
    icon: <FileText className="h-5 w-5 text-purple-500" />
  }
];

const quickActions = [
  { id: "1", label: "Add Vehicle", icon: <Car className="h-5 w-5" />, color: "bg-blue-500" },
  { id: "2", label: "Schedule Service", icon: <Calendar className="h-5 w-5" />, color: "bg-green-500" },
  { id: "3", label: "Log Maintenance", icon: <Wrench className="h-5 w-5" />, color: "bg-orange-500" },
  { id: "4", label: "View Reports", icon: <TrendingUp className="h-5 w-5" />, color: "bg-purple-500" }
];

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500";
    case "maintenance":
      return "bg-yellow-500";
    case "inactive":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
    default:
      return "outline";
  }
}

export default function GarageDashboard() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Garage Dashboard</h1>
              <p className="text-blue-100 text-lg">Manage your fleet and keep everything running smoothly</p>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold">{vehicles.length}</div>
                <div className="text-blue-100 text-sm">Total Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{maintenanceAlerts.length}</div>
                <div className="text-blue-100 text-sm">Pending Services</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">87%</div>
                <div className="text-blue-100 text-sm">Avg Health</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Vehicle Overview */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Your Vehicles</h2>
            <Button className="gap-2">
              <Car className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <Car className="h-16 w-16 text-gray-400" />
                  <div className="absolute top-3 right-3">
                    <Badge className={`${getStatusColor(vehicle.status)} text-white border-0`}>
                      {vehicle.status}
                    </Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{vehicle.name}</CardTitle>
                      <CardDescription>{vehicle.model}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{vehicle.healthScore}%</p>
                      <p className="text-xs text-muted-foreground">Health</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Mileage</span>
                    </div>
                    <span className="font-semibold">{vehicle.mileage.toLocaleString()} mi</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fuel Level</span>
                      </div>
                      <span className="font-semibold">{vehicle.fuelLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${vehicle.fuelLevel}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Next Service</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{vehicle.nextService}</span>
                      <Badge variant="outline" className="text-xs">
                        {vehicle.nextServiceDays} days
                      </Badge>
                    </div>
                  </div>

                  <Button className="w-full" variant="outline">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Maintenance Alerts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Maintenance Alerts
                  </CardTitle>
                  <CardDescription>Upcoming services and inspections</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {maintenanceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm">{alert.type}</h4>
                      <Badge variant={getPriorityColor(alert.priority)} className="text-xs">
                        {alert.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.vehicle}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3" />
                      Due: {alert.dueDate}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Recent Activities
                  </CardTitle>
                  <CardDescription>Latest updates and actions</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    {activity.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">{activity.description}</h4>
                        <p className="text-sm text-muted-foreground">{activity.vehicle}</p>
                      </div>
                      {activity.cost && (
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="h-3 w-3" />
                          {activity.cost}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activity.date}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-24 flex-col gap-2 hover:bg-accent"
                >
                  <div className={`h-10 w-10 rounded-full ${action.color} flex items-center justify-center text-white`}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
