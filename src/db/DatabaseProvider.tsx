import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initializeDatabase } from './database';
import { Colors } from '../theme';

interface DatabaseContextValue {
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue>({ isReady: false });

export const useDatabaseReady = () => useContext(DatabaseContext);

interface Props {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<Props> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsReady(true))
      .catch((e) => {
        console.error('[DB] Initialization failed:', e);
        setError(e.message ?? 'Unknown error');
        // Even on error, proceed so the app doesn't hard-block
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <DatabaseContext.Provider value={{ isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
