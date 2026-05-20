import { useState } from 'react';
import { registerUser } from '../services/auth.service';
import { UserCreate } from '../types';

export const useRegister = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeRegister = async (data: UserCreate) => {
        setLoading(true);
        setError(null);
        try {
            const result = await registerUser(data);
            setLoading(false);
            return result;
        } catch (err: any) {
            setError(err);
            setLoading(false);
            throw err;
        }
    };

    return { executeRegister, loading, error };
};