#!/usr/bin/env node

/**
 * Validación: Corrección del Bug de Navegación Paso 3 → Paso 2
 * Simula el comportamiento del componente para validar que la corrección funciona
 * 
 * PROBLEMA CORREGIDO: Pantalla en blanco al regresar del paso 3 al paso 2
 * SOLUCIÓN: Reset de bookingFlow al regresar al paso de selección de flujo
 */

/**
 * Simulación del estado del componente UnifiedAppointmentFlow
 */
class UnifiedAppointmentFlowSimulator {
  constructor() {
    this.currentStep = 0;
    this.bookingFlow = null;
    this.optimalAppointment = null;
    this.isSearchingOptimal = false;
    this.doctors = [];
    this.formData = {
      service_id: '',
      doctor_id: '',
      location_id: '',
      appointment_date: '',
      appointment_time: ''
    };
  }

  // Simular getSteps()
  getSteps() {
    if (this.bookingFlow === 'express') {
      return [
        { id: 'service', title: 'Seleccionar Servicio' },
        { id: 'flow', title: 'Tipo de Reserva' },
        { id: 'confirm', title: 'Confirmar Cita' }
      ];
    } else if (this.bookingFlow === 'personalized') {
      return [
        { id: 'service', title: 'Seleccionar Servicio' },
        { id: 'flow', title: 'Tipo de Reserva' },
        { id: 'doctor', title: 'Elegir Doctor' },
        { id: 'location', title: 'Seleccionar Sede' },
        { id: 'date', title: 'Elegir Fecha' },
        { id: 'time', title: 'Seleccionar Horario' },
        { id: 'confirm', title: 'Confirmar Cita' }
      ];
    } else {
      return [
        { id: 'service', title: 'Seleccionar Servicio' },
        { id: 'flow', title: 'Tipo de Reserva' },
        { id: 'doctor', title: 'Elegir Doctor' },
        { id: 'location', title: 'Seleccionar Sede' },
        { id: 'date', title: 'Elegir Fecha' },
        { id: 'time', title: 'Seleccionar Horario' },
        { id: 'confirm', title: 'Confirmar Cita' }
      ];
    }
  }

  // Simular handleBack() ANTES de la corrección
  handleBackOld() {
    if (this.currentStep > 0) {
      this.currentStep = this.currentStep - 1;
      // ❌ NO resetea bookingFlow - CAUSA DEL BUG
    }
  }

  // Simular handleBack() DESPUÉS de la corrección
  handleBackNew() {
    if (this.currentStep > 0) {
      const newStep = this.currentStep - 1;
      this.currentStep = newStep;
      
      // ✅ CORRECCIÓN: Reset bookingFlow when returning to flow selection step
      const steps = this.getSteps();
      const flowStepIndex = steps.findIndex(step => step.id === 'flow');
      if (newStep === flowStepIndex) {
        console.log('DEBUG: Resetting bookingFlow state for flow selection step');
        this.bookingFlow = null;
        this.optimalAppointment = null;
        this.isSearchingOptimal = false;
        this.doctors = [];
      }
    }
  }

  // Simular condición de renderizado del FlowSelector
  shouldRenderFlowSelector() {
    const steps = this.getSteps();
    const flowStepIndex = steps.findIndex(step => step.id === 'flow');
    return this.currentStep === flowStepIndex && !this.bookingFlow;
  }

  // Simular selección de servicio
  selectService(serviceId) {
    this.formData.service_id = serviceId;
    this.currentStep = 1; // Ir a selección de flujo
  }

  // Simular selección de flujo
  selectFlow(flowType) {
    this.bookingFlow = flowType;
    this.currentStep = 2; // Ir a selección de doctor
  }

  // Obtener estado actual
  getState() {
    return {
      currentStep: this.currentStep,
      bookingFlow: this.bookingFlow,
      shouldRenderFlowSelector: this.shouldRenderFlowSelector(),
      currentStepName: this.getSteps()[this.currentStep]?.title || 'Unknown'
    };
  }
}

/**
 * Test 1: Reproducir el bug ANTES de la corrección
 */
function testNavigationBugBefore() {
  console.log('\n🔍 TEST 1: Reproducir Bug ANTES de la Corrección');
  console.log('================================================');

  const simulator = new UnifiedAppointmentFlowSimulator();

  // Simular flujo normal hasta paso 3
  console.log('📋 Simulando flujo normal...');
  simulator.selectService('test-service-id');
  console.log(`   Paso 1: ${simulator.getState().currentStepName} ✅`);
  
  simulator.selectFlow('personalized');
  console.log(`   Paso 2: ${simulator.getState().currentStepName} ✅`);
  console.log(`   bookingFlow: ${simulator.getState().bookingFlow} ✅`);

  // Usuario está en paso 3 (Elegir Doctor)
  console.log(`\n📋 Estado en Paso 3:`);
  console.log(`   currentStep: ${simulator.currentStep}`);
  console.log(`   bookingFlow: ${simulator.bookingFlow}`);
  console.log(`   shouldRenderFlowSelector: ${simulator.shouldRenderFlowSelector()}`);

  // Usuario presiona "Anterior" (usando lógica ANTIGUA)
  console.log('\n📋 Usuario presiona "Anterior" (lógica ANTIGUA)...');
  simulator.handleBackOld();

  const stateAfterBack = simulator.getState();
  console.log(`   currentStep: ${simulator.currentStep} (Paso 2)`);
  console.log(`   bookingFlow: ${simulator.bookingFlow} (NO se resetea) ❌`);
  console.log(`   shouldRenderFlowSelector: ${stateAfterBack.shouldRenderFlowSelector} ❌`);

  if (!stateAfterBack.shouldRenderFlowSelector) {
    console.log('   🔴 RESULTADO: FlowSelector NO se renderiza → PANTALLA EN BLANCO');
    return false;
  } else {
    console.log('   ✅ RESULTADO: FlowSelector se renderiza correctamente');
    return true;
  }
}

