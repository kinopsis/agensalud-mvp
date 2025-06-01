# Role-Based Booking System (MVP SIMPLIFIED)

## 📋 **Overview**

The AgentSalud MVP implements a simplified role-based booking time management system that enforces different booking rules based on user roles:

- **Standard Users (Patients)**: Must book appointments at least 24 hours in advance
- **Privileged Users (Admin/Staff/Doctor/SuperAdmin)**: Can book appointments in real-time based on current time and availability

## 🎯 **Key Features**

### **Standard User Rules (Patient Role)**
- ✅ **24-Hour Advance Booking**: Patients cannot book appointments for the same day
- ✅ **Next Business Day**: Earliest booking is tomorrow with available slots
- ✅ **Consistent Enforcement**: Applied across all booking flows (manual, AI chatbot, rescheduling)
- ✅ **Clear Messaging**: User-friendly error messages explaining the restriction

### **Privileged User Rules (Admin/Staff Roles)**
- ✅ **Real-Time Booking**: Can book same-day appointments when slots are available
- ✅ **Current Time Validation**: Only future time slots are available for same-day booking
- ✅ **Emergency Scheduling**: Supports walk-in appointments and urgent cases
- ✅ **Flexible Override**: Can force standard rules when needed

## 🔧 **Technical Implementation**

### **Core Components**

#### **1. BookingConfigService (Enhanced)**
```typescript
// Role-based validation
const result = await service.validateDateAvailabilityWithRole(
  organizationId,
  date,
  availableSlots,
  {
    userRole: 'patient', // or 'admin', 'staff', 'doctor', 'superadmin'
    useStandardRules: false // Force standard rules for privileged users
  }
);
```

#### **2. Date Validation Utilities**
```typescript
// Simplified role-based validation
const result = await validateDateAvailabilityWithRole(
  date,
  availableSlots,
  userRole,
  organizationId
);
```

#### **3. Availability Engine**
```typescript
// Calculate availability with role-based filtering
const slots = await engine.calculateAvailability({
  organizationId,
  date,
  doctorId,
  userRole: 'patient',
  useStandardRules: false
});
```

#### **4. WeeklyAvailabilitySelector Component**
```tsx
<WeeklyAvailabilitySelector
  organizationId={organizationId}
  selectedDate={selectedDate}
  onDateSelect={handleDateSelect}
  userRole="patient" // Role-based validation
  useStandardRules={false} // Force standard rules
  title="Seleccionar Fecha"
  subtitle="Elige una fecha disponible"
/>
```

### **API Endpoints**

#### **Appointments API**
```typescript
// POST /api/appointments
// Automatically validates based on user role from authentication
{
  "organizationId": "org-123",
  "appointmentDate": "2025-05-31",
  "startTime": "15:00",
  "endTime": "15:30"
  // Role validation applied automatically
}
```

#### **Availability API**
```typescript
// GET /api/appointments/availability
// ?organizationId=org-123&startDate=2025-05-30&endDate=2025-05-30
// &userRole=patient&useStandardRules=false
```

## 📊 **Validation Rules Matrix**

| User Role | Same-Day Booking | Future Booking | Past Dates | Override Available |
|-----------|------------------|----------------|------------|-------------------|
| Patient | ❌ Blocked (24h rule) | ✅ Allowed | ❌ Blocked | ❌ No |
| Admin | ✅ Future slots only | ✅ Allowed | ❌ Blocked | ✅ Yes |
| Staff | ✅ Future slots only | ✅ Allowed | ❌ Blocked | ✅ Yes |
| Doctor | ✅ Future slots only | ✅ Allowed | ❌ Blocked | ✅ Yes |
| SuperAdmin | ✅ Future slots only | ✅ Allowed | ❌ Blocked | ✅ Yes |

## 🚀 **Usage Examples**

### **Patient Booking Flow**
```typescript
// Patient tries to book same-day appointment
const result = await validateDateAvailabilityWithRole(
  '2025-05-30', // Today
  availableSlots,
  'patient'
);

// Result:
{
  isValid: false,
  reason: 'Los pacientes deben reservar citas con al menos 24 horas de anticipación',
  hoursUntilValid: 24,
  nextValidTime: '08:00',
  userRole: 'patient',
  appliedRule: 'standard'
}
```

