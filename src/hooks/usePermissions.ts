'use client';

import { useSession } from 'next-auth/react';

type Permission =
  | 'place_intervention'
  | 'approve_scenario'
  | 'view_reports'
  | 'generate_report'
  | 'manage_users'
  | 'ingest_data'
  | 'view_admin'
  | 'approve_intervention'
  | 'edit_neighborhood'
  | 'build_scenario'
  | 'submit_scenario';

const ROLE_HIERARCHY: Record<string, number> = {
  PUBLIC: 0,
  CITY_COUNCIL: 1,
  URBAN_PLANNER: 2,
  CITY_ADMIN: 3,
  SUPER_ADMIN: 4,
};

const PERMISSION_MAP: Record<Permission, string[]> = {
  place_intervention: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  approve_scenario: ['CITY_ADMIN', 'SUPER_ADMIN'],
  view_reports: ['CITY_COUNCIL', 'URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  generate_report: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  manage_users: ['CITY_ADMIN', 'SUPER_ADMIN'],
  ingest_data: ['CITY_ADMIN', 'SUPER_ADMIN'],
  view_admin: ['SUPER_ADMIN'],
  approve_intervention: ['CITY_ADMIN', 'SUPER_ADMIN'],
  edit_neighborhood: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  build_scenario: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  submit_scenario: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
};

export function usePermissions() {
  const { data: session } = useSession();
  const role = session?.user?.role || 'PUBLIC';

  const can = (permission: Permission): boolean => {
    return PERMISSION_MAP[permission]?.includes(role) ?? false;
  };

  const isAtLeast = (minimumRole: string): boolean => {
    return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 99);
  };

  return {
    can,
    isAtLeast,
    role,
    userId: session?.user?.id,
    cityId: session?.user?.cityId,
    isAuthenticated: !!session?.user,
  };
}

// Server-side permission check
export function hasPermission(role: string, permission: Permission): boolean {
  return PERMISSION_MAP[permission]?.includes(role) ?? false;
}

export function getRoleRedirect(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/dashboard/admin';
    case 'CITY_ADMIN':
      return '/dashboard/map';
    case 'URBAN_PLANNER':
      return '/dashboard/map';
    case 'CITY_COUNCIL':
      return '/dashboard/scenarios';
    default:
      return '/map';
  }
}
