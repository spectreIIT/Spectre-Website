import { useState, useEffect } from 'react';
import { socket } from '../sockets/socket';
import { activityService } from '../services/activityService';
import { buildHeatmapMonths } from '../utils/heatmap';

export const useActivity = (userId) => {
  const [heatmap, setHeatmap] = useState({ weeks: [], totalEvents: 0, activeDays: 0, months: [] });
  const [loading, setLoading] = useState(true);

  const fetchHeatmap = async (uid) => {
    try {
      setLoading(true);
      const data = await activityService.getHeatmap(uid);
      
      const months = buildHeatmapMonths(data.weeks);
      setHeatmap({ ...data, months });
    } catch (err) {
      console.error('Failed to load heatmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchHeatmap(userId);

    socket.connect();
    socket.emit('activity:join', userId);

    const handleUpdate = () => {
      fetchHeatmap(userId);
    };

    socket.on('heatmap:update', handleUpdate);

    return () => {
      socket.off('heatmap:update', handleUpdate);
      socket.emit('activity:leave', userId);
      socket.disconnect();
    };
  }, [userId]);

  return { heatmap, loading, refetch: () => fetchHeatmap(userId) };
};
