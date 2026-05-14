import { useState, useCallback, useRef } from 'react';
import { generateVideo, getVideoStatus, cancelGeneration } from '@integration/videoApi';
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
  /** True after the user clicked Cancel and we are waiting for the server to land the draft */
  isCancelling: boolean;
  /** Toast message shown when a cancellation succeeded (auto-clears) */
  cancelMessage: string | null;
  generate: (payload: GenerateVideoPayload) => Promise<void>;
  cancel:   () => Promise<void>;
  reset: () => void;
}

export function useVideoGeneration(): UseVideoGenerationReturn {
  const { token, user } = useAuth();

  const [step, setStep]                 = useState<GenerationStep>('idle');
  const [progress, setProgress]         = useState<GenerationProgress | null>(null);
  const [video, setVideo]               = useState<VideoData | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const esRef                           = useRef<EventSource | null>(null);
  const currentJobId                    = useRef<string | null>(null);

  const generate = useCallback(async (payload: GenerateVideoPayload) => {
    setError(null);
    setVideo(null);
    setProgress(null);
    setStep('writing_script');

    // Generate a unique job ID for this run
    const jobId = crypto.randomUUID();
    currentJobId.current = jobId;
    setIsCancelling(false);
    setCancelMessage(null);

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
      // Backend may return { cancelled: true, videoId, ... } when the user
      // hit Cancel mid-flight. We treat that as a soft-success.
      if ((result as any)?.cancelled) {
        setIsCancelling(false);
        setCancelMessage('Generation cancelled. Draft saved to library.');
        setStep('idle');
        setProgress(null);
        return;
      }
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
      currentJobId.current = null;
      setIsCancelling(false);
    }
  }, [token, user]);

  // ─── Cancel an in-flight generation ───────────────────────────────────────
  const cancel = useCallback(async () => {
    const jobId = currentJobId.current;
    if (!jobId) return;
    setIsCancelling(true);
    try {
      await cancelGeneration(jobId, token ?? undefined);
      // The /generate request will resolve shortly with { cancelled: true }
      // — the resolution handler above flips back to 'idle' state.
    } catch (err: any) {
      setIsCancelling(false);
      console.warn('Cancel failed:', err.message);
    }
  }, [token]);

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
    isCancelling,
    cancelMessage,
    generate,
    cancel,
    reset,
  };
}
