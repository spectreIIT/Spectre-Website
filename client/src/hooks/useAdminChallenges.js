import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminChallenges,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  fetchChallengeSolves
} from '../services/adminChallengeService';

export const useAdminChallenges = (eventId = null) => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let data = await fetchAdminChallenges();
      if (eventId) {
        data = data.filter(c => c.eventId === eventId);
      } else {
        data = data.filter(c => !c.eventId); // Global challenges only
      }
      setChallenges(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleCreate = async (data) => {
    const payload = eventId ? { ...data, eventId } : data;
    const newChallenge = await createAdminChallenge(payload);
    setChallenges(prev => [newChallenge, ...prev]);
    return newChallenge;
  };

  const handleUpdate = async (id, data) => {
    const updated = await updateAdminChallenge(id, data);
    setChallenges(prev => prev.map(c => (c._id === id ? updated : c)));
    return updated;
  };

  const handleDelete = async (id) => {
    await deleteAdminChallenge(id);
    setChallenges(prev => prev.filter(c => c._id !== id));
  };

  return {
    challenges,
    loading,
    error,
    loadChallenges,
    handleCreate,
    handleUpdate,
    handleDelete
  };
};
