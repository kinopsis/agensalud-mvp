import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DEBUG ENDPOINT: Create Test Patients
 * Creates test patients for VisualCare organization to validate the system
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      investigation: 'Create Test Patients',
      results: {} as any
    };

    const visualcareOrgId = '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

    // Test patients data
    const testPatients = [
      {
        email: 'maria.rodriguez@test.com',
        password: 'TestPassword123!',
        first_name: 'María',
        last_name: 'Rodríguez',
        phone: '+57 300 123 4567',
        date_of_birth: '1985-03-15',
        gender: 'female',
        address: 'Calle 123 #45-67',
        city: 'Bogotá',
        emergency_contact_name: 'Carlos Rodríguez',
        emergency_contact_phone: '+57 300 765 4321',
        medical_notes: 'Paciente con historial de hipertensión controlada'
      },
      {
        email: 'juan.perez@test.com',
        password: 'TestPassword123!',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '+57 301 234 5678',
        date_of_birth: '1978-07-22',
        gender: 'male',
        address: 'Carrera 45 #12-34',
        city: 'Medellín',
        emergency_contact_name: 'Ana Pérez',
        emergency_contact_phone: '+57 301 876 5432',
        medical_notes: 'Paciente diabético tipo 2, requiere seguimiento regular'
      },
      {
        email: 'sofia.martinez@test.com',
        password: 'TestPassword123!',
        first_name: 'Sofía',
        last_name: 'Martínez',
        phone: '+57 302 345 6789',
        date_of_birth: '1992-11-08',
        gender: 'female',
        address: 'Avenida 68 #23-45',
        city: 'Cali',
        emergency_contact_name: 'Luis Martínez',
        emergency_contact_phone: '+57 302 987 6543',
        medical_notes: 'Paciente joven, sin antecedentes médicos relevantes'
      }
    ];

    const createdPatients = [];
    const errors = [];

    for (let i = 0; i < testPatients.length; i++) {
      const patientData = testPatients[i];
      
      try {
        // Create user in auth
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: patientData.email,
          password: patientData.password,
          email_confirm: true
        });

        if (createError) {
          errors.push({
            patient: patientData.email,
            step: 'auth_creation',
            error: createError.message
          });
          continue;
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: newUser.user.id,
            email: patientData.email,
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            role: 'patient',
            organization_id: visualcareOrgId,
            phone: patientData.phone,
            date_of_birth: patientData.date_of_birth,
            gender: patientData.gender,
            address: patientData.address,
            city: patientData.city,
            is_active: true
          });

        if (profileError) {
          // Clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(newUser.user.id);
          errors.push({
            patient: patientData.email,
            step: 'profile_creation',
            error: profileError.message
          });
          continue;
        }

        // Create patient record
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .insert({
            profile_id: newUser.user.id,
            organization_id: visualcareOrgId,
            emergency_contact_name: patientData.emergency_contact_name,
            emergency_contact_phone: patientData.emergency_contact_phone,
            medical_notes: patientData.medical_notes
          })
          .select()
          .single();

        if (patientError) {
          // Clean up profile and auth user if patient creation fails
          await supabase.from('profiles').delete().eq('id', newUser.user.id);
          await supabase.auth.admin.deleteUser(newUser.user.id);
          errors.push({
            patient: patientData.email,
            step: 'patient_record_creation',
            error: patientError.message
          });
          continue;
        }

        createdPatients.push({
          id: patient.id,
          profile_id: newUser.user.id,
          email: patientData.email,
          first_name: patientData.first_name,
          last_name: patientData.last_name
        });

      } catch (err) {
        errors.push({
          patient: patientData.email,
          step: 'general_error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Verify created patients
    const { data: verificationData, error: verificationError } = await supabase
      .from('patients')
      .select(`
        id,
        profile_id,
        organization_id,
        profiles!inner(first_name, last_name, email)
      `)
      .eq('organization_id', visualcareOrgId);

    diagnostics.results = {
      attempted: testPatients.length,
      created: createdPatients.length,
      errors: errors.length,
      created_patients: createdPatients,
      errors_details: errors,
      verification: {
        success: !verificationError,
        count: verificationData?.length || 0,
        data: verificationData,
        error: verificationError?.message
      }
    };

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        patients_created: createdPatients.length,
        total_patients_in_db: verificationData?.length || 0,
        errors_count: errors.length,
        all_successful: errors.length === 0
      }
    });

  } catch (error) {
    console.error('Error in create test patients debug:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
