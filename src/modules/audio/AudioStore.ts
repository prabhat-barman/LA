/**
 * AudioStore — Shared Singleton Audio Manager (Nitro-Powered)
 *
 * Built on react-native-nitro-sound.
 * Coordinates play/pause/stop across the entire app so that only one audio plays at a time.
 */

import Sound from 'react-native-nitro-sound';

export interface AudioState {
  id: string | null;
  url: string | null;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
}

export type AudioListener = (state: AudioState) => void;
export type DurationListener = (url: string, duration: number) => void;
export type ProgressListener = (id: string | null, position: number, duration: number) => void;

class AudioStore {
  private currentId: string | null = null;
  private currentUrl: string | null = null;
  private currentPlaying: boolean = false;
  private currentLoading: boolean = false;
  private currentPosition: number = 0;
  private currentDuration: number = 0;

  // Subscriber sets
  private listeners: Set<AudioListener> = new Set();
  private durationListeners: Set<DurationListener> = new Set();
  private progressListeners: Set<ProgressListener> = new Set();

  // Duration cache: url → duration (seconds)
  private durationCache: Map<string, number> = new Map();

  // Lock mechanism during operations
  private isLocked: boolean = false;
  private lockTimer: ReturnType<typeof setTimeout> | null = null;

  getCurrentState(): AudioState {
    return {
      id: this.currentId,
      url: this.currentUrl,
      playing: this.currentPlaying,
      loading: this.currentLoading,
      position: this.currentPosition,
      duration: this.currentDuration,
    };
  }

  emit(state: Partial<AudioState>) {
    if (state.id !== undefined) {
      if (this.currentId !== state.id) {
        // Reset flags when switching IDs to avoid state contamination
        this.currentPlaying = false;
        this.currentLoading = false;
        this.currentPosition = 0;
        this.currentDuration = 0;
      }
      this.currentId = state.id;
    }
    if (state.url !== undefined) this.currentUrl = state.url;
    if (state.playing !== undefined) this.currentPlaying = state.playing;
    if (state.loading !== undefined) this.currentLoading = state.loading;
    if (state.position !== undefined) this.currentPosition = state.position;
    if (state.duration !== undefined) this.currentDuration = state.duration;

    const fullState = this.getCurrentState();
    this.listeners.forEach((fn) => fn(fullState));
  }

  subscribe(fn: AudioListener): () => void {
    this.listeners.add(fn);
    // Immediately emit current state to new subscriber
    fn(this.getCurrentState());
    return () => {
      this.listeners.delete(fn);
    };
  }

  cacheDuration(url: string | null, duration: number) {
    if (url && duration > 0) {
      this.durationCache.set(url, duration);
      this.durationListeners.forEach((fn) => fn(url, duration));
    }
  }

  getCachedDuration(url: string | null): number {
    if (!url) return 0;
    return this.durationCache.get(url) || 0;
  }

  subscribeToDuration(fn: DurationListener): () => void {
    this.durationListeners.add(fn);
    return () => {
      this.durationListeners.delete(fn);
    };
  }

  clearDurationCache() {
    this.durationCache.clear();
  }

  updateProgress(id: string | null, position: number, duration: number) {
    if (this.currentId !== id) return;
    this.currentPosition = position;
    if (duration > 0) {
      this.currentDuration = duration;
      this.cacheDuration(this.currentUrl, duration);
    }
    this.progressListeners.forEach((fn) => fn(id, position, duration));
  }

  subscribeToProgress(fn: ProgressListener): () => void {
    this.progressListeners.add(fn);
    return () => {
      this.progressListeners.delete(fn);
    };
  }

  // ─────────────────────────────────────────────
  //  Playback Controls (Nitro Integration)
  // ─────────────────────────────────────────────

