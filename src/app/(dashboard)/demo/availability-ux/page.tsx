'use client';

/**
 * Demo Page - Availability UX Improvements
 * 
 * Página de demostración para mostrar las mejoras propuestas
 * en la experiencia de consulta de disponibilidad de doctores
 * 
 * @author AgentSalud MVP Team - UX Enhancement Demo
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Star, Clock, Zap } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AvailabilityIndicator, { WeeklyAvailability, useWeeklyAvailabilityData } from '@/components/appointments/AvailabilityIndicator';

export default function AvailabilityUXDemoPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDemo, setSelectedDemo] = useState<'current' | 'weekly' | 'smart' | 'compact'>('weekly');
  const [showExpandedView, setShowExpandedView] = useState(false);

  // Generar datos de ejemplo
  const weekData = useWeeklyAvailabilityData(currentWeek);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
  };

  return (
    <DashboardLayout
      title="Demo: Mejoras UX Disponibilidad"
      subtitle="Prototipos de las mejoras propuestas para consulta de disponibilidad de doctores"
    >
      <div className="space-y-8">
        {/* Selector de Demo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona el prototipo a visualizar:</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedDemo('current')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDemo === 'current'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📋 Interfaz Actual
            </button>
            <button
              onClick={() => setSelectedDemo('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDemo === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              📅 Vista Semanal (Propuesta 1)
            </button>
            <button
              onClick={() => setSelectedDemo('smart')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDemo === 'smart'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              🌟 Sugerencias Inteligentes (Propuesta 2)
            </button>
            <button
              onClick={() => setSelectedDemo('compact')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDemo === 'compact'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              📋 Vista Compacta (Propuesta 3)
            </button>
          </div>
        </div>

        {/* Demo de Interfaz Actual */}
        {selectedDemo === 'current' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Interfaz Actual - Modal de Reagendado
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Fecha
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    defaultValue="2024-12-20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horarios Disponibles
                  </label>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">🌅 Mañana</h4>
                      <div className="grid grid-cols-6 gap-2">
                        {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30'].map((time) => (
                          <button
                            key={time}
                            className="p-2 text-xs rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">🌇 Tarde</h4>
                      <div className="grid grid-cols-6 gap-2">
                        {['14:00', '14:30', '15:00', '15:30'].map((time) => (
                          <button
                            key={time}
                            className="p-2 text-xs rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  <strong>Problemas identificados:</strong> Falta de contexto visual, navegación limitada, 
                  no hay indicadores de disponibilidad relativa entre fechas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Demo de Vista Semanal */}
        {selectedDemo === 'weekly' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Propuesta 1: Vista Semanal con Indicadores de Densidad
            </h3>
            
            <div className="space-y-6">
              {/* Navegación semanal */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Semana Anterior
                </button>
                
                <h4 className="text-lg font-semibold text-gray-900">
                  {formatWeekRange(currentWeek)}
                </h4>
                
                <button
                  onClick={() => navigateWeek('next')}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Semana Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>

              {/* Indicadores semanales */}
              <WeeklyAvailability
                weekData={weekData}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                size="lg"
              />

              {/* Horarios del día seleccionado */}
              {selectedDate && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-blue-900 mb-3">
                    Horarios disponibles - {new Date(selectedDate).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </h4>
                  
                  <div className="grid grid-cols-6 gap-2">
                    {['08:00', '08:30', '09:00', '14:00', '14:30', '15:00', '15:30', '16:00'].map((time) => (
                      <button
                        key={time}
                        className="p-2 text-xs rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-blue-100 transition-colors"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Mejoras implementadas:</strong> Contexto temporal visual, comparación entre días, 
                  navegación intuitiva, indicadores de densidad de disponibilidad.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Demo de Sugerencias Inteligentes */}
        {selectedDemo === 'smart' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Propuesta 2: Sugerencias Inteligentes
            </h3>
            
            <div className="space-y-6">
              {/* Sugerencias destacadas */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Star className="h-5 w-5 mr-2 text-purple-600" />
                  Recomendado para ti
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sugerencia 1 */}
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-600">🕘 Mañana</span>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900">19 Dic</div>
                    <div className="text-sm text-gray-600">09:00 - 09:30</div>
                    <div className="mt-2 text-xs text-purple-600 font-medium">
                      ⭐ Popular (80% lo eligen)
                    </div>
                    <button className="w-full mt-3 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors">
                      Seleccionar
                    </button>
                  </div>

                  {/* Sugerencia 2 */}
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-600">🕐 Tarde</span>
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900">20 Dic</div>
                    <div className="text-sm text-gray-600">14:30 - 15:00</div>
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      🕐 Flexible (fácil cambio)
                    </div>
                    <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                      Seleccionar
                    </button>
                  </div>

                  {/* Sugerencia 3 */}
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-600">🕙 Mañana</span>
                      <Zap className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-lg font-semibold text-gray-900">21 Dic</div>
                    <div className="text-sm text-gray-600">10:00 - 10:30</div>
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      🚀 Próximo (en 2 días)
                    </div>
                    <button className="w-full mt-3 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors">
                      Seleccionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Otros horarios */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  📅 Otros horarios disponibles
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-center">
                    <div className="text-sm font-medium text-gray-900">🌅 Mañana</div>
                    <div className="text-xs text-gray-600">6 horarios</div>
                  </button>
                  
                  <button className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-center">
                    <div className="text-sm font-medium text-gray-900">🌇 Tarde</div>
                    <div className="text-xs text-gray-600">4 horarios</div>
                  </button>
                  
                  <button className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-center">
                    <div className="text-sm font-medium text-gray-900">🌙 Noche</div>
                    <div className="text-xs text-gray-600">2 horarios</div>
                  </button>
                  
                  <button className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-center">
                    <div className="text-sm font-medium text-gray-900">📅 Más fechas</div>
                    <div className="text-xs text-gray-600">Ver todas</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm text-purple-700">
                  <strong>Mejoras implementadas:</strong> Recomendaciones personalizadas, decisión acelerada, 
                  reducción de carga cognitiva, acceso rápido a opciones curadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Demo de Vista Compacta */}
        {selectedDemo === 'compact' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Propuesta 3: Vista Compacta con Expansión Progresiva
            </h3>

            <div className="space-y-6">
              {!showExpandedView ? (
                <>
                  {/* Vista compacta inicial */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-green-600" />
                      Próximas fechas disponibles
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* HOY */}
                      <div className="bg-white rounded-lg p-4 border-2 border-red-200 hover:border-red-400 transition-colors cursor-pointer">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">HOY</div>
                          <div className="text-sm text-gray-600">16 Dic</div>
                          <div className="mt-2">
                            <div className="text-2xl font-bold text-red-600">2</div>
                            <div className="text-xs text-gray-600">slots</div>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                            <span className="text-xs text-red-600 font-medium">Pocos</span>
                          </div>
                          <button
                            type="button"
                            className="w-full mt-3 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                          >
                            Ver horas
                          </button>
                        </div>
                      </div>

                      {/* MAÑANA */}
                      <div className="bg-white rounded-lg p-4 border-2 border-green-200 hover:border-green-400 transition-colors cursor-pointer">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">MAÑANA</div>
                          <div className="text-sm text-gray-600">17 Dic</div>
                          <div className="mt-2">
                            <div className="text-2xl font-bold text-green-600">8</div>
                            <div className="text-xs text-gray-600">slots</div>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                            <span className="text-xs text-green-600 font-medium">Muchos</span>
                          </div>
                          <button
                            type="button"
                            className="w-full mt-3 px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                          >
                            Ver horas
                          </button>
                        </div>
                      </div>

                      {/* VIE 20 */}
                      <div className="bg-white rounded-lg p-4 border-2 border-yellow-200 hover:border-yellow-400 transition-colors cursor-pointer">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">VIE 20</div>
                          <div className="text-sm text-gray-600">20 Dic</div>
                          <div className="mt-2">
                            <div className="text-2xl font-bold text-yellow-600">6</div>
                            <div className="text-xs text-gray-600">slots</div>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                            <span className="text-xs text-yellow-600 font-medium">Medio</span>
                          </div>
                          <button
                            type="button"
                            className="w-full mt-3 px-3 py-1 bg-yellow-600 text-white text-xs rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            Ver horas
                          </button>
                        </div>
                      </div>

                      {/* LUN 23 */}
                      <div className="bg-white rounded-lg p-4 border-2 border-yellow-200 hover:border-yellow-400 transition-colors cursor-pointer">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">LUN 23</div>
                          <div className="text-sm text-gray-600">23 Dic</div>
                          <div className="mt-2">
                            <div className="text-2xl font-bold text-yellow-600">4</div>
                            <div className="text-xs text-gray-600">slots</div>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                            <span className="text-xs text-yellow-600 font-medium">Medio</span>
                          </div>
                          <button
                            type="button"
                            className="w-full mt-3 px-3 py-1 bg-yellow-600 text-white text-xs rounded-md hover:bg-yellow-700 transition-colors"
                          >
                            Ver horas
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opciones de expansión */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      🔍 Más opciones
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setShowExpandedView(true)}
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">📅 Ver más fechas</div>
                            <div className="text-xs text-gray-600 mt-1">Próximas 2 semanas</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>

                      <button
                        type="button"
                        className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">📅 Ver calendario completo</div>
                            <div className="text-xs text-gray-600 mt-1">Vista mensual con todos los horarios</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Vista expandida */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">
                        📅 Todas las fechas disponibles
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowExpandedView(false)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Volver a vista compacta
                      </button>
                    </div>

                    {/* Navegación semanal en vista expandida */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => navigateWeek('prev')}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Semana Anterior
                      </button>

                      <h5 className="text-md font-semibold text-gray-900">
                        {formatWeekRange(currentWeek)}
                      </h5>

                      <button
                        type="button"
                        onClick={() => navigateWeek('next')}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Semana Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>

                    {/* Indicadores semanales en vista expandida */}
                    <WeeklyAvailability
                      weekData={weekData}
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      size="md"
                    />
                  </div>
                </>
              )}

              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <strong>Mejoras implementadas:</strong> Carga inicial rápida con próximas opciones,
                  indicadores de densidad con colores semafóricos, expansión progresiva para usuarios
                  con diferentes necesidades, jerarquía de información (cercano → lejano).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas de comparación */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Métricas de Mejora Esperadas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">-40%</div>
              <div className="text-sm text-gray-600">Tiempo de selección</div>
              <div className="text-xs text-gray-500 mt-1">De 60s a 36s promedio</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">+25%</div>
              <div className="text-sm text-gray-600">Satisfacción del usuario</div>
              <div className="text-xs text-gray-500 mt-1">Escala de usabilidad SUS</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">-50%</div>
              <div className="text-sm text-gray-600">Tasa de abandono</div>
              <div className="text-xs text-gray-500 mt-1">En proceso de reagendado</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
