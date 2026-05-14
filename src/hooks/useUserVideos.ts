import { useState, useCallback, useEffect } from 'react';
import { getUserVideos, deleteVideo } from '@integration/videoApi';
import type { LibraryVideo } from '@integration/types';
import { useAuth } from '../context/AuthContext';

type VideoStatusFilter = 'completed' | 'draft' | 'failed' | 'all';

interface UseUserVideosReturn {
  videos: LibraryVideo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  remove: (videoId: string) => Promise<void>;
}

export function useUserVideos(status: VideoStatusFilter = 'completed'): UseUserVideosReturn {
  const { token } = useAuth();

  const [videos,  setVideos]  = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserVideos(token, 1, 20, status);
      setVideos(data.videos ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [token, status]);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = useCallback(async (videoId: string) => {
    if (!token) return;
    await deleteVideo(videoId, token);
    setVideos(prev => prev.filter(v => v.id !== videoId));
  }, [token]);

  return { videos, loading, error, refresh, remove };
}
