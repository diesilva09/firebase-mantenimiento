"use client";
import { createContext, useContext, ReactNode } from "react";
import { FirebaseApp } from "firebase/app";
import { Auth, User } from "firebase/auth";
import { Firestore } from "firebase/firestore";

interface FirebaseClientContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
  user: User | null;
  loading: boolean;
}

const FirebaseClientContext = createContext<
  FirebaseClientContextType | undefined
>(undefined);

export function FirebaseClientProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FirebaseClientContextType;
}) {
  return (
    <FirebaseClientContext.Provider value={value}>
      {children}
    </FirebaseClientContext.Provider>
  );
}

export const useFirebaseClient = () => {
  const context = useContext(FirebaseClientContext);
  if (context === undefined) {
    throw new Error(
      "useFirebaseClient must be used within a FirebaseClientProvider"
    );
  }
  return context;
};
