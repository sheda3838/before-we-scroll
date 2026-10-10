"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import type { CommunityStory } from "@/types/communityStory";
import {
  MissionContext,
  createEmptyMissionContext,
} from "@/types/missionContext";
import { Mission } from "@/types/mission";
import {
  FeedbackRating,
  ContextMatchOption,
  InstructionAccuracyOption,
  DifficultyOption,
  CompletedMissionFeedbackSubmission,
} from "@/types/feedback";
import {
  CompletionSubmissionPayload,
  CompletionApiResponse,
} from "@/types/completion";
import { unlockAudio, playNearEndWarningSound, playMissionCompleteSound } from "@/lib/soundEffects";
import {
  ACTIVE_MISSION_STORAGE_KEY,
  StoredActiveMission,
  getWarningThresholdMs,
} from "@/lib/timerUtils";

// Modular UI Components
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConfirmModal } from "@/components/ConfirmModal";
import { HowItWorks } from "@/components/HowItWorks";
import { CommunityStories } from "@/components/CommunityStories";
import { LandingHeroInput } from "@/components/LandingHeroInput";
import { ContextReview } from "@/components/ContextReview";
import { MissionCards } from "@/components/MissionCards";
import { MissionDetail } from "@/components/MissionDetail";
import { ActiveMission } from "@/components/ActiveMission";
import { MissionComplete } from "@/components/MissionComplete";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ThankYou } from "@/components/ThankYou";
import { AlertCircle, X } from "lucide-react";

const SESSION_STORAGE_KEY = "before-we-scroll-session-id";

function rewindAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
  } catch {
    // ignore
  }
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return `session-${Date.now()}`;
  }
}

