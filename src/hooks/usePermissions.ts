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
  | 'edit_place'
  | 'build_scenario'
  | 'submit_scenario'
  | 'approve_final_budget'
  | 'manage_wards'
  | 'submit_field_report'
  | 'view_state_overview'
  | 'submit_citizen_report'
  | 'manage_data_sources'
  | 'acknowledge_complaint';

const ROLE_HIERARCHY: Record<string, number> = {
  PUBLIC: 0,
  CITIZEN_REPORTER: 1,
  NGO_FIELD_WORKER: 2,
  CITY_COUNCIL: 3,
  DATA_ANALYST: 3,
  WARD_OFFICER: 4,
  SDMA_OBSERVER: 4,
  URBAN_PLANNER: 5,
  CITY_ADMIN: 6,
  MUNICIPAL_COMMISSIONER: 7,
  SUPER_ADMIN: 8,
};

const PERMISSION_MAP: Record<Permission, string[]> = {
  place_intervention: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  approve_scenario: ['CITY_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER'],
  view_reports: ['CITY_COUNCIL', 'URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER', 'SDMA_OBSERVER', 'DATA_ANALYST'],
  generate_report: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN', 'DATA_ANALYST'],
  manage_users: ['CITY_ADMIN', 'SUPER_ADMIN'],
  ingest_data: ['CITY_ADMIN', 'SUPER_ADMIN', 'DATA_ANALYST'],
  view_admin: ['SUPER_ADMIN'],
  approve_intervention: ['CITY_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER'],
  edit_place: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN', 'WARD_OFFICER'],
  build_scenario: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  submit_scenario: ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  approve_final_budget: ['MUNICIPAL_COMMISSIONER', 'SUPER_ADMIN'],
  manage_wards: ['MUNICIPAL_COMMISSIONER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  submit_field_report: ['NGO_FIELD_WORKER', 'WARD_OFFICER'],
  view_state_overview: ['SDMA_OBSERVER', 'MUNICIPAL_COMMISSIONER', 'SUPER_ADMIN'],
  submit_citizen_report: ['CITIZEN_REPORTER'],
  manage_data_sources: ['DATA_ANALYST', 'CITY_ADMIN', 'SUPER_ADMIN'],
  acknowledge_complaint: ['WARD_OFFICER', 'MUNICIPAL_COMMISSIONER', 'SUPER_ADMIN'],
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
    case 'MUNICIPAL_COMMISSIONER':
      return '/dashboard/commissioner';
    case 'CITY_ADMIN':
      return '/dashboard/map';
    case 'URBAN_PLANNER':
      return '/dashboard/map';
    case 'WARD_OFFICER':
      return '/dashboard/ward';
    case 'SDMA_OBSERVER':
      return '/dashboard/state';
    case 'DATA_ANALYST':
      return '/dashboard/analyst';
    case 'NGO_FIELD_WORKER':
      return '/dashboard/field';
    case 'CITIZEN_REPORTER':
      return '/dashboard/citizen';
    case 'CITY_COUNCIL':
      return '/dashboard/scenarios';
    default:
      return '/dashboard';
  }
}
