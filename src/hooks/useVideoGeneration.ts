import { useState, useCallback } from 'react';
import { generateVideo, getVideoStatus } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import type { GenerateVideoPayload, VideoData, GenerationStep } from '@integration/types';

interface UseVideoGenerationReturn {
  step: GenerationStep;
  video: VideoData | null;
  error: string | null;
  isLoading: boolean;
  generate: (payload: GenerateVideoPayload) => Promise<void>;
  reset: () => void;
}

export function useVideoGeneration(): UseVideoGenerationReturn {
  const { token, user } = useAuth();

  const [step, setStep]   = useState<GenerationStep>('idle');
  const [video, setVideo] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (payload: GenerateVideoPayload) => {
    setError(null);
    setVideo(null);
    setStep('writing_script');

    try {
      // Start generation — this is the long-running call.
      // Token is required by the backend auth middleware (Authorization: Bearer <token>).
      // userId is required by the backend controller to persist the video to DB.
      setStep('generating_images');
      const result = await generateVideo(
        { ...payload, userId: user?.id },
        token ?? undefined,
      );
      setVideo(result);
      setStep('complete');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setStep('error');
    }
  }, [token, user]);

  const reset = useCallback(() => {
    setStep('idle');
    setVideo(null);
    setError(null);
  }, []);

  return {
    step,
    video,
    error,
    isLoading: step !== 'idle' && step !== 'complete' && step !== 'error',
    generate,
    reset,
  };
}