  async play(id: string, url: string) {
    if (this.isLocked) return;
    const isSameTrack = this.currentId === id && this.currentUrl === url;

    if (isSameTrack && this.currentPlaying) {
      return;
    }

    try {
      this.isLocked = true;

      // Stop previous track if different
      if (!isSameTrack) {
        await Sound.stopPlayer().catch(() => {});
        try {
          Sound.removePlayBackListener();
          Sound.removePlaybackEndListener();
        } catch (_) {}
        this.currentPosition = 0;
        this.currentDuration = this.getCachedDuration(url);
      }

      this.emit({
        id,
        url,
        playing: true,
        loading: !isSameTrack,
      });

      // Start player via react-native-nitro-sound
      await Sound.startPlayer(url);

      this.emit({
        loading: false,
        playing: true,
      });

      // Add progress listener
      Sound.addPlayBackListener((e) => {
        const posSec = (e.currentPosition || 0) / 1000;
        const durSec = (e.duration || 0) / 1000;
        this.updateProgress(id, posSec, durSec);
      });

      // Add end listener
      Sound.addPlaybackEndListener((e) => {
        this.onEnded(id);
      });

    } catch (error) {
      console.warn("AudioStore play failed:", error);
      this.onError(id, error);
    } finally {
      this.isLocked = false;
    }
  }

  async pause() {
    if (this.isLocked) return;
    try {
      await Sound.pausePlayer();
      this.emit({ playing: false, loading: false });
    } catch (e) {
      console.warn("AudioStore pause failed:", e);
    }
  }

  async resume() {
    if (this.isLocked) return;
    try {
      await Sound.resumePlayer();
      this.emit({ playing: true, loading: false });
    } catch (e) {
      console.warn("AudioStore resume failed:", e);
    }
  }

  async stop() {
    try {
      await Sound.stopPlayer();
      try {
        Sound.removePlayBackListener();
        Sound.removePlaybackEndListener();
      } catch (_) {}
      this.emit({ playing: false, loading: false, position: 0 });
    } catch (e) {
      console.warn("AudioStore stop failed:", e);
    }
  }

  seekTo(seconds: number) {
    Sound.seekToPlayer(seconds * 1000).catch((e) => {
      console.warn("AudioStore seekTo failed:", e);
    });
    this.currentPosition = seconds;
    this.emit({ position: seconds });
  }

  onLoad(id: string, duration: number) {
    if (this.currentId !== id) return;
    this.cacheDuration(this.currentUrl, duration);
    this.emit({ duration, loading: false });
  }

  onEnded(id: string) {
    if (this.currentId !== id) return;
    this.seekTo(0);
    this.emit({ playing: false, loading: false, position: 0 });
  }

  onError(id: string, error: any) {
    if (this.currentId !== id) return;
    this.emit({ playing: false, loading: false });
  }

  load(id: string, url: string): Promise<void> {
    if (this.isLocked) return Promise.resolve();
    const isSameTrack = this.currentUrl === url && url !== null;

    if (isSameTrack) {
      this.emit({
        id,
        url,
        playing: false,
        loading: false,
        position: 0,
        duration: this.getCachedDuration(url),
      });
    } else {
      this.emit({ id, url, playing: false, loading: true });
      this.currentPosition = 0;
      this.currentDuration = this.getCachedDuration(url);
      
      // Let native player prepare the audio file
      Sound.startPlayer(url)
        .then(() => {
          Sound.stopPlayer().catch(() => {});
          this.emit({ loading: false });
        })
        .catch(() => {
          this.emit({ loading: false });
        });
    }
    return Promise.resolve();
  }

  async forceReset() {
    this.isLocked = true;
    if (this.lockTimer) clearTimeout(this.lockTimer);

    this.currentId = null;
    this.currentUrl = null;
    this.currentPlaying = false;
    this.currentLoading = false;
    this.currentPosition = 0;
    this.currentDuration = 0;

    await this.stop().catch(() => {});

    this.listeners.forEach((fn) =>
      fn({ id: null, url: null, playing: false, loading: false, position: 0, duration: 0 }),
    );

    this.lockTimer = setTimeout(() => {
      this.isLocked = false;
    }, 500);
  }

  // ─────────────────────────────────────────────
  //  Recorder State Logic
  // ─────────────────────────────────────────────
  recorderState = {
    phase: 'idle',
    recordingTimeMs: 0,
    countdown: 0,
  };

  updateRecorderState(state: any) {
    this.recorderState = { ...this.recorderState, ...state };
  }

  resetRecorderState() {
    this.recorderState = {
      phase: 'idle',
      recordingTimeMs: 0,
      countdown: 0,
    };
  }
}

export default new AudioStore();
