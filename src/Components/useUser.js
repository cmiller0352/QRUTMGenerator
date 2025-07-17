import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export const useUser = () => useContext(AuthContext);
