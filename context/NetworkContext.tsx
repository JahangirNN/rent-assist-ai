import React, { createContext, useContext } from 'react';
import { useNetwork } from '@/hooks/useNetwork';

type NetworkContextType = {
  isConnected: boolean | null;
};

const NetworkContext = createContext<NetworkContextType>({ isConnected: true });

export const useNetworkContext = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useNetwork();

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
};
