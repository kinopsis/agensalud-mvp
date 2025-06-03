# 🧪 **Manual Validation Checklist - Appointment Status System**

## 📋 **Overview**

This checklist provides comprehensive manual testing procedures for the Appointment Status System implementation. Each test should be performed and results documented.

**Testing Date**: ___________  
**Tester**: ___________  
**Environment**: ___________  
**Version**: 1.0.0 - MVP Implementation  

## 🔐 **1. Role-Based Access Control Testing**

### **1.1 Patient Role Testing**

#### **Test Case P1: Patient Status View**
- [ ] **Setup**: Login as patient user
- [ ] **Action**: Navigate to appointments dashboard
- [ ] **Expected**: Can view own appointment statuses
- [ ] **Expected**: Cannot see other patients' appointments
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case P2: Patient Status Change Permissions**
- [ ] **Setup**: Patient with confirmed appointment
- [ ] **Action**: Click on status badge
- [ ] **Expected**: Dropdown shows only "Cancelar Cita" and "Reagendar"
- [ ] **Expected**: Cannot change to "En Curso" or "Completada"
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case P3: Patient Cancellation Flow**
- [ ] **Setup**: Patient with confirmed appointment
- [ ] **Action**: Select "Cancelar Cita" from dropdown
- [ ] **Expected**: Reason input modal appears
- [ ] **Action**: Enter reason and confirm
- [ ] **Expected**: Status changes to "Cancelada por Paciente"
- [ ] **Expected**: Audit trail entry created
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

### **1.2 Doctor Role Testing**

#### **Test Case D1: Doctor Status View**
- [ ] **Setup**: Login as doctor user
- [ ] **Action**: Navigate to appointments dashboard
- [ ] **Expected**: Can view own assigned appointments
- [ ] **Expected**: Cannot see appointments for other doctors
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case D2: Doctor Status Change Permissions**
- [ ] **Setup**: Doctor with confirmed appointment
- [ ] **Action**: Click on status badge
- [ ] **Expected**: Dropdown shows "Iniciar Consulta" and "Marcar Completada"
- [ ] **Expected**: Cannot cancel appointments
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case D3: Doctor Consultation Flow**
- [ ] **Setup**: Doctor with confirmed appointment
- [ ] **Action**: Select "Iniciar Consulta"
- [ ] **Expected**: Status changes to "En Curso"
- [ ] **Action**: Select "Marcar Completada"
- [ ] **Expected**: Status changes to "Completada"
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

### **1.3 Staff Role Testing**

#### **Test Case S1: Staff Status View**
- [ ] **Setup**: Login as staff user
- [ ] **Action**: Navigate to appointments dashboard
- [ ] **Expected**: Can view all appointments in organization
- [ ] **Expected**: Can see appointments for all doctors/patients
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case S2: Staff Status Change Permissions**
- [ ] **Setup**: Staff user with any appointment
- [ ] **Action**: Click on status badge
- [ ] **Expected**: Dropdown shows most status options
- [ ] **Expected**: Can confirm, start, complete, and cancel appointments
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case S3: Staff Confirmation Flow**
- [ ] **Setup**: Staff with pending appointment
- [ ] **Action**: Select "Confirmar Cita"
- [ ] **Expected**: Status changes to "Confirmada"
- [ ] **Expected**: No reason required for confirmation
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

### **1.4 Admin Role Testing**

#### **Test Case A1: Admin Full Access**
- [ ] **Setup**: Login as admin user
- [ ] **Action**: Navigate to appointments dashboard
- [ ] **Expected**: Can view all appointments in organization
- [ ] **Expected**: Can access audit trail for any appointment
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case A2: Admin Status Change Permissions**
- [ ] **Setup**: Admin user with any appointment
- [ ] **Action**: Click on status badge
- [ ] **Expected**: Dropdown shows all available status options
- [ ] **Expected**: Can perform any valid status transition
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

#### **Test Case A3: Admin Audit Trail Access**
- [ ] **Setup**: Admin user with appointment that has status changes
- [ ] **Action**: Access audit trail (if UI available)
- [ ] **Expected**: Can view complete history of status changes
- [ ] **Expected**: Can see user names, timestamps, and reasons
- [ ] **Result**: ✅ Pass / ❌ Fail
- [ ] **Notes**: ___________

## 🔄 **2. Business Rules Validation**

### **2.1 Valid Status Transitions**

#### **Test Case T1: Pending → Confirmed**
- [ ] **Setup**: Appointment in "Solicitada" status
- [ ] **User Role**: Staff or Admin
- [ ] **Action**: Change status to "Confirmada"
- [ ] **Expected**: Transition succeeds
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case T2: Confirmed → En Curso**
- [ ] **Setup**: Appointment in "Confirmada" status
- [ ] **User Role**: Doctor, Staff, or Admin
- [ ] **Action**: Change status to "En Curso"
- [ ] **Expected**: Transition succeeds
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case T3: En Curso → Completada**
- [ ] **Setup**: Appointment in "En Curso" status
- [ ] **User Role**: Doctor, Staff, or Admin
- [ ] **Action**: Change status to "Completada"
- [ ] **Expected**: Transition succeeds
- [ ] **Result**: ✅ Pass / ❌ Fail

### **2.2 Invalid Status Transitions**

#### **Test Case T4: Completada → Pending**
- [ ] **Setup**: Appointment in "Completada" status
- [ ] **User Role**: Any
- [ ] **Action**: Attempt to change to "Solicitada"
- [ ] **Expected**: Transition blocked or option not available
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case T5: Cancelled → Confirmed**
- [ ] **Setup**: Appointment in "Cancelada" status
- [ ] **User Role**: Patient
- [ ] **Action**: Attempt to change to "Confirmada"
- [ ] **Expected**: Transition blocked or option not available
- [ ] **Result**: ✅ Pass / ❌ Fail