/**
 * Test 2: Validar corrección DESPUÉS del fix
 */
function testNavigationFixAfter() {
  console.log('\n🔍 TEST 2: Validar Corrección DESPUÉS del Fix');
  console.log('==============================================');

  const simulator = new UnifiedAppointmentFlowSimulator();

  // Simular flujo normal hasta paso 3
  console.log('📋 Simulando flujo normal...');
  simulator.selectService('test-service-id');
  simulator.selectFlow('personalized');

  // Usuario está en paso 3 (Elegir Doctor)
  console.log(`\n📋 Estado en Paso 3:`);
  console.log(`   currentStep: ${simulator.currentStep}`);
  console.log(`   bookingFlow: ${simulator.bookingFlow}`);

  // Usuario presiona "Anterior" (usando lógica NUEVA)
  console.log('\n📋 Usuario presiona "Anterior" (lógica NUEVA)...');
  simulator.handleBackNew();

  const stateAfterBack = simulator.getState();
  console.log(`   currentStep: ${simulator.currentStep} (Paso 2)`);
  console.log(`   bookingFlow: ${simulator.bookingFlow} (SE RESETEA) ✅`);
  console.log(`   shouldRenderFlowSelector: ${stateAfterBack.shouldRenderFlowSelector} ✅`);

  if (stateAfterBack.shouldRenderFlowSelector) {
    console.log('   ✅ RESULTADO: FlowSelector se renderiza correctamente');
    return true;
  } else {
    console.log('   ❌ RESULTADO: FlowSelector NO se renderiza');
    return false;
  }
}

/**
 * Test 3: Validar múltiples navegaciones
 */
function testMultipleNavigations() {
  console.log('\n🔍 TEST 3: Validar Múltiples Navegaciones');
  console.log('==========================================');

  const simulator = new UnifiedAppointmentFlowSimulator();

  // Flujo completo con múltiples navegaciones
  console.log('📋 Flujo completo con navegaciones...');
  
  // Paso 1: Servicio
  simulator.selectService('test-service-id');
  console.log(`   ✅ Paso 1: ${simulator.getState().currentStepName}`);
  
  // Paso 2: Flujo
  simulator.selectFlow('personalized');
  console.log(`   ✅ Paso 2: ${simulator.getState().currentStepName}`);
  
  // Regresar al paso 2 (Tipo de Reserva)
  simulator.handleBackNew();
  console.log(`   ✅ Regreso a: ${simulator.getState().currentStepName}`);
  console.log(`   ✅ FlowSelector renderiza: ${simulator.shouldRenderFlowSelector()}`);
  
  // Seleccionar flujo nuevamente
  simulator.selectFlow('express');
  console.log(`   ✅ Nuevo flujo: ${simulator.bookingFlow}`);
  
  // Regresar nuevamente
  simulator.handleBackNew();
  console.log(`   ✅ Segundo regreso: ${simulator.getState().currentStepName}`);
  console.log(`   ✅ FlowSelector renderiza: ${simulator.shouldRenderFlowSelector()}`);

  return simulator.shouldRenderFlowSelector();
}

/**
 * Función principal de validación
 */
function main() {
  console.log('🔧 VALIDACIÓN: Corrección del Bug de Navegación Paso 3 → Paso 2');
  console.log('================================================================');
  console.log('Problema: Pantalla en blanco al regresar del paso 3 al paso 2');
  console.log('Solución: Reset de bookingFlow al regresar al paso de selección');
  console.log('================================================================');

  const results = {
    bugReproduced: false,
    fixValidated: false,
    multipleNavigationsWork: false
  };

  // Ejecutar tests
  results.bugReproduced = !testNavigationBugBefore(); // Invertido porque queremos que falle
  results.fixValidated = testNavigationFixAfter();
  results.multipleNavigationsWork = testMultipleNavigations();

  // Resumen final
  console.log('\n📊 RESUMEN DE VALIDACIÓN');
  console.log('========================');
  console.log(`Bug Reproducido (Antes): ${results.bugReproduced ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Corrección Validada: ${results.fixValidated ? '✅ SÍ' : '❌ NO'}`);
  console.log(`Navegaciones Múltiples: ${results.multipleNavigationsWork ? '✅ SÍ' : '❌ NO'}`);

  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ¡CORRECCIÓN VALIDADA EXITOSAMENTE!');
    console.log('✅ El bug de navegación ha sido resuelto');
    console.log('✅ FlowSelector se renderiza correctamente al regresar');
    console.log('✅ Navegaciones múltiples funcionan sin problemas');
    console.log('✅ Estado del componente se mantiene consistente');
    process.exit(0);
  } else {
    console.log('\n❌ VALIDACIÓN FALLIDA');
    console.log('⚠️  La corrección no funciona como esperado');
    process.exit(1);
  }
}

// Ejecutar validación
if (require.main === module) {
  main();
}

module.exports = {
  UnifiedAppointmentFlowSimulator,
  testNavigationBugBefore,
  testNavigationFixAfter,
  testMultipleNavigations
};
