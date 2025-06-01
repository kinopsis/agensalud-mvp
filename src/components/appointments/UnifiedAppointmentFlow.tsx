'use client';

/**
 * UnifiedAppointmentFlow Component
 * Harmonized appointment booking flow that works for both manual and AI modes
 * Follows PRD2.md specification: Service → Doctor (optional) → Location (optional) → Date → Time → Confirm
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  ProgressIndicator,
  SelectionCard,
  AlertMessage,
  DateSelector,
  TimeSlotSelector,
  AppointmentSummary,
  LoadingState,
  ConfirmationDialog,
  type FlowStep,
  type AppointmentFormData,
  type AppointmentBookingProps,
  type SelectionOption,
  type Service,
  type Doctor,
  type Location,
  type AvailabilitySlot
} from './shared';
import FlowSelector, { type BookingFlowType } from './FlowSelector';
import ExpressConfirmation from './ExpressConfirmation';
import ExpressSearchingState from './ExpressSearchingState';
import EnhancedTimeSlotSelector from './EnhancedTimeSlotSelector';
import EnhancedWeeklyAvailabilitySelector from './EnhancedWeeklyAvailabilitySelector';
import { ImmutableDateSystem } from '@/lib/core/ImmutableDateSystem';
import { DataIntegrityValidator } from '@/lib/core/DataIntegrityValidator';
import { OptimalAppointmentFinder, type OptimalAppointmentResult } from '@/lib/appointments/OptimalAppointmentFinder';
import { useWeeklyAvailability, type DayAvailabilityData } from '@/hooks/useAvailabilityData';
import { useAuth } from '@/contexts/auth-context';


export default function UnifiedAppointmentFlow({
  organizationId,
  userId,
  patientName,
  onAppointmentBooked,
  onCancel,
  initialData,
  mode = 'manual'
}: AppointmentBookingProps) {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // CRITICAL FIX: Get user role for role-based availability validation
  const userRole = (profile?.role as 'patient' | 'admin' | 'staff' | 'doctor' | 'superadmin') || 'patient';
  const useStandardRules = false; // Allow privileged users to use their privileges

  // Hybrid flow states
  const [bookingFlow, setBookingFlow] = useState<BookingFlowType | null>(null);
  const [optimalAppointment, setOptimalAppointment] = useState<OptimalAppointmentResult | null>(null);
  const [isSearchingOptimal, setIsSearchingOptimal] = useState(false);

  // AI Context for enhanced UX
  const [aiContext, setAiContext] = useState<{
    suggestedDates?: string[];
    preferredTimeRange?: 'morning' | 'afternoon' | 'evening';
    urgencyLevel?: 'low' | 'medium' | 'high';
    extractedPreferences?: any;
  } | null>(initialData?.aiContext || null);

  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  // Form data
  const [formData, setFormData] = useState<AppointmentFormData>({
    service_id: initialData?.service_id || '',
    doctor_id: initialData?.doctor_id || '',
    location_id: initialData?.location_id || '',
    appointment_date: initialData?.appointment_date || '',
    appointment_time: initialData?.appointment_time || '',
    reason: initialData?.reason || '',
    notes: initialData?.notes || ''
  });

  // CRITICAL FIX: Add optimistic date state for immediate header updates
  const [optimisticDate, setOptimisticDate] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

  // Define steps - hybrid flow includes flow selection
  const getSteps = (): FlowStep[] => {
    if (bookingFlow === 'express') {
      return [
        { id: 'service', title: 'Seleccionar Servicio', completed: false, current: true },
        { id: 'flow', title: 'Tipo de Reserva', completed: false, current: false },
        { id: 'confirm', title: 'Confirmar Cita', completed: false, current: false }
      ];
    } else if (bookingFlow === 'personalized') {
      return [
        { id: 'service', title: 'Seleccionar Servicio', completed: false, current: true },
        { id: 'flow', title: 'Tipo de Reserva', completed: false, current: false },
        { id: 'doctor', title: 'Elegir Doctor', completed: false, current: false },
        { id: 'location', title: 'Seleccionar Sede', completed: false, current: false },
        { id: 'date', title: 'Elegir Fecha', completed: false, current: false },
        { id: 'time', title: 'Seleccionar Horario', completed: false, current: false },
        { id: 'confirm', title: 'Confirmar Cita', completed: false, current: false }
      ];
    } else {
      // Default flow before selection
      return [
        { id: 'service', title: 'Seleccionar Servicio', completed: false, current: true },
        { id: 'flow', title: 'Tipo de Reserva', completed: false, current: false },
        { id: 'doctor', title: 'Elegir Doctor', completed: false, current: false },
        { id: 'location', title: 'Seleccionar Sede', completed: false, current: false },
        { id: 'date', title: 'Elegir Fecha', completed: false, current: false },
        { id: 'time', title: 'Seleccionar Horario', completed: false, current: false },
        { id: 'confirm', title: 'Confirmar Cita', completed: false, current: false }
      ];
    }
  };

  // Update step completion status
  const updateSteps = (): FlowStep[] => {
    const steps = getSteps();
    return steps.map((step, index) => ({
      ...step,
      completed: index < currentStep,
      current: index === currentStep
    }));
  };

  // Load initial data
  useEffect(() => {
    loadServices();
    loadLocations();
  }, [organizationId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/services?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch(`/api/locations?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const loadDoctors = async (serviceId?: string) => {
    try {
      setLoading(true);
      let url = `/api/doctors?organizationId=${organizationId}`;
      if (serviceId) {
        url += `&serviceId=${serviceId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // CRITICAL FIX: API returns data.data, not data.doctors
        setDoctors(data.data || []);
        console.log(`DEBUG: Loaded ${data.data?.length || 0} doctors for service ${serviceId || 'ALL'}`);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError('Error al cargar doctores');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!formData.appointment_date) return;

    try {
      setLoading(true);
      let url = `/api/doctors/availability?organizationId=${organizationId}&date=${formData.appointment_date}`;

      if (formData.doctor_id) {
        url += `&doctorId=${formData.doctor_id}`;
      }
      if (formData.service_id) {
        url += `&serviceId=${formData.service_id}`;
      }
      if (formData.location_id) {
        url += `&locationId=${formData.location_id}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.data || []);
      }
    } catch (err) {
      console.error('Error loading availability:', err);
      setError('Error al cargar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced availability loader for WeeklyAvailabilitySelector
  const loadWeeklyAvailability = async (params: {
    organizationId: string;
    serviceId?: string;
    doctorId?: string;
    locationId?: string;
    startDate: string;
    endDate: string;
  }): Promise<DayAvailabilityData[]> => {
    try {
      let url = `/api/appointments/availability?organizationId=${params.organizationId}&startDate=${params.startDate}&endDate=${params.endDate}`;

      if (params.serviceId) url += `&serviceId=${params.serviceId}`;
      if (params.doctorId) url += `&doctorId=${params.doctorId}`;
      if (params.locationId) url += `&locationId=${params.locationId}`;

      // CRITICAL FIX: Add user role and standard rules parameters for consistent availability
      url += `&userRole=${encodeURIComponent(userRole)}`;
      url += `&useStandardRules=${useStandardRules}`;

      console.log(`🔄 NEW APPOINTMENT FLOW: Loading availability with role=${userRole}, useStandardRules=${useStandardRules}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al cargar disponibilidad');
      }

      // Process API response into DayAvailabilityData format
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const processedData: DayAvailabilityData[] = [];
      const startDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const dayData = result.data[dateString];

        const availableSlots = dayData?.availableSlots || 0;
        const isToday = date.toDateString() === today.toDateString();
        const isTomorrow = date.toDateString() === tomorrow.toDateString();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        let availabilityLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
        if (availableSlots === 0) availabilityLevel = 'none';
        else if (availableSlots <= 2) availabilityLevel = 'low';
        else if (availableSlots <= 5) availabilityLevel = 'medium';
        else availabilityLevel = 'high';

        processedData.push({
          date: dateString,
          dayName: dayNames[date.getDay()],
          slotsCount: availableSlots,
          availabilityLevel,
          isToday,
          isTomorrow,
          isWeekend,
          slots: dayData?.slots || []
        });
      }

      // CRITICAL DEBUG: Log detailed comparison data
      console.log('✅ NEW APPOINTMENT FLOW: Weekly availability data loaded', {
        processedData,
        rawApiResponse: result.data,
        sampleDayComparison: Object.keys(result.data).slice(0, 3).map(dateString => ({
          date: dateString,
          apiAvailableSlots: result.data[dateString]?.availableSlots,
          apiTotalSlots: result.data[dateString]?.totalSlots,
          apiSlotsArray: result.data[dateString]?.slots?.length,
          processedSlotsCount: processedData.find(d => d.date === dateString)?.slotsCount
        }))
      });

      return processedData;
    } catch (error) {
      console.error('Error loading weekly availability:', error);
      throw error;
    }
  };

  // Navigation handlers
  const handleNext = () => {
    const steps = getSteps();
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      setError(null);

      // CRITICAL FIX: Reset bookingFlow when returning to flow selection step
      const steps = getSteps();
      const flowStepIndex = steps.findIndex(step => step.id === 'flow');
      if (newStep === flowStepIndex) {
        console.log('DEBUG: Resetting bookingFlow state for flow selection step');
        setBookingFlow(null);
        setOptimalAppointment(null);
        setIsSearchingOptimal(false);
        // Clear doctors to force reload when flow is selected again
        setDoctors([]);
      }
    }
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    onCancel?.();
  };

  const handleCancelDialog = () => {
    setShowCancelDialog(false);
  };

  // Selection handlers
  const handleServiceSelect = (option: SelectionOption) => {
    setFormData(prev => ({ ...prev, service_id: option.id }));
    // Don't load doctors yet - wait for flow selection
    handleNext();
  };

  const handleDoctorSelect = (option: SelectionOption) => {
    setFormData(prev => ({ ...prev, doctor_id: option.id }));
    handleNext();
  };

  const handleLocationSelect = (option: SelectionOption) => {
    setFormData(prev => ({ ...prev, location_id: option.id }));
    handleNext();
  };

  /**
   * DISRUPTIVE DATE SELECTION - Uses ImmutableDateSystem for comprehensive validation
   */
  const handleDateSelect = (date: string) => {
    console.log('🔍 UNIFIED FLOW: handleDateSelect called with:', date);
    console.log('🔧 UNIFIED FLOW: Using ImmutableDateSystem for validation');
    console.log('📊 UNIFIED FLOW: Current state before update:', {
      optimisticDate,
      formDataDate: formData.appointment_date,
      currentStep
    });

    // CRITICAL FIX: Set optimistic date immediately to prevent header displacement
    setOptimisticDate(date);
    console.log('✅ UNIFIED FLOW: Optimistic date set immediately:', date);

    // STEP 1: Comprehensive date validation using ImmutableDateSystem
    const validation = ImmutableDateSystem.validateAndNormalize(date, 'UnifiedAppointmentFlow');

    if (!validation.isValid) {
      console.error('❌ UNIFIED FLOW: Date validation failed:', validation.error);
      setError(`Fecha inválida: ${validation.error}`);

      // Log validation failure
      DataIntegrityValidator.logDataTransformation(
        'UnifiedAppointmentFlow',
        'DATE_VALIDATION_FAILED',
        { originalDate: date },
        { error: validation.error },
        ['ImmutableDateSystem.validateAndNormalize']
      );
      return;
    }

    // STEP 2: Check for date displacement
    if (validation.displacement?.detected) {
      console.error('🚨 UNIFIED FLOW: DATE DISPLACEMENT DETECTED!', {
        originalDate: date,
        normalizedDate: validation.normalizedDate,
        daysDifference: validation.displacement.daysDifference
      });

      // Track displacement event
      if (window.trackDateEvent) {
        window.trackDateEvent('DATE_DISPLACEMENT_DETECTED', {
          originalDate: date,
          normalizedDate: validation.normalizedDate,
          daysDifference: validation.displacement.daysDifference
        }, 'UnifiedAppointmentFlow');
      }

      setError(`Advertencia: Se detectó un desplazamiento de fecha. Usando fecha corregida: ${validation.normalizedDate}`);
    }

    const validatedDate = validation.normalizedDate || date;
    console.log('✅ UNIFIED FLOW: Using validated date:', validatedDate);

    // STEP 3: Business rule validation using ImmutableDateSystem
    const todayStr = ImmutableDateSystem.getTodayString();
    const isPastDate = ImmutableDateSystem.compareDates(validatedDate, todayStr) < 0;

    if (isPastDate) {
      console.log('🚫 UNIFIED FLOW: Past date blocked');
      setError('No se pueden agendar citas en fechas pasadas');
      return;
    }

    // STEP 4: Role-based validation (24-hour advance booking rule)
    const isToday = ImmutableDateSystem.compareDates(validatedDate, todayStr) === 0;
    const isPrivilegedUser = ['admin', 'staff', 'doctor', 'superadmin'].includes(userRole);
    const applyStandardRules = !isPrivilegedUser || useStandardRules;

    if (isToday && applyStandardRules) {
      console.log('🚫 UNIFIED FLOW: Same-day booking blocked for standard users');
      setError('Los pacientes deben reservar citas con al menos 24 horas de anticipación');
      return;
    }

    console.log('✅ UNIFIED FLOW: All validations passed, updating form data');

    // STEP 5: Track successful date selection
    if (window.trackDateEvent) {
      window.trackDateEvent('DATE_SELECTION_SUCCESS', {
        originalInput: date,
        validatedDate: validatedDate,
        displacement: validation.displacement?.detected || false,
        formDataUpdate: true
      }, 'UnifiedAppointmentFlow');
    }

    // STEP 6: Update form data with validated date
    setFormData(prev => {
      const newFormData = {
        ...prev,
        appointment_date: validatedDate,
        appointment_time: ''
      };

      console.log('📊 UNIFIED FLOW: Form data updated:', {
        previousDate: prev.appointment_date,
        newDate: validatedDate,
        displacement: prev.appointment_date !== validatedDate
      });

      return newFormData;
    });

    // CRITICAL FIX: Don't clear optimistic date immediately - let it persist until step change
    // This ensures the title shows the correct date while transitioning to the next step
    console.log('✅ UNIFIED FLOW: Keeping optimistic date for step transition');

    setSelectedSlot(null);
    setError(null); // Clear any previous errors
    handleNext();

    console.log('🎯 UNIFIED FLOW: Date selection completed successfully');
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setFormData(prev => ({
      ...prev,
      appointment_time: slot.start_time,
      doctor_id: slot.doctor_id // Auto-assign doctor if not selected
    }));
    handleNext();
  };

  // Hybrid flow handlers
  const handleFlowSelect = async (flowType: BookingFlowType) => {
    setBookingFlow(flowType);

    if (flowType === 'express') {
      // Show searching state and find optimal appointment
      setIsSearchingOptimal(true);
      handleNext(); // Move to searching step
      await findOptimalAppointment();
    } else {
      // Continue with personalized flow
      loadDoctors(formData.service_id);
      handleNext();
    }
  };

  const findOptimalAppointment = async () => {
    if (!formData.service_id) return;

    try {
      setLoading(true);
      setError(null);

      // Add minimum delay to show searching animation
      const searchPromise = new OptimalAppointmentFinder().findOptimalAppointment({
        serviceId: formData.service_id,
        organizationId,
        preferences: {
          maxDaysOut: 14,
          timePreference: 'any'
        }
      });

      // Ensure minimum 8 seconds for UX (matches ExpressSearchingState animation)
      const [result] = await Promise.all([
        searchPromise,
        new Promise(resolve => setTimeout(resolve, 8000))
      ]);

      if (result) {
        setOptimalAppointment(result);
        // Update form data with optimal appointment
        setFormData(prev => ({
          ...prev,
          doctor_id: result.appointment.doctorId,
          location_id: result.appointment.locationId,
          appointment_date: result.appointment.date,
          appointment_time: result.appointment.startTime
        }));
        setIsSearchingOptimal(false);
        // Skip to confirmation step (step 2 in express flow)
        setCurrentStep(2);
      } else {
        setIsSearchingOptimal(false);
        setError('No se encontraron citas disponibles. Intenta con la reserva personalizada.');
        setBookingFlow('personalized');
        loadDoctors(formData.service_id);
        setCurrentStep(2); // Go to doctor selection in personalized flow
      }
    } catch (err) {
      console.error('Error finding optimal appointment:', err);
      setIsSearchingOptimal(false);
      setError('Error al buscar citas disponibles. Intenta con la reserva personalizada.');
      setBookingFlow('personalized');
      loadDoctors(formData.service_id);
      setCurrentStep(2); // Go to doctor selection in personalized flow
    } finally {
      setLoading(false);
    }
  };

  const handleExpressConfirm = async () => {
    if (!optimalAppointment || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        organizationId,
        patientId: userId,
        doctorId: optimalAppointment.appointment.doctorId,
        serviceId: formData.service_id,
        locationId: optimalAppointment.appointment.locationId,
        appointmentDate: optimalAppointment.appointment.date,
        startTime: optimalAppointment.appointment.startTime,
        endTime: optimalAppointment.appointment.endTime,
        reason: formData.reason,
        notes: formData.notes || `Cita agendada via ${mode === 'ai' ? 'AI Assistant' : 'Reserva Express'}`
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        onAppointmentBooked?.(result.appointmentId || result.data?.id);
      } else {
        throw new Error(result.error || 'Failed to create appointment');
      }
    } catch (err) {
      console.error('Error booking express appointment:', err);
      setError(err instanceof Error ? err.message : 'Error al agendar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomizeFromExpress = () => {
    setBookingFlow('personalized');
    setOptimalAppointment(null);
    setIsSearchingOptimal(false);
    loadDoctors(formData.service_id);
    setCurrentStep(2); // Go directly to doctor selection in personalized flow
  };

  const handleBackToFlowSelection = () => {
    setBookingFlow(null);
    setOptimalAppointment(null);
    setIsSearchingOptimal(false);
    setCurrentStep(1); // Go back to flow selection
  };

  const handleCancelExpressSearch = () => {
    setIsSearchingOptimal(false);
    setBookingFlow('personalized');
    loadDoctors(formData.service_id);
    setCurrentStep(2); // Go to doctor selection in personalized flow
  };

  // Load availability when date changes
  useEffect(() => {
    const steps = getSteps();
    const timeStepIndex = steps.findIndex(step => step.id === 'time');
    if (formData.appointment_date && currentStep === timeStepIndex) {
      loadAvailability();
    }
  }, [formData.appointment_date, currentStep, bookingFlow]);

  // CRITICAL FIX: Validate state consistency to prevent navigation bugs
  useEffect(() => {
    const steps = getSteps();
    const flowStepIndex = steps.findIndex(step => step.id === 'flow');

    // If we're on flow selection step but bookingFlow is already set, reset it
    if (currentStep === flowStepIndex && bookingFlow) {
      console.warn('DEBUG: Inconsistent state detected - resetting bookingFlow on flow step');
      setBookingFlow(null);
      setOptimalAppointment(null);
      setIsSearchingOptimal(false);
    }
  }, [currentStep, bookingFlow]);

  // CRITICAL FIX: Clear optimistic date when step changes to prevent stale date display
  useEffect(() => {
    // Clear optimistic date when moving between steps to ensure fresh state
    if (optimisticDate) {
      console.log('🔄 UNIFIED FLOW: Clearing optimistic date on step change:', {
        currentStep,
        optimisticDate
      });
      setOptimisticDate(null);
    }
  }, [currentStep]);

  // Handle appointment booking
  const handleBookAppointment = async () => {
    if (!selectedSlot || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const bookingData = {
        organizationId,
        patientId: userId,
        doctorId: selectedSlot.doctor_id,
        serviceId: formData.service_id,
        locationId: formData.location_id,
        appointmentDate: formData.appointment_date,
        startTime: selectedSlot.start_time,
        endTime: selectedSlot.end_time,
        reason: formData.reason,
        notes: formData.notes || `Cita agendada via ${mode === 'ai' ? 'AI Assistant' : 'formulario manual'}`
      };

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (result.success || response.ok) {
        onAppointmentBooked?.(result.appointmentId || result.data?.id);
      } else {
        throw new Error(result.error || 'Failed to create appointment');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(err instanceof Error ? err.message : 'Error al agendar la cita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
        {/* Progress Indicator */}
        <ProgressIndicator
          steps={updateSteps()}
          currentStep={currentStep}
        />

      {/* Content */}
      <div className="p-6">
        {error && (
          <AlertMessage
            type="error"
            title="Error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* Step 0: Service Selection */}
        {currentStep === 0 && (
          <SelectionCard
            title="¿Qué tipo de consulta necesitas?"
            subtitle="Selecciona el servicio médico que requieres"
            options={services.map(service => ({
              id: service.id,
              title: service.name,
              description: service.description,
              price: service.price
            }))}
            selectedId={formData.service_id}
            onSelect={handleServiceSelect}
            loading={loading}
            emptyMessage="No hay servicios disponibles"
            gridCols={1}
          />
        )}

        {/* Step 1: Flow Selection */}
        {(() => {
          const steps = getSteps();
          const flowStepIndex = steps.findIndex(step => step.id === 'flow');
          return currentStep === flowStepIndex && !bookingFlow && (
            <FlowSelector
              onFlowSelect={handleFlowSelect}
              loading={loading}
            />
          );
        })()}

        {/* Express Searching State */}
        {(() => {
          const steps = getSteps();
          const flowStepIndex = steps.findIndex(step => step.id === 'flow');
          return currentStep === flowStepIndex + 1 && bookingFlow === 'express' && isSearchingOptimal && (
            <ExpressSearchingState
              onCancel={handleCancelExpressSearch}
            />
          );
        })()}

        {/* Doctor Selection (Personalized Flow) */}
        {(() => {
          const steps = getSteps();
          const doctorStepIndex = steps.findIndex(step => step.id === 'doctor');
          return currentStep === doctorStepIndex && bookingFlow === 'personalized' && (
            <SelectionCard
              title="¿Tienes preferencia por algún doctor?"
              subtitle="Puedes elegir un doctor específico o continuar para ver disponibilidad general"
              options={[
                {
                  id: '',
                  title: 'Cualquier doctor disponible',
                  description: `Ver disponibilidad de todos los doctores (${doctors.length} disponibles)`,
                  subtitle: 'Recomendado para mayor flexibilidad de horarios'
                },
                ...doctors.map(doctor => ({
                  id: doctor.id,
                  title: `Dr. ${doctor.profiles.first_name} ${doctor.profiles.last_name}`,
                  subtitle: doctor.specialization,
                  price: doctor.consultation_fee
                }))
              ]}
              selectedId={formData.doctor_id}
              onSelect={handleDoctorSelect}
              loading={loading}
              emptyMessage="No hay doctores disponibles"
              gridCols={1}
            />
          );
        })()}

        {/* Location Selection (Personalized Flow) */}
        {(() => {
          const steps = getSteps();
          const locationStepIndex = steps.findIndex(step => step.id === 'location');
          return currentStep === locationStepIndex && bookingFlow === 'personalized' && (
            <SelectionCard
              title="¿En qué sede prefieres la consulta?"
              subtitle="Selecciona la ubicación más conveniente para ti"
              options={[
                {
                  id: '',
                  title: 'Cualquier sede disponible',
                  description: `Ver disponibilidad en todas las sedes (${locations.length} disponibles)`,
                  subtitle: 'Recomendado para mayor flexibilidad de horarios'
                },
                ...locations.map(location => ({
                  id: location.id,
                  title: location.name,
                  description: location.address
                }))
              ]}
              selectedId={formData.location_id}
              onSelect={handleLocationSelect}
              loading={loading}
              emptyMessage="No hay sedes disponibles"
              gridCols={1}
            />
          );
        })()}

        {/* Date Selection (Personalized Flow) - Enhanced with Weekly View */}
        {(() => {
          const steps = getSteps();
          const dateStepIndex = steps.findIndex(step => step.id === 'date');
          return currentStep === dateStepIndex && bookingFlow === 'personalized' && (
            <EnhancedWeeklyAvailabilitySelector
              title="¿Cuándo te gustaría la cita?"
              subtitle="Selecciona la fecha que mejor te convenga"
              selectedDate={formData.appointment_date}
              onDateSelect={handleDateSelect}
              organizationId={organizationId}
              serviceId={formData.service_id}
              doctorId={formData.doctor_id}
              locationId={formData.location_id}
              minDate={ImmutableDateSystem.getTodayString()}
              showDensityIndicators={true}
              enableSmartSuggestions={mode === 'ai' && !!aiContext}
              aiContext={aiContext || undefined}
              entryMode={mode}

              loading={loading}
              userRole={userRole}
              useStandardRules={useStandardRules}
            />
          );
        })()}

        {/* Time Selection (Personalized Flow) */}
        {(() => {
          const steps = getSteps();
          const timeStepIndex = steps.findIndex(step => step.id === 'time');
          return currentStep === timeStepIndex && bookingFlow === 'personalized' && (
            <EnhancedTimeSlotSelector
              title={`Horarios disponibles para ${(() => {
                const displayDate = optimisticDate || formData.appointment_date;
                console.log('🔍 TITLE GENERATION:', { optimisticDate, formDataDate: formData.appointment_date, displayDate });
                return displayDate;
              })()}`}
              subtitle="Selecciona el horario que prefieras"
              slots={availability}
              selectedSlot={selectedSlot}
              onSlotSelect={handleSlotSelect}
              loading={loading}
              emptyMessage="No hay horarios disponibles para esta fecha. Intenta con otra fecha."
              showDoctorInfo={!formData.doctor_id}
              showPricing={true}
            />
          );
        })()}

        {/* Express Confirmation */}
        {(() => {
          const steps = getSteps();
          const confirmStepIndex = steps.findIndex(step => step.id === 'confirm');
          return currentStep === confirmStepIndex && bookingFlow === 'express' && optimalAppointment && (
            <ExpressConfirmation
              appointment={optimalAppointment}
              onConfirm={handleExpressConfirm}
              onCustomize={handleCustomizeFromExpress}
              onBack={handleBackToFlowSelection}
              loading={loading}
              reason={formData.reason}
              notes={formData.notes}
              patientName={patientName}
              onReasonChange={(reason) => setFormData(prev => ({ ...prev, reason }))}
              onNotesChange={(notes) => setFormData(prev => ({ ...prev, notes }))}
            />
          );
        })()}

        {/* Personalized Confirmation */}
        {(() => {
          const steps = getSteps();
          const confirmStepIndex = steps.findIndex(step => step.id === 'confirm');
          return currentStep === confirmStepIndex && bookingFlow === 'personalized' && selectedSlot && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Confirmar tu cita</h3>
                <p className="text-gray-600">Revisa los detalles y confirma tu cita médica</p>
              </div>

              <AppointmentSummary
                service={services.find(s => s.id === formData.service_id)?.name}
                doctor={selectedSlot.doctor_name}
                location={locations.find(l => l.id === formData.location_id)?.name}
                date={formData.appointment_date}
                time={formData.appointment_time}
                specialization={selectedSlot.specialization}
                price={selectedSlot.consultation_fee}
                reason={formData.reason}
                notes={formData.notes}
                patientName={patientName}
                className="mb-6"
              />

              {/* Reason and Notes */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de la consulta (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Consulta general, dolor de cabeza, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Información adicional que consideres importante..."
                  />
                </div>
              </div>

              {/* Confirm Button */}
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleBookAppointment}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-300 flex items-center justify-center text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Agendando tu cita...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmar Cita
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-3">
                  Al confirmar, recibirás un email con los detalles de tu cita
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer Navigation */}
      <div className="bg-gray-50 px-6 py-4 flex justify-between items-center rounded-b-lg">
        <div className="flex items-center space-x-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors px-3 py-2 rounded-lg hover:bg-gray-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Anterior
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center text-red-600 hover:text-red-700 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-300"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </button>
        </div>

        <div className="text-sm text-gray-500 font-medium">
          Paso {currentStep + 1} de {getSteps().length}
        </div>

        {currentStep < getSteps().length - 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50 border border-blue-200 hover:border-blue-300 font-medium"
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        )}
      </div>
    </div>

    {/* Confirmation Dialog */}
    <ConfirmationDialog
      isOpen={showCancelDialog}
      title="Cancelar reserva de cita"
      message="¿Estás seguro de que quieres cancelar? Se perderá toda la información ingresada y tendrás que empezar de nuevo."
      confirmText="Sí, cancelar"
      cancelText="Continuar reservando"
      confirmVariant="danger"
      onConfirm={handleConfirmCancel}
      onCancel={handleCancelDialog}
    />
    </>
  );
}