### **Admin Emergency Booking**
```typescript
// Admin books same-day appointment
const result = await validateDateAvailabilityWithRole(
  '2025-05-30', // Today
  ['11:00', '12:00', '15:00'], // Future slots
  'admin'
);

// Result:
{
  isValid: true,
  validTimeSlots: ['11:00', '12:00', '15:00'],
  userRole: 'admin',
  appliedRule: 'privileged'
}
```

### **Force Standard Rules**
```typescript
// Force admin to follow patient rules
const result = await validateDateAvailabilityWithRole(
  '2025-05-30', // Today
  availableSlots,
  'admin',
  organizationId,
  { useStandardRules: true }
);

// Result: Same as patient (24-hour rule applied)
```

## 🧪 **Testing Strategy**

### **Unit Tests**
- ✅ Role-based validation logic
- ✅ Date/time calculations
- ✅ Edge cases (midnight, timezone)
- ✅ Error handling

### **Integration Tests**
- ✅ API endpoint validation
- ✅ Authentication integration
- ✅ Database interactions
- ✅ End-to-end booking flows

### **Test Coverage**
- 🎯 **Target**: 95%+ for critical booking logic
- 📊 **Current**: Comprehensive test suite implemented
- 🔍 **Focus Areas**: Role validation, time calculations, error scenarios

## 🔒 **Security Considerations**

### **Role Validation**
- ✅ Server-side role verification from authenticated user profile
- ✅ No client-side role manipulation possible
- ✅ Consistent enforcement across all endpoints

### **Data Protection**
- ✅ Multi-tenant data isolation maintained
- ✅ RLS policies respect role-based access
- ✅ Audit trail for privileged bookings

## 📈 **Performance Optimizations**

### **Caching Strategy**
- ✅ Role-based validation results cached
- ✅ Availability calculations optimized
- ✅ Minimal database queries

### **Response Times**
- 🎯 **Target**: <200ms for availability calculation
- 🎯 **Target**: <100ms for date validation
- ✅ **Achieved**: Optimized algorithms implemented

## 🔄 **Migration and Backward Compatibility**

### **Legacy Support**
- ✅ Existing booking flows continue to work
- ✅ Gradual migration to role-based system
- ✅ Fallback to default rules when role not specified

### **Configuration Override**
- ✅ Organizations can disable role-based rules
- ✅ Temporary override for system maintenance
- ✅ Granular control per user type

## 📋 **Validation Checklist**

### **Standard Users (Patients)**
- [ ] Cannot see or select same-day dates
- [ ] Can book appointments starting tomorrow
- [ ] Receive clear 24-hour rule messaging
- [ ] Consistent behavior across all booking channels

### **Privileged Users (Admin/Staff)**
- [ ] Can book same-day appointments with future times
- [ ] Past time slots are filtered out automatically
- [ ] Can override rules when necessary
- [ ] Emergency booking capabilities work

### **System Integration**
- [ ] AI chatbot respects role-based rules
- [ ] Rescheduling follows same validation logic
- [ ] Calendar integration shows correct availability
- [ ] All API endpoints enforce role validation

## 🚀 **Future Enhancements**

### **Phase 2 Considerations**
- 🔮 **Configurable Advance Hours**: Per-organization customization
- 🔮 **Role-Specific Rules**: Different rules per role type
- 🔮 **Time-Based Overrides**: Temporary rule modifications
- 🔮 **Advanced Scheduling**: Complex booking scenarios

### **Monitoring and Analytics**
- 📊 Track booking patterns by role
- 📈 Monitor rule effectiveness
- 🔍 Identify optimization opportunities
- 📋 Generate compliance reports

---

## 📞 **Support and Troubleshooting**

For implementation questions or issues, refer to:
- 📚 **API Documentation**: `/api-docs`
- 🧪 **Test Suite**: `/tests/role-based-booking/`
- 🔧 **Configuration**: `BookingConfigService`
- 📝 **Logs**: Role-based validation events logged with `🔐` prefix
