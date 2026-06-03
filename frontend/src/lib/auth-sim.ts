'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export type UserRole = 'super_admin' | 'store_admin' | 'user';

export function useActiveRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>('user');

  useEffect(() => {
    if (!isLoaded) return;

    if (user?.publicMetadata?.role) {
      setRole(user.publicMetadata.role as UserRole);
    } else {
      setRole('user');
    }
  }, [user, isLoaded]);

  const changeRole = (newRole: UserRole) => {
    // No-op to maintain function signature compatibility in layout
  };

  return { role, changeRole, isLoaded };
}
