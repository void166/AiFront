import { useState, useCallback, useRef } from 'react';
import { generateVideo, getVideoStatus } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import type { GenerateVideoPayload, VideoData, GenerationStep, GenerationProgress } from '@integration/types';

const API_BASE: string =
  typeof (import.meta as any).env !== 'undefined'
    ? ((import.meta as any).env.VITE_API_URL ?? '')
    : '';

interface UseVideoGenerationReturn {
  step: GenerationStep;
  progress: GenerationProgress | null;
  video: VideoData | null;
  error: string | null;
  isLoading: boolean;
  generate: (payload: GenerateVideoPayload) => Promise<void>;
  reset: () => void;
}

export function useVideoGeneration(): UseVideoGenerationReturn {
  const { token, user } = useAuth();

  const [step, setStep]         = useState<GenerationStep>('idle');
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [video, setVideo]       = useState<VideoData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const esRef                   = useRef<EventSource | null>(null);

  const generate = useCallback(async (payload: GenerateVideoPayload) => {
    setError(null);
    setVideo(null);
    setProgress(null);
    setStep('writing_script');

    // Generate a unique job ID for this run
    const jobId = crypto.randomUUID();

    // Open SSE connection BEFORE the HTTP call so no events are missed
    const es = new EventSource(`${API_BASE}/api/video/progress/${jobId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as GenerationProgress;
        const mappedStep = event.step as GenerationStep;
        setStep(mappedStep);
        setProgress(event);
        if (mappedStep === 'complete' || mappedStep === 'error') {
          es.close();
          esRef.current = null;
        }
      } catch { /* malformed event — ignore */ }
    };

    es.onerror = () => {
      // SSE errors are non-fatal; the HTTP response is the source of truth
      es.close();
      esRef.current = null;
    };

    try {
      const result = await generateVideo(
        { ...payload, userId: user?.id, jobId } as any,
        token ?? undefined,
      );
      setVideo(result);
      setStep('complete');
      setProgress({ step: 'complete', message: 'Видео амжилттай үүслээ!', percent: 100 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setStep('error');
      setProgress({ step: 'error', message });
    } finally {
      esRef.current?.close();
      esRef.current = null;
    }
  }, [token, user]);

  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setStep('idle');
    setVideo(null);
    setError(null);
    setProgress(null);
  }, []);

  return {
    step,
    progress,
    video,
    error,
    isLoading: step !== 'idle' && step !== 'complete' && step !== 'error',
    generate,
    reset,
  };
}
