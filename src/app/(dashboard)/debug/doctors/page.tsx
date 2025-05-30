'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

export default function DebugDoctorsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const organizationId = profile?.organization_id || '927cecbe-d9e5-43a4-b9d0-25f942ededc4';

  if (authLoading) {
    return <div className="p-8">Loading authentication...</div>;
  }

  if (!user) {
    return <div className="p-8">Please log in to access this page.</div>;
  }

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const response = await fetch(`/api/services?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error('Error loading services:', err);
    }
  };

  const loadDoctors = async (serviceId?: string) => {
    try {
      setLoading(true);
      setError('');

      let url = `/api/doctors?organizationId=${organizationId}`;
      if (serviceId) {
        url += `&serviceId=${serviceId}`;
      }

      console.log('Fetching doctors from:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('API Response:', data);

      if (response.ok) {
        setDoctors(data.doctors || []);
      } else {
        setError(data.error || 'Failed to fetch doctors');
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    loadDoctors(serviceId);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Doctors API</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Organization ID: {organizationId}
          </label>
          <label className="block text-sm font-medium mb-2">
            User: {user?.email} | Role: {profile?.role}
          </label>
          <div className="text-sm text-gray-600 mt-2">
            <strong>Test Credentials:</strong> Use any email ending in @visualcare.com with password: VisualCare2025!
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Select Service:
          </label>
          <select
            value={selectedService}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full"
            title="Select a service to filter doctors"
          >
            <option value="">All Doctors</option>
            {services.map((service: any) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={() => loadDoctors(selectedService)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Fetch Doctors'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Doctors Found: {doctors.length}
          </h2>

          {doctors.length === 0 && !loading && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              No doctors found for the selected criteria
            </div>
          )}

          <div className="space-y-2">
            {doctors.map((doctor: any) => (
              <div key={doctor.id} className="border border-gray-200 rounded p-3">
                <div className="font-medium">{doctor.name}</div>
                <div className="text-sm text-gray-600">{doctor.specialization}</div>
                <div className="text-sm text-gray-500">
                  Fee: ${doctor.consultation_fee} | Available: {doctor.is_available ? 'Yes' : 'No'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Services Available:</h2>
          <div className="space-y-1">
            {services.map((service: any) => (
              <div key={service.id} className="text-sm">
                {service.name} (ID: {service.id})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
