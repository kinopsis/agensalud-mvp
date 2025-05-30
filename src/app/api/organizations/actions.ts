'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Insert']

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  // Extract form data
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const website = formData.get('website') as string
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const state = formData.get('state') as string
  const postal_code = formData.get('postal_code') as string
  const country = formData.get('country') as string
  const description = formData.get('description') as string

  // Validate required fields
  if (!name || !slug) {
    throw new Error('Name and slug are required')
  }

  // Create organization
  const organizationData: Organization = {
    name,
    slug,
    email: email || null,
    phone: phone || null,
    website: website || null,
    address: address || null,
    city: city || null,
    state: state || null,
    postal_code: postal_code || null,
    country: country || null,
    description: description || null,
    is_active: true,
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert(organizationData)
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    throw new Error('Failed to create organization: ' + orgError.message)
  }

  // Update user profile to associate with the new organization
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      organization_id: organization.id,
      role: 'admin' // The creator becomes an admin
    })
    .eq('id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    // Note: We don't throw here because the organization was created successfully
    // The user can be manually associated later
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateOrganization(organizationId: string, formData: FormData) {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  // Check if user has permission to update this organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== organizationId || !['admin', 'superadmin'].includes(profile.role)) {
    throw new Error('Insufficient permissions')
  }

  // Extract form data
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const website = formData.get('website') as string
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const state = formData.get('state') as string
  const postal_code = formData.get('postal_code') as string
  const country = formData.get('country') as string
  const description = formData.get('description') as string

  // Validate required fields
  if (!name) {
    throw new Error('Name is required')
  }

  // Update organization
  const { error } = await supabase
    .from('organizations')
    .update({
      name,
      email: email || null,
      phone: phone || null,
      website: website || null,
      address: address || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      description: description || null,
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Error updating organization:', error)
    throw new Error('Failed to update organization: ' + error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/organization')
}
