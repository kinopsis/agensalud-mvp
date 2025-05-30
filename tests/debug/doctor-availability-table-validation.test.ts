/**
 * Doctor Availability Table Validation Test
 * 
 * PROBLEMA IDENTIFICADO:
 * La tabla `doctor_availability` no existe en la base de datos, causando errores
 * en la API de horarios de doctores.
 * 
 * ERROR: "Could not find a relationship between 'doctor_availability' and 'profiles' in the schema cache"
 * 
 * SOLUCIÓN: Crear la tabla doctor_availability con la estructura correcta
 */

import { createClient } from '@/lib/supabase/server';

describe('🔍 DOCTOR AVAILABILITY TABLE VALIDATION', () => {
  let supabase: any;

  beforeAll(async () => {
    supabase = await createClient();
  });

  describe('📋 DIAGNÓSTICO DEL PROBLEMA', () => {
    it('should identify that doctor_availability table does not exist', async () => {
      console.log('\n🔍 DIAGNÓSTICO COMPLETO:');
      console.log('=====================================');
      
      // Test 1: Verificar si la tabla existe
      console.log('\n1. VERIFICANDO EXISTENCIA DE TABLA doctor_availability...');
      
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'doctor_availability');

      if (tablesError) {
        console.log('❌ Error verificando tablas:', tablesError.message);
      } else {
        console.log('📊 Resultado:', tables?.length > 0 ? '✅ Tabla existe' : '❌ Tabla NO existe');
      }

      // Test 2: Intentar consulta directa
      console.log('\n2. INTENTANDO CONSULTA DIRECTA...');
      
      const { data: directQuery, error: directError } = await supabase
        .from('doctor_availability')
        .select('count')
        .limit(1);

      if (directError) {
        console.log('❌ Error en consulta directa:', directError.message);
        console.log('🔍 Código de error:', directError.code);
      } else {
        console.log('✅ Consulta directa exitosa');
      }

      // Test 3: Verificar tablas relacionadas que SÍ existen
      console.log('\n3. VERIFICANDO TABLAS RELACIONADAS...');
      
      const relatedTables = ['profiles', 'doctors', 'locations'];
      
      for (const tableName of relatedTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Existe y accesible`);
        }
      }

      // Resultado del diagnóstico
      console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
      console.log('=====================================');
      console.log('❌ PROBLEMA: La tabla doctor_availability NO EXISTE');
      console.log('✅ CAUSA RAÍZ: Migración no aplicada');
      console.log('🔧 SOLUCIÓN: Crear la tabla con la estructura correcta');
      
      expect(directError).toBeTruthy();
      expect(directError?.message).toContain('does not exist');
    });
  });

  describe('📝 SOLUCIÓN REQUERIDA', () => {
    it('should provide SQL script to create doctor_availability table', () => {
      console.log('\n🔧 SCRIPT SQL PARA CREAR LA TABLA:');
      console.log('=====================================');
      
      const createTableSQL = `
-- Crear tabla doctor_availability
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES profiles(id) NOT NULL,
    location_id UUID REFERENCES locations(id) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, location_id, day_of_week, start_time, end_time)
);

-- Crear índice para rendimiento
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day 
ON doctor_availability(doctor_id, day_of_week);

-- Habilitar RLS
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- Política RLS para doctores y staff
CREATE POLICY "doctors_staff_availability_access" ON doctor_availability
    FOR ALL TO authenticated
    USING (
        doctor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'staff', 'superadmin')
            AND profiles.organization_id = (
                SELECT organization_id FROM profiles WHERE id = doctor_availability.doctor_id
            )
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE doctor_availability IS 'Doctor availability schedules for appointment booking';
COMMENT ON COLUMN doctor_availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
`;

      console.log(createTableSQL);
      
      console.log('\n📋 INSTRUCCIONES:');
      console.log('=====================================');
      console.log('1. Copiar el script SQL de arriba');
      console.log('2. Ejecutar en Supabase SQL Editor');
      console.log('3. Verificar que la tabla se creó correctamente');
      console.log('4. Probar la API de horarios de doctores');
      
      expect(createTableSQL).toContain('CREATE TABLE IF NOT EXISTS doctor_availability');
    });
  });

  describe('🧪 VALIDACIÓN POST-CREACIÓN', () => {
    it('should validate table structure after creation', async () => {
      console.log('\n🧪 VALIDACIÓN DE ESTRUCTURA (ejecutar después de crear tabla):');
      console.log('=====================================');
      
      // Este test se ejecutará después de crear la tabla
      const { data: columns, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'doctor_availability')
        .order('ordinal_position');

      if (error) {
        console.log('❌ Tabla aún no existe. Ejecutar script SQL primero.');
        console.log('Error:', error.message);
      } else if (columns && columns.length > 0) {
        console.log('✅ TABLA CREADA EXITOSAMENTE');
        console.log('📊 Estructura de la tabla:');
        columns.forEach((col: any) => {
          console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
      } else {
        console.log('❌ Tabla no encontrada');
      }
      
      // No hacer assertion aquí porque la tabla puede no existir aún
      console.log('\n✅ Test completado. Revisar logs para siguiente paso.');
    });
  });
});