function subscribeToTouch(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(pointer: coarse)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getTouchSnapshot() {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function getTouchServerSnapshot() {
  return false;
}

export default function Home() {
  // Input State
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const isTouchDevice = useSyncExternalStore(subscribeToTouch, getTouchSnapshot, getTouchServerSnapshot);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedContext, setExtractedContext] = useState<MissionContext | null>(null);

  // Workflow View Sub-state (toggles between review and cards when generated)
  const [currentView, setCurrentView] = useState<"context-review" | "missions">("context-review");

  // Mission Generation State
  const [generatedMissions, setGeneratedMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);
  const [, setMissionGenerationError] = useState<string | null>(null);

  // Active Mission & Timer Execution State
  const [missionStartedAt, setMissionStartedAt] = useState<number | null>(null);
  const [missionExpectedEndAt, setMissionExpectedEndAt] = useState<number | null>(null);
  const [missionCompletedAt, setMissionCompletedAt] = useState<number | null>(null);
  const [missionCompletedEarly, setMissionCompletedEarly] = useState<boolean>(false);
  const [missionRemainingMs, setMissionRemainingMs] = useState<number>(0);
  const [missionCompleted, setMissionCompleted] = useState<boolean>(false);
  const [warningTriggered, setWarningTriggered] = useState<boolean>(false);

  const missionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Recording & Transcription State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Local draft inputs for array fields
  const [featuresDraft, setFeaturesDraft] = useState("");
  const [obstaclesDraft, setObstaclesDraft] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState("");

  // Hidden File Inputs Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Feedback State
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating | null>(5);
  const [feedbackContextMatch, setFeedbackContextMatch] = useState<ContextMatchOption | null>(null);
  const [feedbackInstructionsAccurate, setFeedbackInstructionsAccurate] = useState<InstructionAccuracyOption | null>(null);
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<DifficultyOption | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackPhoto, setFeedbackPhoto] = useState<File | null>(null);
  const [feedbackPhotoPreviewUrl, setFeedbackPhotoPreviewUrl] = useState<string | null>(null);
  const [feedbackPhotoError, setFeedbackPhotoError] = useState<string | null>(null);
  const [shareFeedbackPublicly, setShareFeedbackPublicly] = useState(true);
  const [sharePhotoPublicly, setSharePhotoPublicly] = useState(false);
  const [feedbackValidationError, setFeedbackValidationError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<CompletedMissionFeedbackSubmission | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [savedCompletionId, setSavedCompletionId] = useState<string | null>(null);

  const feedbackCameraInputRef = useRef<HTMLInputElement>(null);
  const feedbackGalleryInputRef = useRef<HTMLInputElement>(null);

  // Community "Before We Scroll" Section State
  const [communityStories, setCommunityStories] = useState<CommunityStory[] | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState(false);

  // ElevenLabs TTS Narration State
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [generatingSpeechMode, setGeneratingSpeechMode] = useState<"full" | "steps" | null>(null);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [activeSpeechMode, setActiveSpeechMode] = useState<"full" | "steps" | null>(null);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [stepsAudioUrl, setStepsAudioUrl] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const fullAudioRef = useRef<HTMLAudioElement | null>(null);
  const fullAudioUrlRef = useRef<string | null>(null);
  const fullAudioMissionIdRef = useRef<string | null>(null);

  const stepsAudioRef = useRef<HTMLAudioElement | null>(null);
  const stepsAudioUrlRef = useRef<string | null>(null);
  const stepsAudioMissionIdRef = useRef<string | null>(null);

  // Reusable Confirmation Modal State (replaces native window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Fetch public community completions once on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/completions")
      .then((res) => {
        if (!res.ok) throw new Error("non-ok");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const items = Array.isArray(data?.stories)
            ? data.stories
            : Array.isArray(data?.beforeWeScrolls)
            ? data.beforeWeScrolls
            : [];
          setCommunityStories(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCommunityError(true);
          setCommunityStories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fullAudioUrlRef.current = fullAudioUrl;
  }, [fullAudioUrl]);

  useEffect(() => {
    stepsAudioUrlRef.current = stepsAudioUrl;
  }, [stepsAudioUrl]);

  // Restore active mission from localStorage (survives browser refresh)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY);
        if (!raw) return;
        const data: StoredActiveMission = JSON.parse(raw);
        if (data?.mission && typeof data.startedAt === "number" && typeof data.expectedEndAt === "number") {
          setSelectedMission(data.mission);
          setMissionStartedAt(data.startedAt);
          setMissionExpectedEndAt(data.expectedEndAt);

          const now = Date.now();
          if (data.expectedEndAt > now) {
            setMissionRemainingMs(data.expectedEndAt - now);
            setMissionCompleted(false);
            setWarningTriggered(Boolean(data.warningTriggered));
          } else {
            setMissionRemainingMs(0);
            setMissionCompleted(true);
            setMissionCompletedAt(data.completedAt || data.expectedEndAt);
            setMissionCompletedEarly(Boolean(data.completedEarly));
            try {
              localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        try {
          localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Real-time countdown timer & tab wake-up synchronization
  useEffect(() => {
    if (!missionStartedAt || !missionExpectedEndAt || missionCompleted) {
      if (missionIntervalRef.current) {
        clearInterval(missionIntervalRef.current);
        missionIntervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, missionExpectedEndAt - now);
      setMissionRemainingMs(remaining);

      // Warning threshold check
      if (selectedMission) {
        const threshold = getWarningThresholdMs(selectedMission.durationMinutes);
        if (remaining <= threshold && remaining > 0 && !warningTriggered) {
          setWarningTriggered(true);
          playNearEndWarningSound();

          try {
            const raw = localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY);
            if (raw) {
              const data: StoredActiveMission = JSON.parse(raw);
              data.warningTriggered = true;
              localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, JSON.stringify(data));
            }
          } catch {
            // ignore
          }
        }
      }

      // Completion check at 00:00
      if (remaining <= 0) {
        if (missionIntervalRef.current) {
          clearInterval(missionIntervalRef.current);
          missionIntervalRef.current = null;
        }

        if (fullAudioRef.current) {
          fullAudioRef.current.pause();
          rewindAudio(fullAudioRef.current);
        }
        if (stepsAudioRef.current) {
          stepsAudioRef.current.pause();
          rewindAudio(stepsAudioRef.current);
        }
        setIsPlayingSpeech(false);
        setIsSpeechPaused(false);

        setMissionRemainingMs(0);
        setMissionCompleted(true);
        setMissionCompletedAt(Date.now());
        setMissionCompletedEarly(false);
        try {
          localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
        } catch {
          // ignore
        }
        playMissionCompleteSound();
      }
    };

    tick();
    missionIntervalRef.current = setInterval(tick, 250);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (missionIntervalRef.current) {
        clearInterval(missionIntervalRef.current);
        missionIntervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [missionStartedAt, missionExpectedEndAt, missionCompleted, selectedMission, warningTriggered]);

  const resetSpeechAudio = useCallback(() => {
    if (fullAudioRef.current) {
      fullAudioRef.current.pause();
      fullAudioRef.current.removeAttribute("src");
      fullAudioRef.current.load();
      fullAudioRef.current = null;
    }
    if (fullAudioUrlRef.current) {
      URL.revokeObjectURL(fullAudioUrlRef.current);
      fullAudioUrlRef.current = null;
    }
    fullAudioMissionIdRef.current = null;
    setFullAudioUrl(null);

    if (stepsAudioRef.current) {
      stepsAudioRef.current.pause();
      stepsAudioRef.current.removeAttribute("src");
      stepsAudioRef.current.load();
      stepsAudioRef.current = null;
    }
    if (stepsAudioUrlRef.current) {
      URL.revokeObjectURL(stepsAudioUrlRef.current);
      stepsAudioUrlRef.current = null;
    }
    stepsAudioMissionIdRef.current = null;
    setStepsAudioUrl(null);

    setIsGeneratingSpeech(false);
    setGeneratingSpeechMode(null);
    setIsPlayingSpeech(false);
    setIsSpeechPaused(false);
    setActiveSpeechMode(null);
    setSpeechError(null);
  }, []);

  // Audio event listeners
  const setupAudioListeners = useCallback((audio: HTMLAudioElement, mode: "full" | "steps") => {
    audio.onended = () => {
      setIsPlayingSpeech(false);
      setIsSpeechPaused(false);
      setActiveSpeechMode(mode);
    };
    audio.onerror = () => {
      setIsPlayingSpeech(false);
      setIsSpeechPaused(false);
      setSpeechError("We couldn't play the narration. You can still read the steps below.");
    };
    audio.onpause = () => {
      if (audio.currentTime > 0 && !audio.ended) {
        setIsSpeechPaused(true);
      }
    };
    audio.onplay = () => {
      setIsPlayingSpeech(true);
      setIsSpeechPaused(false);
      setActiveSpeechMode(mode);
    };
  }, []);

  const playAudioSafely = useCallback(
    async (audio: HTMLAudioElement, mode: "full" | "steps", errorFallback: string) => {
      try {
        setActiveSpeechMode(mode);
        setIsSpeechPaused(false);
        setIsPlayingSpeech(true);
        await audio.play();
      } catch (err: unknown) {
        setIsPlayingSpeech(false);
        setIsSpeechPaused(false);
        const name = err instanceof Error ? err.name : "";
        if (name === "NotAllowedError") {
          setSpeechError("Tap play to listen to audio narration.");
        } else {
          setSpeechError(errorFallback);
        }
      }
    },
    []
  );

  const handlePlayNarration = async (mode: "full" | "steps") => {
    if (!selectedMission) return;
    setSpeechError(null);

    const otherMode = mode === "full" ? "steps" : "full";
    const otherAudio = otherMode === "full" ? fullAudioRef.current : stepsAudioRef.current;
    if (otherAudio) {
      otherAudio.pause();
    }

    const audioRef = mode === "full" ? fullAudioRef : stepsAudioRef;
    const urlRef = mode === "full" ? fullAudioUrlRef : stepsAudioUrlRef;
    const missionIdRef = mode === "full" ? fullAudioMissionIdRef : stepsAudioMissionIdRef;

    if (urlRef.current && missionIdRef.current === selectedMission.id) {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio(urlRef.current);
        setupAudioListeners(audio, mode);
        audioRef.current = audio;
      }

      if (isPlayingSpeech && activeSpeechMode === mode) {
        audio.pause();
        setIsSpeechPaused(true);
        return;
      }

      if (isSpeechPaused && activeSpeechMode === mode) {
        await playAudioSafely(audio, mode, "Unable to resume narration.");
        return;
      }

      rewindAudio(audio);
      await playAudioSafely(audio, mode, "Unable to play narration audio.");
      return;
    }

    setIsGeneratingSpeech(true);
    setGeneratingSpeechMode(mode);
    let audioBlob: Blob;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission: selectedMission, mode }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Unable to prepare narration.");
      }

      audioBlob = await res.blob();
    } catch {
      setSpeechError("We couldn't prepare the narration right now. You can still read the mission steps below.");
      setIsGeneratingSpeech(false);
      setGeneratingSpeechMode(null);
      return;
    }

    try {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      const newUrl = URL.createObjectURL(audioBlob);
      urlRef.current = newUrl;
      missionIdRef.current = selectedMission.id;

      if (mode === "full") {
        setFullAudioUrl(newUrl);
      } else {
        setStepsAudioUrl(newUrl);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      const audio = new Audio(newUrl);
      setupAudioListeners(audio, mode);
      audioRef.current = audio;

      await playAudioSafely(audio, mode, "Unable to play audio narration.");
    } catch {
      setSpeechError("Audio playback failed. You can still read the steps below.");
    } finally {
      setIsGeneratingSpeech(false);
      setGeneratingSpeechMode(null);
    }
  };

  const handleStopNarration = () => {
    const currentAudio = activeSpeechMode === "steps" ? stepsAudioRef.current : fullAudioRef.current;
    if (currentAudio) {
      currentAudio.pause();
      rewindAudio(currentAudio);
    }
    setIsPlayingSpeech(false);
    setIsSpeechPaused(false);
  };

  const resetFeedbackState = () => {
    setIsFeedbackOpen(false);
    setFeedbackRating(5);
    setFeedbackContextMatch(null);
    setFeedbackInstructionsAccurate(null);
    setFeedbackDifficulty(null);
    setFeedbackComment("");
    if (feedbackPhotoPreviewUrl) {
      URL.revokeObjectURL(feedbackPhotoPreviewUrl);
    }
    setFeedbackPhoto(null);
    setFeedbackPhotoPreviewUrl(null);
    setFeedbackPhotoError(null);
    setShareFeedbackPublicly(true);
    setSharePhotoPublicly(false);
    setFeedbackValidationError(null);
    setFeedbackSubmitted(false);
    setSubmittedFeedback(null);
    setIsSavingFeedback(false);
    setSavedCompletionId(null);
  };

  const handleFeedbackPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedbackPhotoError(null);
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setFeedbackPhotoError("Please choose a valid JPEG, PNG, or WebP photo.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedbackPhotoError("This photo is larger than 10MB. Please choose a smaller file.");
      e.target.value = "";
      return;
    }

    if (feedbackPhotoPreviewUrl) {
      URL.revokeObjectURL(feedbackPhotoPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setFeedbackPhoto(file);
    setFeedbackPhotoPreviewUrl(preview);
    e.target.value = "";
  };

  const handleRemoveFeedbackPhoto = () => {
    if (feedbackPhotoPreviewUrl) {
      URL.revokeObjectURL(feedbackPhotoPreviewUrl);
    }
    setFeedbackPhoto(null);
    setFeedbackPhotoPreviewUrl(null);
    setFeedbackPhotoError(null);
    setSharePhotoPublicly(false);
  };

  const handleToggleShareFeedback = (checked: boolean) => {
    setShareFeedbackPublicly(checked);
    if (!checked) {
      setSharePhotoPublicly(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackValidationError(null);

    if (!feedbackRating) {
      setFeedbackValidationError("Please select an overall rating (1 to 5 stars).");
      return;
    }

    if (!selectedMission) return;

    setIsSavingFeedback(true);

    try {
      const sessionId = getOrCreateSessionId();
      const startedIso = new Date(
        missionStartedAt || Date.now() - selectedMission.durationMinutes * 60 * 1000
      ).toISOString();
      const expectedIso = new Date(
        missionExpectedEndAt || Date.now()
      ).toISOString();
      const completedIso = new Date(
        missionCompletedAt || Date.now()
      ).toISOString();

      const payload: CompletionSubmissionPayload = {
        sessionId,
        context: extractedContext || createEmptyMissionContext(),
        mission: selectedMission,
        execution: {
          startedAt: startedIso,
          expectedEndAt: expectedIso,
          completedAt: completedIso,
          completedEarly: missionCompletedEarly,
        },
        feedback: {
          rating: feedbackRating,
          contextMatch: feedbackContextMatch,
          instructionsAccurate: feedbackInstructionsAccurate,
          difficulty: feedbackDifficulty,
          comment: feedbackComment.trim(),
          shareFeedbackPublicly,
          sharePhotoPublicly: shareFeedbackPublicly ? sharePhotoPublicly : false,
        },
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (feedbackPhoto) {
        formData.append("photo", feedbackPhoto);
      }

      const res = await fetch("/api/completions", {
        method: "POST",
        body: formData,
      });

      const data: CompletionApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to save completion.");
      }

      setSavedCompletionId(data.completionId || null);

      const submission: CompletedMissionFeedbackSubmission = {
        mission: {
          id: selectedMission.id,
          title: selectedMission.title,
          shortDescription: selectedMission.shortDescription,
          durationMinutes: selectedMission.durationMinutes,
          intensity: selectedMission.intensity,
          players: selectedMission.players,
        },
        feedback: {
          rating: feedbackRating,
          contextMatch: feedbackContextMatch,
          instructionsAccurate: feedbackInstructionsAccurate,
          difficulty: feedbackDifficulty,
          comment: feedbackComment.trim(),
          shareFeedbackPublicly,
          sharePhotoPublicly: shareFeedbackPublicly ? sharePhotoPublicly : false,
        },
        completionPhoto: feedbackPhoto,
        completedAt: completedIso,
      };

      setSubmittedFeedback(submission);
      setFeedbackSubmitted(true);
    } catch {
      setFeedbackValidationError("We couldn't save your feedback right now. Please try again.");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleStartMission = () => {
    if (!selectedMission) return;
    if (fullAudioRef.current && isPlayingSpeech) {
      fullAudioRef.current.pause();
      setIsPlayingSpeech(false);
      setIsSpeechPaused(false);
    }
    resetFeedbackState();
    unlockAudio();
    const now = Date.now();
    const end = now + selectedMission.durationMinutes * 60 * 1000;

    setMissionStartedAt(now);
    setMissionExpectedEndAt(end);
    setMissionRemainingMs(end - now);
    setMissionCompleted(false);
    setMissionCompletedAt(null);
    setMissionCompletedEarly(false);
    setWarningTriggered(false);

    try {
      const payload: StoredActiveMission = {
        mission: selectedMission,
        startedAt: now,
        expectedEndAt: end,
        warningTriggered: false,
      };
      localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const finishMissionNow = (isEarly: boolean) => {
    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
    }

    if (fullAudioRef.current) {
      fullAudioRef.current.pause();
      rewindAudio(fullAudioRef.current);
    }
    if (stepsAudioRef.current) {
      stepsAudioRef.current.pause();
      rewindAudio(stepsAudioRef.current);
    }
    setIsPlayingSpeech(false);
    setIsSpeechPaused(false);

    const now = Date.now();
    setMissionRemainingMs(0);
    setMissionCompleted(true);
    setMissionCompletedAt(now);
    setMissionCompletedEarly(isEarly);
    try {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    playMissionCompleteSound();
  };

  const handleRequestFinishEarly = () => {
    if (!missionStartedAt || missionCompleted) return;
    setConfirmModal({
      isOpen: true,
      title: "Finish Mission Early?",
      message: "You still have time remaining on your timer. Are you sure you want to finish now?",
      confirmLabel: "Finish Mission",
      cancelLabel: "Keep Going",
      isDestructive: false,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        finishMissionNow(true);
      },
    });
  };

  const handleStopActiveMission = () => {
    setConfirmModal({
      isOpen: true,
      title: "Stop Active Mission?",
      message: "A mission is currently active. Are you sure you want to stop and return to the home screen?",
      confirmLabel: "Stop Mission",
      cancelLabel: "Continue Mission",
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        handleResetAllToHome();
      },
    });
  };

  // Full clean reset to Home state
  const handleResetAllToHome = () => {
    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
    }
    resetSpeechAudio();
    resetFeedbackState();
    setInputText("");
    handleRemoveImage();
    setExtractedContext(null);
    setGeneratedMissions([]);
    setSelectedMission(null);
    setMissionStartedAt(null);
    setMissionExpectedEndAt(null);
    setMissionCompletedAt(null);
    setMissionCompletedEarly(false);
    setMissionRemainingMs(0);
    setMissionCompleted(false);
    setWarningTriggered(false);
    setCurrentView("context-review");
    try {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleGenerateMissions = async () => {
    if (!extractedContext || isGeneratingMissions) return;

    setIsGeneratingMissions(true);
    setMissionGenerationError(null);

    try {
      const res = await fetch("/api/mission/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: extractedContext }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.missions) || data.missions.length !== 3) {
        setMissionGenerationError(
          data.error || "We couldn't create your missions this time. Please try again."
        );
        return;
      }

      setGeneratedMissions(data.missions as Mission[]);
      setSelectedMission(null);
      setCurrentView("missions");
    } catch {
      setMissionGenerationError("We couldn't create your missions this time. Please try again.");
    } finally {
      setIsGeneratingMissions(false);
    }
  };

  const handleTranscribe = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setMicError(null);

    try {
      let ext = "webm";
      if (mimeType.includes("mp4") || mimeType.includes("m4a")) ext = "mp4";
      else if (mimeType.includes("ogg")) ext = "ogg";
      else if (mimeType.includes("wav")) ext = "wav";
      else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) ext = "mp3";

      const formData = new FormData();
      formData.append("audio", audioBlob, `speech.${ext}`);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMicError(data.error || "Unable to transcribe audio.");
        return;
      }

      const transcript = typeof data.text === "string" ? data.text.trim() : "";
      if (!transcript) {
        setMicError("No speech detected. Please try again or type your request.");
        return;
      }

      setInputText((prev) => {
        const current = prev.trim();
        if (!current) return transcript;
        return `${current} ${transcript}`;
      });

      setExtractedContext(null);
      setError(null);
      setFeaturesDraft("");
      setObstaclesDraft("");
      setEquipmentDraft("");
    } catch {
      setMicError("Unable to transcribe audio. Please check your connection and try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setMicError(null);
    chunksRef.current = [];
    setRecordingDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/wav",
      ].find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > 0) {
          await handleTranscribe(audioBlob, mediaRecorder.mimeType || "audio/webm");
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setIsRecording(false);
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Microphone access was denied. Please allow microphone permissions in your browser.");
      } else {
        setMicError("Could not access microphone. Please check your browser settings.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setFileError("Please choose a valid JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileError("Image is larger than 10MB. Please choose a smaller file.");
      e.target.value = "";
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(preview);
    setExtractedContext(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setFileError(null);
    setExtractedContext(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setLoading(true);
    setError(null);
    setExtractedContext(null);

    try {
      const formData = new FormData();
      if (inputText.trim()) {
        formData.append("text", inputText.trim());
      }
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      const res = await fetch("/api/context/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Unable to understand surroundings. Please try again.");
      } else {
        const ctx = data.context as MissionContext;
        setExtractedContext(ctx);
        setFeaturesDraft(ctx.environment.features.join(", "));
        setObstaclesDraft(ctx.environment.obstacles.join(", "));
        setEquipmentDraft(ctx.equipmentAvailable.join(", "));
        setCurrentView("context-review");
      }
    } catch {
      setError("Unable to connect. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof MissionContext>(key: K, val: MissionContext[K]) => {
    if (!extractedContext) return;
    setExtractedContext({ ...extractedContext, [key]: val });
  };

  const updateEnvironment = <K extends keyof MissionContext["environment"]>(
    key: K,
    val: MissionContext["environment"][K]
  ) => {
    if (!extractedContext) return;
    setExtractedContext({
      ...extractedContext,
      environment: { ...extractedContext.environment, [key]: val },
    });
  };

  const updateConstraints = <K extends keyof MissionContext["constraints"]>(
    key: K,
    val: MissionContext["constraints"][K]
  ) => {
    if (!extractedContext) return;
    setExtractedContext({
      ...extractedContext,
      constraints: { ...extractedContext.constraints, [key]: val },
    });
  };

  const removeFeature = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.features.filter((_, i) => i !== idx);
    updateEnvironment("features", next);
    setFeaturesDraft(next.join(", "));
  };

  const removeObstacle = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.obstacles.filter((_, i) => i !== idx);
    updateEnvironment("obstacles", next);
    setObstaclesDraft(next.join(", "));
  };

  const removeEquipment = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.equipmentAvailable.filter((_, i) => i !== idx);
    updateField("equipmentAvailable", next);
    setEquipmentDraft(next.join(", "));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Determine current screen stage
  let currentStage:
    | "home"
    | "context-review"
    | "missions"
    | "mission-detail"
    | "active-mission"
    | "mission-complete"
    | "feedback"
    | "thank-you" = "home";

  if (missionStartedAt && !missionCompleted) {
    currentStage = "active-mission";
  } else if (missionCompleted) {
    if (feedbackSubmitted) {
      currentStage = "thank-you";
    } else if (isFeedbackOpen) {
      currentStage = "feedback";
    } else {
      currentStage = "mission-complete";
    }
  } else if (selectedMission) {
    currentStage = "mission-detail";
  } else if (generatedMissions.length === 3 && currentView === "missions") {
    currentStage = "missions";
  } else if (extractedContext) {
    currentStage = "context-review";
  } else {
    currentStage = "home";
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f2] dark:bg-[#09120d] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Hidden File Inputs for Standard Camera & Gallery Browsing */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        id="camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        id="gallery-input"
      />

      {/* Hidden File Inputs for Completion Photo */}
      <input
        ref={feedbackCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFeedbackPhotoSelect}
        className="hidden"
        id="feedback-camera-input"
      />
      <input
        ref={feedbackGalleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFeedbackPhotoSelect}
        className="hidden"
        id="feedback-gallery-input"
      />

      {/* Global Minimal Header */}
      <Header
        onLogoClick={() => {
          if (missionStartedAt && !missionCompleted) {
            handleStopActiveMission();
          } else {
            handleResetAllToHome();
          }
        }}
        subtitle={
          currentStage === "active-mission"
            ? "Mission in Progress"
            : currentStage === "context-review"
            ? "Context Review"
            : currentStage === "missions"
            ? "Choose Mission"
            : undefined
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-2xl lg:max-w-4xl space-y-8">
          {/* Global general error message banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs sm:text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                className="text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. STAGE: HOME */}
          {currentStage === "home" && (
            <>
              <LandingHeroInput
                inputText={inputText}
                setInputText={setInputText}
                selectedImage={selectedImage}
                imagePreviewUrl={imagePreviewUrl}
                fileError={fileError}
                loading={loading}
                isRecording={isRecording}
                isTranscribing={isTranscribing}
                recordingDuration={recordingDuration}
                speechError={micError}
                isTouchDevice={isTouchDevice}
                cameraInputRef={cameraInputRef}
                galleryInputRef={galleryInputRef}
                startRecording={startRecording}
                stopRecording={stopRecording}
                handleRemoveImage={handleRemoveImage}
                onSubmit={handleAnalyze}
                formatTimer={formatTimer}
              />
              <HowItWorks />
              <CommunityStories
                stories={communityStories}
                loading={communityLoading}
                error={communityError}
              />
            </>
          )}

          {/* 2. STAGE: CONTEXT REVIEW */}
          {currentStage === "context-review" && extractedContext && (
            <ContextReview
              context={extractedContext}
              featuresDraft={featuresDraft}
              obstaclesDraft={obstaclesDraft}
              equipmentDraft={equipmentDraft}
              isGeneratingMissions={isGeneratingMissions}
              onUpdateField={updateField}
              onUpdateEnvironment={updateEnvironment}
              onUpdateConstraints={updateConstraints}
              onFeaturesDraftChange={(val) => {
                setFeaturesDraft(val);
                updateEnvironment(
                  "features",
                  val.split(",").map((s) => s.trim()).filter(Boolean)
                );
              }}
              onObstaclesDraftChange={(val) => {
                setObstaclesDraft(val);
                updateEnvironment(
                  "obstacles",
                  val.split(",").map((s) => s.trim()).filter(Boolean)
                );
              }}
              onEquipmentDraftChange={(val) => {
                setEquipmentDraft(val);
                updateField(
                  "equipmentAvailable",
                  val.split(",").map((s) => s.trim()).filter(Boolean)
                );
              }}
              onRemoveFeature={removeFeature}
              onRemoveObstacle={removeObstacle}
              onRemoveEquipment={removeEquipment}
              onBackToHome={handleResetAllToHome}
              onGenerateMissions={handleGenerateMissions}
            />
          )}

          {/* 3. STAGE: MISSIONS */}
          {currentStage === "missions" && (
            <MissionCards
              missions={generatedMissions}
              isGeneratingMissions={isGeneratingMissions}
              onSelectMission={(m) => setSelectedMission(m)}
              onAdjustDetails={() => setCurrentView("context-review")}
              onRegenerate={handleGenerateMissions}
            />
          )}

          {/* 4. STAGE: MISSION DETAIL */}
          {currentStage === "mission-detail" && selectedMission && (
            <MissionDetail
              mission={selectedMission}
              isGeneratingSpeech={isGeneratingSpeech}
              generatingSpeechMode={generatingSpeechMode}
              isPlayingSpeech={isPlayingSpeech}
              isSpeechPaused={isSpeechPaused}
              activeSpeechMode={activeSpeechMode}
              speechError={speechError}
              onBackToMissions={() => setSelectedMission(null)}
              onToggleSpeech={handlePlayNarration}
              onStopSpeech={handleStopNarration}
              onStartMission={handleStartMission}
            />
          )}

          {/* 5. STAGE: ACTIVE MISSION */}
          {currentStage === "active-mission" && selectedMission && (
            <ActiveMission
              mission={selectedMission}
              remainingMs={missionRemainingMs}
              warningTriggered={warningTriggered}
              isGeneratingSpeech={isGeneratingSpeech}
              generatingSpeechMode={generatingSpeechMode}
              isPlayingSpeech={isPlayingSpeech}
              isSpeechPaused={isSpeechPaused}
              activeSpeechMode={activeSpeechMode}
              onToggleSpeech={handlePlayNarration}
              onStopSpeech={handleStopNarration}
              onRequestFinishEarly={handleRequestFinishEarly}
            />
          )}

          {/* 6. STAGE: MISSION COMPLETE */}
          {currentStage === "mission-complete" && selectedMission && (
            <MissionComplete
              mission={selectedMission}
              completedEarly={missionCompletedEarly}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
              onSkipAndGoHome={handleResetAllToHome}
            />
          )}

          {/* 7. STAGE: FEEDBACK FORM */}
          {currentStage === "feedback" && selectedMission && (
            <FeedbackForm
              missionTitle={selectedMission.title}
              feedbackRating={feedbackRating}
              feedbackContextMatch={feedbackContextMatch}
              feedbackInstructionsAccurate={feedbackInstructionsAccurate}
              feedbackDifficulty={feedbackDifficulty}
              feedbackComment={feedbackComment}
              feedbackPhoto={feedbackPhoto}
              feedbackPhotoPreviewUrl={feedbackPhotoPreviewUrl}
              feedbackPhotoError={feedbackPhotoError}
              shareFeedbackPublicly={shareFeedbackPublicly}
              sharePhotoPublicly={sharePhotoPublicly}
              feedbackValidationError={feedbackValidationError}
              isSavingFeedback={isSavingFeedback}
              isTouchDevice={isTouchDevice}
              feedbackCameraInputRef={feedbackCameraInputRef}
              feedbackGalleryInputRef={feedbackGalleryInputRef}
              onRatingChange={setFeedbackRating}
              onContextMatchChange={setFeedbackContextMatch}
              onInstructionsAccurateChange={setFeedbackInstructionsAccurate}
              onDifficultyChange={setFeedbackDifficulty}
              onCommentChange={setFeedbackComment}
              onRemovePhoto={handleRemoveFeedbackPhoto}
              onToggleShareFeedback={handleToggleShareFeedback}
              onToggleSharePhoto={setSharePhotoPublicly}
              onCancel={() => setIsFeedbackOpen(false)}
              onSubmit={handleSubmitFeedback}
            />
          )}

          {/* 8. STAGE: THANK YOU */}
          {currentStage === "thank-you" && (
            <ThankYou
              submission={submittedFeedback}
              savedCompletionId={savedCompletionId}
              onResetToHome={handleResetAllToHome}
            />
          )}
        </div>
      </main>

      {/* Global Minimal Footer */}
      <Footer />

      {/* Branded Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
