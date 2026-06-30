'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { checkUserRole, UserRole } from '@/lib/role-service';

interface UserRoleContextType {
  userRole: UserRole | null;
  roleLoading: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.uid || null;

    if (!userId) {
      setUserRole(null);
      setRoleLoading(false);
      lastCheckedUserId.current = null;
      return;
    }

    if (lastCheckedUserId.current === userId) {
      return;
    }

    lastCheckedUserId.current = userId;
    const checkRole = async () => {
      setRoleLoading(true);
      try {
        const role = await checkUserRole(user);
        setUserRole(role);
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    };
    checkRole();
  }, [user]);

  return (
    <UserRoleContext.Provider value={{ userRole, roleLoading }}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
