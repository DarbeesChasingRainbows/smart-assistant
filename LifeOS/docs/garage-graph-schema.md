# Garage Domain - Graph Schema Documentation

## 1. Executive Summary

The **Garage Domain** manages the lifecycle, maintenance, and operation of vehicles within the LifeOS ecosystem. It is built on a **CQRS architecture** using **F#** for domain logic and **ArangoDB** as a graph backing store.

### Deep System Integration

This domain is deeply integrated with:

- **Inventory**: For consuming parts (oil, filters) during maintenance
- **Identity**: For logging who performed the work
- **Finance**: For tracking the cost of ownership

---

## 2. Graph Schema Definition

**Color Code**: `#FF6B6B` (Red)

### 2.1 Node Definitions (Vertices)

These entities act as the anchors for the graph.

| Node Type | Description | Key Attributes | Context |
|-----------|-------------|----------------|---------|
| **Vehicle** | A physical vehicle (Truck, RV, Car) | VIN, Make, Model, Year, CurrentMileage | Garage |
| **Component** | An installed part (e.g., "Front Left Tire") | PartNumber, InstallDate, Status | Garage |
| **ServiceRecord** | A log of maintenance performed | Date, Type, Cost, Odometer | Garage |
| **TelemetryLog** | A snapshot of sensor data | Timestamp, OilTemp, TransTemp, Boost | Garage |
| **InventoryItem** | A physical item in stock | SKU, Name, Quantity | Inventory |
| **Person** | A user in the system | UserId, Name | Identity |

### 2.2 Edge Definitions (Relationships)

| From Node | Edge Name | To Node | Cardinality | Payload (Edge Props) | Logic |
|-----------|-----------|---------|-------------|---------------------|-------|
| Component | **INSTALLED_ON** | Vehicle | N:1 | { InstalledAt, Mileage } | Tracks active parts |
| ServiceRecord | **PERFORMED_ON** | Vehicle | N:1 | { MileageSnapshot } | Links work to vehicle |
| ServiceRecord | **CONSUMED** | InventoryItem | N:M | { Qty, UnitCost } | Cross-Domain: Parts used |
| Person | **PERFORMED** | ServiceRecord | 1:N | null | Who did the work |
| Vehicle | **GENERATED** | TelemetryLog | 1:N | null | Sensor stream |

---

## 3. Implementation Details

### 3.1 Technology Stack

- **Domain Logic**: F# (functional-first approach)
- **Database**: ArangoDB (graph database)
- **Architecture Pattern**: CQRS (Command Query Responsibility Segregation)

### 3.2 Cross-Domain Integration

#### Inventory Integration
- Service records create consumption events
- Parts automatically deducted from inventory
- Tracks part usage costs for financial reporting

#### Identity Integration
- All service work attributed to specific users
- Audit trail for maintenance accountability
- User permissions for vehicle access

#### Finance Integration
- Cost tracking per service
- Total cost of ownership calculations
- Budget vs actual maintenance spending

### 3.3 Key Features

- **Vehicle Lifecycle Management**: Track all vehicles from acquisition to disposal
- **Component Tracking**: Monitor installed parts and their condition
- **Service History**: Complete maintenance records with costs
- **Telemetry Monitoring**: Real-time sensor data collection
- **Cost Attribution**: Link maintenance costs to specific vehicles and services

---

## 4. Usage Examples

### Example 1: Oil Change Service

```
1. ServiceRecord created with type="Oil Change"
2. ServiceRecord → PERFORMED_ON → Vehicle (with MileageSnapshot)
3. Person → PERFORMED → ServiceRecord
4. ServiceRecord → CONSUMED → InventoryItem (Oil, 5 quarts)
5. ServiceRecord → CONSUMED → InventoryItem (Oil Filter, 1 unit)
```

### Example 2: Tire Installation

```
1. Component created (type="Tire", PartNumber="P225/65R17")
2. Component → INSTALLED_ON → Vehicle (with InstallDate, Mileage)
3. ServiceRecord created with type="Tire Installation"
4. Person → PERFORMED → ServiceRecord
5. ServiceRecord → CONSUMED → InventoryItem (Tire, 4 units)
```

### Example 3: Telemetry Monitoring

```
1. Vehicle → GENERATED → TelemetryLog (every 5 minutes)
2. TelemetryLog stores: OilTemp, TransTemp, BoostPressure, etc.
3. Analytics query telemetry patterns for predictive maintenance
```

---

## 5. Benefits

- **Complete Vehicle History**: Every service, part, and cost tracked
- **Predictive Maintenance**: Telemetry data enables proactive repairs
- **Cost Transparency**: Know exactly what each vehicle costs to maintain
- **Cross-Domain Intelligence**: Parts, people, and finances all connected
- **Audit Trail**: Who did what work, when, and at what cost

---

## 6. Future Enhancements

- Integration with external APIs (vehicle data, parts pricing)
- Mobile app for field technicians
- Predictive maintenance algorithms using ML
- Fleet management dashboard
- Warranty tracking and claims management