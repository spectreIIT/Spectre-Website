import { useState, useEffect } from 'react';
import { moduleService } from '../services/moduleService';

export const useModules = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await moduleService.getModules();
      setModules(data);
    } catch (error) {
      console.error('Failed to fetch modules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return { modules, loading, refetch: fetchModules };
};
