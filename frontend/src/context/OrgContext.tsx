import React, { createContext, useContext, useState } from 'react';
import { DemoOrg, DEMO_ORGS } from '../types/api';

interface OrgContextType {
  currentOrg: DemoOrg;
  setCurrentOrg: (org: DemoOrg) => void;
  orgId: string;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrg, setCurrentOrg] = useState<DemoOrg>(DEMO_ORGS[0]);

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrg, orgId: currentOrg.id }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within OrgProvider');
  }
  return context;
};