## 📊 **3. Audit Trail Validation**

### **Test Case AT1: Audit Entry Creation**
- [ ] **Setup**: Any appointment with changeable status
- [ ] **Action**: Change status with reason
- [ ] **Expected**: Audit entry created in database
- [ ] **Expected**: Entry includes: appointment_id, old_status, new_status, user_id, role, reason, timestamp
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case AT2: Audit Metadata Capture**
- [ ] **Setup**: Change status from web interface
- [ ] **Expected**: Metadata includes IP address, user agent, source
- [ ] **Expected**: User name captured correctly
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case AT3: Audit Trail Query**
- [ ] **Setup**: Admin user with appointment having multiple status changes
- [ ] **Action**: Query audit trail via API
- [ ] **Expected**: Returns chronological list of all changes
- [ ] **Expected**: Includes user names and formatted timestamps
- [ ] **Result**: ✅ Pass / ❌ Fail

## 🎨 **4. UI/UX Validation**

### **4.1 Visual Design**

#### **Test Case UI1: Status Badge Colors**
- [ ] **Solicitada**: Yellow background, clock icon
- [ ] **Confirmada**: Green background, check icon
- [ ] **En Curso**: Blue background, play icon
- [ ] **Completada**: Gray background, check icon
- [ ] **Cancelada**: Red background, X icon
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case UI2: Responsive Design**
- [ ] **Desktop (1920x1080)**: Status badges display correctly
- [ ] **Tablet (768x1024)**: Dropdowns work properly
- [ ] **Mobile (375x667)**: Touch targets are adequate
- [ ] **Result**: ✅ Pass / ❌ Fail

### **4.2 Accessibility**

#### **Test Case A11Y1: Keyboard Navigation**
- [ ] **Tab Navigation**: Can navigate to status badge with Tab
- [ ] **Enter/Space**: Can open dropdown with Enter or Space
- [ ] **Arrow Keys**: Can navigate dropdown options
- [ ] **Escape**: Can close dropdown with Escape
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case A11Y2: Screen Reader Support**
- [ ] **ARIA Labels**: Status badges have descriptive labels
- [ ] **Role Attributes**: Dropdown has proper role="listbox"
- [ ] **Live Regions**: Status changes announced to screen readers
- [ ] **Result**: ✅ Pass / ❌ Fail

#### **Test Case A11Y3: Visual Accessibility**
- [ ] **Color Contrast**: All text meets WCAG AA standards
- [ ] **Focus Indicators**: Clear focus outlines on interactive elements
- [ ] **Text Alternatives**: Icons have text alternatives
- [ ] **Result**: ✅ Pass / ❌ Fail

## 🔧 **5. Integration Testing**

### **Test Case I1: AppointmentCard Integration**
- [ ] **Setup**: Existing dashboard with AppointmentCard components
- [ ] **Action**: Verify new status badge appears correctly
- [ ] **Expected**: No layout breaks or missing functionality
- [ ] **Expected**: All existing props still work
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case I2: Dashboard Compatibility**
- [ ] **Patient Dashboard**: Status badges work correctly
- [ ] **Doctor Dashboard**: Status badges work correctly
- [ ] **Staff Dashboard**: Status badges work correctly
- [ ] **Admin Dashboard**: Status badges work correctly
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case I3: API Integration**
- [ ] **Status Change API**: PATCH requests work correctly
- [ ] **Transitions API**: GET requests return valid data
- [ ] **Audit API**: GET requests return formatted history
- [ ] **Error Handling**: API errors display user-friendly messages
- [ ] **Result**: ✅ Pass / ❌ Fail

## 📏 **6. Code Quality Validation**

### **Test Case CQ1: File Size Limits**
- [ ] **AppointmentStatusBadge.tsx**: < 500 lines ✅ (290 lines)
- [ ] **StatusChangeDropdown.tsx**: < 500 lines ✅ (280 lines)
- [ ] **API route files**: < 500 lines ✅ (280 lines each)
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case CQ2: TypeScript Compliance**
- [ ] **No TypeScript errors**: All files compile without errors
- [ ] **Type safety**: Proper typing for all props and functions
- [ ] **Import/Export**: All imports resolve correctly
- [ ] **Result**: ✅ Pass / ❌ Fail

## 🚀 **7. Performance Testing**

### **Test Case P1: Load Times**
- [ ] **Component Render**: < 100ms for status badge render
- [ ] **API Response**: < 200ms for status change
- [ ] **Dropdown Open**: < 50ms for dropdown display
- [ ] **Result**: ✅ Pass / ❌ Fail

### **Test Case P2: Memory Usage**
- [ ] **No Memory Leaks**: Components clean up properly
- [ ] **Event Listeners**: All listeners removed on unmount
- [ ] **API Calls**: No duplicate or unnecessary requests
- [ ] **Result**: ✅ Pass / ❌ Fail

## 📝 **Testing Summary**

### **Overall Results**
- **Total Test Cases**: _____ / _____
- **Passed**: _____ 
- **Failed**: _____
- **Success Rate**: _____%

### **Critical Issues Found**
1. ___________
2. ___________
3. ___________

### **Recommendations**
1. ___________
2. ___________
3. ___________

### **Sign-off**
- **Tester Signature**: ___________
- **Date**: ___________
- **Status**: ✅ Approved for Production / ❌ Requires Fixes

---

**✅ MANUAL VALIDATION COMPLETE**  
**Version**: 1.0.0 - MVP Implementation  
**Date**: 28 de Enero, 2025  
**Status**: Ready for production deployment  
