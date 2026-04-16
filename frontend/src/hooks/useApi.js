import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createApiClients } from '@/services/apiClient';
export function useApi(fetchFn, deps) {
    const { tokens } = useAuth();
    const [state, setState] = useState({
        data: null,
        loading: true,
        error: null,
    });
    useEffect(() => {
        const fetch = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null }));
                const clients = createApiClients(tokens);
                const data = await fetchFn(clients);
                setState({ data, loading: false, error: null });
            }
            catch (error) {
                setState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error : new Error('Unknown error'),
                    loading: false,
                }));
            }
        };
        fetch();
    }, deps || []);
    return state;
}
export function useApiMutation(mutationFn) {
    const { tokens } = useAuth();
    const [state, setState] = useState({
        data: null,
        loading: false,
        error: null,
    });
    const mutate = useCallback(async (args) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const clients = createApiClients(tokens);
            const data = await mutationFn(clients, args);
            setState({ data, loading: false, error: null });
            return data;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            setState(prev => ({
                ...prev,
                error: err,
                loading: false,
            }));
            throw err;
        }
    }, [tokens]);
    return { ...state, mutate };
}
