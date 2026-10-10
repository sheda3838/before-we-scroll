"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import {
  MissionContext,
  IntensityLevel,
  SpaceSize,
} from "@/types/missionContext";
import { Mission } from "@/types/mission";
import {
  FeedbackRating,
  ContextMatchOption,
  InstructionAccuracyOption,
  DifficultyOption,
  CompletedMissionFeedbackSubmission,
} from "@/types/feedback";
import { unlockAudio, playNearEndWarningSound, playMissionCompleteSound } from "@/lib/soundEffects";
import {
  ACTIVE_MISSION_STORAGE_KEY,
  StoredActiveMission,
  getWarningThresholdMs,
  getWarningLabel,
  formatCountdown,
  formatAccessibleTime,
} from "@/lib/timerUtils";

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

// ---------------------------------------------------------------------------
// Diagnostic types (mirrors the server response shape)
// ---------------------------------------------------------------------------
interface AttemptDiagnostic {
  attempt: number;
  latencyMs: number;
  success: boolean;
  status: number | null;
}

interface Diagnostics {
  totalAttempts: number;
  attempts: AttemptDiagnostic[];
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const isTouchDevice = useSyncExternalStore(subscribeToTouch, getTouchSnapshot, getTouchServerSnapshot);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedContext, setExtractedContext] = useState<MissionContext | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  // Mission Generation State
  const [generatedMissions, setGeneratedMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isGeneratingMissions, setIsGeneratingMissions] = useState(false);
  const [missionGenerationError, setMissionGenerationError] = useState<string | null>(null);
  const [missionLatencyMs, setMissionLatencyMs] = useState<number | null>(null);

  // Active Mission & Timer Execution State
  const [missionStartedAt, setMissionStartedAt] = useState<number | null>(null);
  const [missionExpectedEndAt, setMissionExpectedEndAt] = useState<number | null>(null);
  const [missionRemainingMs, setMissionRemainingMs] = useState<number>(0);
  const [missionCompleted, setMissionCompleted] = useState<boolean>(false);
  const [warningTriggered, setWarningTriggered] = useState<boolean>(false);
  const [showDetailsWhileRunning, setShowDetailsWhileRunning] = useState<boolean>(false);

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

  // Local draft inputs for array fields to allow natural comma-separated typing
  const [featuresDraft, setFeaturesDraft] = useState("");
  const [obstaclesDraft, setObstaclesDraft] = useState("");
  const [equipmentDraft, setEquipmentDraft] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Mission Completion Feedback State
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

  const feedbackCameraInputRef = useRef<HTMLInputElement>(null);
  const feedbackGalleryInputRef = useRef<HTMLInputElement>(null);

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
            // Expected end timestamp already passed while user was away
            setMissionRemainingMs(0);
            setMissionCompleted(true);
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

  // Real-time timestamp countdown & tab wake-up synchronization
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

      // Warning threshold check (triggers once per mission)
      if (selectedMission) {
        const threshold = getWarningThresholdMs(selectedMission.durationMinutes);
        if (remaining <= threshold && remaining > 0 && !warningTriggered) {
          setWarningTriggered(true);
          playNearEndWarningSound();

          // Persist warning status so refresh does not replay audio
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
        setMissionRemainingMs(0);
        setMissionCompleted(true);
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

    // Tab inactivity recovery: recalculate immediately upon tab focus
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
  }, [missionStartedAt, missionExpectedEndAt, missionCompleted, warningTriggered, selectedMission]);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Clean up completion photo preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (feedbackPhotoPreviewUrl) {
        URL.revokeObjectURL(feedbackPhotoPreviewUrl);
      }
    };
  }, [feedbackPhotoPreviewUrl]);

  // Clean up microphone media stream and recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (missionIntervalRef.current) {
        clearInterval(missionIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

    // 10MB limit
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

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackValidationError(null);

    if (!feedbackRating) {
      setFeedbackValidationError("Please select an overall rating (1 to 5 stars).");
      return;
    }

    if (!selectedMission) return;

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
      completedAt: new Date().toISOString(),
    };

    setSubmittedFeedback(submission);
    setFeedbackSubmitted(true);
  };

  const clearMissions = () => {
    // Preserve active running mission if in progress
    if (missionStartedAt && !missionCompleted) {
      return;
    }
    resetFeedbackState();
    setGeneratedMissions([]);
    setSelectedMission(null);
    setMissionGenerationError(null);
    setMissionLatencyMs(null);
    setMissionStartedAt(null);
    setMissionExpectedEndAt(null);
    setMissionRemainingMs(0);
    setMissionCompleted(false);
    setWarningTriggered(false);
    setShowDetailsWhileRunning(false);
    try {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleStartMission = () => {
    if (!selectedMission) return;
    resetFeedbackState();
    unlockAudio();
    const now = Date.now();
    const end = now + selectedMission.durationMinutes * 60 * 1000;

    setMissionStartedAt(now);
    setMissionExpectedEndAt(end);
    setMissionRemainingMs(end - now);
    setMissionCompleted(false);
    setWarningTriggered(false);
    setShowDetailsWhileRunning(false);

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

  const handleFinishEarly = () => {
    if (!missionStartedAt || missionCompleted) return;
    if (!window.confirm("Are you sure you want to finish this mission early?")) return;

    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
    }
    setMissionRemainingMs(0);
    setMissionCompleted(true);
    try {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleBackToMissions = () => {
    // If mission is actively running, confirm before stopping
    if (missionStartedAt && !missionCompleted) {
      if (!window.confirm("A mission is currently active. Are you sure you want to stop and return to missions?")) {
        return;
      }
    }

    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
    }
    resetFeedbackState();
    setMissionStartedAt(null);
    setMissionExpectedEndAt(null);
    setMissionRemainingMs(0);
    setMissionCompleted(false);
    setWarningTriggered(false);
    setShowDetailsWhileRunning(false);
    try {
      localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
    } catch {
      // ignore
    }

    setSelectedMission(null);
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
      if (data.diagnostics?.latencyMs) {
        setMissionLatencyMs(data.diagnostics.latencyMs);
      }
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

      // Populate into existing textarea:
      // If empty: set to transcript.
      // If already contains text: existing text + space + transcript.
      setInputText((prev) => {
        const current = prev.trim();
        if (!current) {
          return transcript;
        }
        return `${current} ${transcript}`;
      });

      // Reset stale analysis state immediately if context had been previously generated
      setExtractedContext(null);
      setLatencyMs(null);
      setDiagnostics(null);
      setError(null);
      setFeaturesDraft("");
      setObstaclesDraft("");
      setEquipmentDraft("");
      clearMissions();
    } catch {
      setMicError("Unable to transcribe audio. Please check your connection and try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all microphone tracks immediately to release the microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  const startRecording = async () => {
    setMicError(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function" ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setMicError("Voice recording is not supported in this browser. Please type your request instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Determine best supported MIME type
      const preferredMimes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "audio/wav",
      ];
      let selectedMimeType = "";
      for (const mime of preferredMimes) {
        if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || selectedMimeType || "audio/webm";
        const audioBlob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];

        if (audioBlob.size === 0) {
          return;
        }

        await handleTranscribe(audioBlob, mime);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start 60-second safety limit timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsedSec);
        if (elapsedSec >= 60) {
          stopRecording();
        }
      }, 500);
    } catch (err: unknown) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const errorName = (err as { name?: string })?.name;
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setMicError("Microphone access was blocked. Please allow microphone access or type your request instead.");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        setMicError("No microphone found on your device. Please type your request instead.");
      } else {
        setMicError("Unable to access microphone. Please type your request instead.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      setFileError("Please choose a valid JPEG, PNG, or WebP photo.");
      e.target.value = "";
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setFileError("This photo is larger than 10MB. Please choose a smaller file.");
      e.target.value = "";
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreviewUrl(preview);
    e.target.value = "";

    // Reset all previous analysis results when an image is selected or replaced
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
    clearMissions();
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setFileError(null);

    // Reset all previous analysis results when an image is removed
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);
    setError(null);
    setFeaturesDraft("");
    setObstaclesDraft("");
    setEquipmentDraft("");
    clearMissions();
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setLoading(true);
    setError(null);
    setExtractedContext(null);
    setLatencyMs(null);
    setDiagnostics(null);
    clearMissions();

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
        setError(data.error || `Error analyzing request (${res.status})`);
      } else {
        const ctx = data.context as MissionContext;
        setExtractedContext(ctx);
        setFeaturesDraft(ctx.environment.features.join(", "));
        setObstaclesDraft(ctx.environment.obstacles.join(", "));
        setEquipmentDraft(ctx.equipmentAvailable.join(", "));
        setLatencyMs(data.latencyMs ?? null);
        if (data.diagnostics) {
          setDiagnostics(data.diagnostics as Diagnostics);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof MissionContext>(key: K, val: MissionContext[K]) => {
    if (!extractedContext) return;
    setExtractedContext({ ...extractedContext, [key]: val });
    clearMissions();
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
    clearMissions();
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
    clearMissions();
  };

  // Tag removal helpers
  const removeFeature = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.features.filter((_, i) => i !== idx);
    updateEnvironment("features", next);
    setFeaturesDraft(next.join(", "));
    clearMissions();
  };

  const removeObstacle = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.environment.obstacles.filter((_, i) => i !== idx);
    updateEnvironment("obstacles", next);
    setObstaclesDraft(next.join(", "));
    clearMissions();
  };

  const removeEquipment = (idx: number) => {
    if (!extractedContext) return;
    const next = extractedContext.equipmentAvailable.filter((_, i) => i !== idx);
    updateField("equipmentAvailable", next);
    setEquipmentDraft(next.join(", "));
    clearMissions();
  };

  const inputCls =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400";

  const labelCls = "block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5";

  // Predefined age group chips
  const ageOptions = ["Kids", "Teens", "Adults", "Mixed"];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <main className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center">
      <div className={`w-full ${generatedMissions.length === 3 ? "max-w-4xl" : "max-w-2xl"} space-y-6 transition-all duration-300`}>

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

        {/* Header (hidden while mission is executing or completed) */}
        {!missionStartedAt && (
          <>
            <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Outventure AI
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-900 dark:text-zinc-50">
            Plan Your Next Outventure
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Describe your group, snap or upload your surroundings — we will organize your mission context in seconds.
          </p>
        </div>

        {/* Input Form Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800/80 space-y-5">
          <form onSubmit={handleAnalyze} className="space-y-5">
            {/* 1. Text Request */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="activity-request"
                  className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200"
                >
                  What would you like to do?
                </label>
                <span className="text-xs text-zinc-400 font-normal">
                  {selectedImage ? "Optional if photo provided" : "Text or photo required"}
                </span>
              </div>
              <textarea
                id="activity-request"
                rows={3}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  clearMissions();
                }}
                placeholder="We are 6 people, have 15 minutes, and want something fun and active..."
                disabled={loading || isRecording || isTranscribing}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:opacity-50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
              />

              {/* Voice Input Controls & Status */}
              <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {!isRecording && !isTranscribing && (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer disabled:opacity-50"
                      title="Record speech to text"
                    >
                      <span className="text-sm">🎙</span>
                      <span>Speak</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition cursor-pointer"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                      </span>
                      <span>Stop recording</span>
                      <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-300">
                        ({formatTimer(recordingDuration)})
                      </span>
                    </button>
                  )}

                  {isTranscribing && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      <svg className="animate-spin h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Transcribing your voice...</span>
                    </div>
                  )}
                </div>

                {isRecording && (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                    Max 60 seconds
                  </span>
                )}
              </div>

              {micError && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                  <span className="flex-1">{micError}</span>
                  <button
                    type="button"
                    onClick={() => setMicError(null)}
                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 font-bold px-1"
                    title="Dismiss message"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* 2. Photo of Surroundings (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Add a photo of your surroundings
                </label>
                <span className="text-xs text-zinc-400 font-normal">
                  Optional
                </span>
              </div>

              {!selectedImage ? (
                <div className="border border-dashed border-zinc-300 dark:border-zinc-750 rounded-xl p-4 bg-zinc-50/40 dark:bg-zinc-850/30 text-center transition hover:border-zinc-400 dark:hover:border-zinc-650">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Upload a park, playground, backyard, or room photo to automatically detect the space, surface, and equipment.
                  </p>
                  <div className="flex items-center justify-center gap-2.5 flex-wrap">
                    {isTouchDevice ? (
                      <>
                        {/* Mobile camera capture */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => cameraInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                        >
                          <span className="text-sm">📷</span>
                          <span>Take Photo</span>
                        </button>

                        {/* Mobile gallery picker */}
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => galleryInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer"
                        >
                          <span className="text-sm">🖼️</span>
                          <span>Choose Photo</span>
                        </button>
                      </>
                    ) : (
                      /* Desktop / laptop file picker */
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition cursor-pointer"
                      >
                        <span className="text-sm">🖼️</span>
                        <span>Choose Image</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    JPEG, PNG, or WebP up to 10MB
                  </p>
                </div>
              ) : (
                /* Selected Image Preview Card */
                <div className="flex items-center justify-between gap-3.5 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {imagePreviewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviewUrl}
                        alt="Surroundings preview"
                        className="w-14 h-14 rounded-lg object-cover border border-emerald-300/60 dark:border-emerald-800 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {selectedImage.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(selectedImage.size)} · Ready to analyze
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleRemoveImage}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 font-medium">
                  {fileError}
                </p>
              )}
            </div>

            {/* 3. Action Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                id="analyze-btn"
                type="submit"
                disabled={loading || isRecording || isTranscribing || (!inputText.trim() && !selectedImage)}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Context"
                )}
              </button>

              {/* Development Timing & Diagnostics (Preserved & Unobtrusive) */}
              {latencyMs !== null && !loading && (
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                    ⚡ {(latencyMs / 1000).toFixed(2)}s
                    {diagnostics && ` · ${diagnostics.totalAttempts} attempt${diagnostics.totalAttempts !== 1 ? "s" : ""}`}
                  </span>

                  {diagnostics && (
                    <details className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                      <summary className="cursor-pointer select-none hover:text-zinc-600 dark:hover:text-zinc-300 transition">
                        ▸ attempt details
                      </summary>
                      <ul className="mt-1 space-y-0.5 text-right">
                        {diagnostics.attempts.map((a) => (
                          <li key={a.attempt}>
                            Attempt {a.attempt}: {(a.latencyMs / 1000).toFixed(2)}s —{" "}
                            {a.success ? (
                              <span className="text-emerald-500 font-semibold">Success</span>
                            ) : (
                              <span className="text-red-400 font-semibold">{a.status ?? "error"}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </form>

          {loading && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-sm">
              <svg className="animate-spin h-5 w-5 text-emerald-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>
                {selectedImage && inputText.trim()
                  ? "Analyzing your description and surroundings photo..."
                  : selectedImage
                  ? "Analyzing your surroundings photo..."
                  : "Understanding your request details..."}
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <p className="font-semibold mb-0.5">Extraction Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>
          </>
        )}

        {/* Confirmation Screen (hidden while mission is executing or completed) */}
        {extractedContext && !missionStartedAt && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800/80 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Header section */}
            <div className="p-6 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Check your details
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Make any changes before we create your outdoor ideas.
                  </p>
                </div>
                <button
                  id="reset-btn"
                  type="button"
                  onClick={() => {
                    setExtractedContext(null);
                    setLatencyMs(null);
                    setDiagnostics(null);
                    setError(null);
                    setInputText("");
                    handleRemoveImage();
                  }}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ↺ Start over
                </button>
              </div>
            </div>

            {/* Primary Fields (Clean, prominent controls) */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* People Count */}
                <div>
                  <label htmlFor="field-people-count" className={labelCls}>
                    People
                  </label>
                  <div className="relative">
                    <input
                      id="field-people-count"
                      type="number"
                      min="1"
                      value={extractedContext.peopleCount ?? ""}
                      onChange={(e) =>
                        updateField("peopleCount", e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      placeholder="Any"
                      className={inputCls}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 pointer-events-none">
                      people
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label htmlFor="field-duration" className={labelCls}>
                    Time
                  </label>
                  <div className="relative">
                    <input
                      id="field-duration"
                      type="number"
                      min="1"
                      value={extractedContext.durationMinutes ?? ""}
                      onChange={(e) =>
                        updateField("durationMinutes", e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      placeholder="Any"
                      className={inputCls}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400 pointer-events-none">
                      min
                    </span>
                  </div>
                </div>

                {/* Where are you? (Environment Type) */}
                <div>
                  <label htmlFor="field-env-type" className={labelCls}>
                    Where are you?
                  </label>
                  <input
                    id="field-env-type"
                    type="text"
                    value={extractedContext.environment.type ?? ""}
                    onChange={(e) => updateEnvironment("type", e.target.value || null)}
                    placeholder="e.g. Playground, park, backyard..."
                    className={inputCls}
                  />
                </div>

                {/* Indoor / Outdoor Segmented Control */}
                <div>
                  <label className={labelCls}>Indoor / Outdoor</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() =>
                        updateEnvironment(
                          "indoorOutdoor",
                          extractedContext.environment.indoorOutdoor === "outdoor" ? null : "outdoor"
                        )
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        extractedContext.environment.indoorOutdoor === "outdoor"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      🌳 Outdoor
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateEnvironment(
                          "indoorOutdoor",
                          extractedContext.environment.indoorOutdoor === "indoor" ? null : "indoor"
                        )
                      }
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        extractedContext.environment.indoorOutdoor === "indoor"
                          ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      🏠 Indoor
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Goal */}
              <div>
                <label htmlFor="field-activity-goal" className={labelCls}>
                  Activity Goal
                </label>
                <input
                  id="field-activity-goal"
                  type="text"
                  value={extractedContext.activityGoal ?? ""}
                  onChange={(e) => updateField("activityGoal", e.target.value || null)}
                  placeholder="e.g. Fun and active, team building, relaxing walk..."
                  className={inputCls}
                />
              </div>

              {/* Intensity (Segmented Chip Controls) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Intensity</label>
                  {extractedContext.intensity && (
                    <button
                      type="button"
                      onClick={() => updateField("intensity", null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as IntensityLevel[]).map((level) => {
                    if (!level) return null;
                    const isSelected = extractedContext.intensity === level;
                    const labels: Record<string, string> = {
                      low: "Gentle / Low",
                      medium: "Medium",
                      high: "High Energy",
                    };
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateField("intensity", isSelected ? null : level)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                            : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {labels[level]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Age Group (Chip options + Custom text) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="field-age-group" className={labelCls}>
                    Age Group
                  </label>
                  {extractedContext.ageGroup && (
                    <button
                      type="button"
                      onClick={() => updateField("ageGroup", null)}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ageOptions.map((opt) => {
                    const isSelected =
                      extractedContext.ageGroup?.toLowerCase() === opt.toLowerCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("ageGroup", isSelected ? null : opt)}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-50/80 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/70 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="field-age-group"
                  type="text"
                  value={extractedContext.ageGroup ?? ""}
                  onChange={(e) => updateField("ageGroup", e.target.value || null)}
                  placeholder="Or enter custom (e.g. Toddlers, Seniors, 7-10 years)..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Collapsible Secondary Details Section */}
            <div className="p-6 bg-zinc-50/40 dark:bg-zinc-900/40">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      More details
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      (Space, surface, equipment & constraints)
                    </span>
                  </div>
                  <span className="text-zinc-400 group-open:rotate-180 transition-transform duration-200 text-xs font-bold">
                    ▼
                  </span>
                </summary>

                <div className="pt-5 space-y-5 border-t border-zinc-200/70 dark:border-zinc-800 mt-4">
                  {/* Space Size */}
                  <div>
                    <label className={labelCls}>Space Size</label>
                    <div className="flex flex-wrap gap-2">
                      {(["small", "medium", "large"] as SpaceSize[]).map((size) => {
                        if (!size) return null;
                        const isSelected = extractedContext.environment.spaceSize === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              updateEnvironment(
                                "spaceSize",
                                isSelected ? null : size
                              )
                            }
                            className={`py-1.5 px-3.5 text-xs font-medium rounded-lg border transition-all capitalize cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                            }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Surface */}
                  <div>
                    <label htmlFor="field-env-surface" className={labelCls}>
                      Ground / Surface
                    </label>
                    <input
                      id="field-env-surface"
                      type="text"
                      value={extractedContext.environment.surface ?? ""}
                      onChange={(e) => updateEnvironment("surface", e.target.value || null)}
                      placeholder="e.g. Grass, pavement, sand, turf..."
                      className={inputCls}
                    />
                  </div>

                  {/* Environment Features */}
                  <div>
                    <label htmlFor="field-env-features" className={labelCls}>
                      Features & Landmarks
                    </label>
                    {extractedContext.environment.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.environment.features.map((feat, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200/70 dark:border-emerald-800/60"
                          >
                            {feat}
                            <button
                              type="button"
                              onClick={() => removeFeature(i)}
                              className="text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-200 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-env-features"
                      type="text"
                      value={featuresDraft}
                      onChange={(e) => {
                        setFeaturesDraft(e.target.value);
                        updateEnvironment(
                          "features",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Two trees, a bench, open grassy space (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Obstacles */}
                  <div>
                    <label htmlFor="field-env-obstacles" className={labelCls}>
                      Obstacles / Hazards
                    </label>
                    {extractedContext.environment.obstacles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.environment.obstacles.map((obs, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800"
                          >
                            {obs}
                            <button
                              type="button"
                              onClick={() => removeObstacle(i)}
                              className="text-amber-500 hover:text-amber-800 dark:hover:text-amber-100 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-env-obstacles"
                      type="text"
                      value={obstaclesDraft}
                      onChange={(e) => {
                        setObstaclesDraft(e.target.value);
                        updateEnvironment(
                          "obstacles",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Rocks, fences, steep slope (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Equipment Available */}
                  <div>
                    <label htmlFor="field-equipment" className={labelCls}>
                      Equipment Available
                    </label>
                    {extractedContext.equipmentAvailable.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {extractedContext.equipmentAvailable.map((eq, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-800"
                          >
                            {eq}
                            <button
                              type="button"
                              onClick={() => removeEquipment(i)}
                              className="text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input
                      id="field-equipment"
                      type="text"
                      value={equipmentDraft}
                      onChange={(e) => {
                        setEquipmentDraft(e.target.value);
                        updateField(
                          "equipmentAvailable",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        );
                      }}
                      placeholder="e.g. Football, two cones, frisbee (comma-separated)..."
                      className={inputCls}
                    />
                  </div>

                  {/* Constraints (Friendly 3-way toggle pills) */}
                  <div className="space-y-3 pt-2">
                    <label className={labelCls}>Activity Constraints</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* No Running */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          No Running
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("noRunning", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.noRunning === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Kid Friendly */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          Kid Friendly
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("kidFriendly", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.kidFriendly === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Quiet Activity */}
                      <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 space-y-2">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                          Quiet Activity
                        </span>
                        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-700/60 p-0.5 text-[11px] font-medium">
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", null)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === null
                                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Any
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", true)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === true
                                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConstraints("quietActivity", false)}
                            className={`flex-1 py-1 rounded-md transition ${
                              extractedContext.constraints.quietActivity === false
                                ? "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* 4. Generate Missions CTA */}
            <div className="p-5 bg-gradient-to-b from-white to-emerald-50/40 dark:from-zinc-900 dark:to-emerald-950/20 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-3">
              <button
                id="generate-missions-btn"
                type="button"
                onClick={handleGenerateMissions}
                disabled={isGeneratingMissions}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingMissions ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Creating your missions...</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">✨</span>
                    <span>Generate Missions</span>
                  </>
                )}
              </button>

              {missionGenerationError && (
                <div className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                  <span>{missionGenerationError}</span>
                  <button
                    type="button"
                    onClick={handleGenerateMissions}
                    className="font-semibold underline hover:no-underline text-amber-900 dark:text-amber-200 cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Developer Details (Raw JSON - Collapsible & Unobtrusive) */}
            <div className="p-4 bg-zinc-50/80 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800">
              <details className="text-xs text-zinc-400 group">
                <summary className="cursor-pointer font-mono hover:text-zinc-600 dark:hover:text-zinc-300 transition select-none">
                  ▸ Developer details (Raw JSON)
                </summary>
                <pre className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200/80 dark:border-zinc-850 overflow-x-auto font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                  {JSON.stringify(extractedContext, null, 2)}
                </pre>
                {missionLatencyMs !== null && (
                  <p className="mt-2 text-[11px] font-mono text-zinc-500">
                    ⚡ Mission generation latency: {(missionLatencyMs / 1000).toFixed(2)}s (model: gemini-3.1-flash-lite)
                  </p>
                )}
              </details>
            </div>
          </div>
        )}

        {/* 3 Mission Selection Cards (hidden while mission is executing or completed) */}
        {generatedMissions.length === 3 && !selectedMission && !missionStartedAt && (
          <section id="mission-selection-section" className="space-y-4 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Choose Your Outventure</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Pick one of your 3 tailored missions — all instructions and safety notes are ready.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {missionLatencyMs !== null && (
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                    ⚡ {(missionLatencyMs / 1000).toFixed(2)}s
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleGenerateMissions}
                  disabled={isGeneratingMissions}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 transition cursor-pointer disabled:opacity-50"
                  title="Generate 3 fresh missions using current details"
                >
                  <span>🔄</span>
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedMissions.map((mission, idx) => (
                <div
                  key={mission.id || idx}
                  className="flex flex-col justify-between bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition shadow-xs hover:shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Header badge */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70">
                        Option {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-zinc-400 capitalize">
                        {mission.intensity} intensity
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {mission.title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                      {mission.shortDescription}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                        ⏱️ {mission.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                        👥 {mission.players}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                        🎒 {mission.equipmentNeeded.length > 0 ? mission.equipmentNeeded.join(", ") : "No gear needed"}
                      </span>
                    </div>

                    {/* Why this fits snippet */}
                    {mission.whyItFits && (
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 italic line-clamp-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                        &ldquo;{mission.whyItFits}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMission(mission)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-900 dark:bg-zinc-100 hover:bg-emerald-600 dark:hover:bg-emerald-500 text-white dark:text-zinc-900 hover:text-white dark:hover:text-white transition shadow-xs cursor-pointer"
                    >
                      <span>Choose Mission</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Selected Mission Detailed Pre-Start View */}
        {selectedMission && !missionStartedAt && (
          <section id="mission-detail-view" className="space-y-5">
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackToMissions}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer transition"
            >
              <span>←</span>
              <span>Back to Missions</span>
            </button>

            {/* Mission Details Card */}
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-6">
              {/* Header */}
              <div className="space-y-3 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <span>Ready to Start</span>
                    </span>
                    <span className="text-xs font-medium text-zinc-400 capitalize">
                      {selectedMission.intensity} Intensity
                    </span>
                  </div>

                  {/* Top Start Mission CTA */}
                  <button
                    id="start-mission-btn-header"
                    type="button"
                    onClick={handleStartMission}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <span>🚀</span>
                    <span>Start Mission</span>
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {selectedMission.title}
                </h2>

                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {selectedMission.shortDescription}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                    ⏱️ {selectedMission.durationMinutes} minutes
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                    👥 {selectedMission.players}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                    ⚡ {selectedMission.intensity.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Why this fits */}
              {selectedMission.whyItFits && (
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 space-y-1">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Why this fits your group & surroundings
                  </h4>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    {selectedMission.whyItFits}
                  </p>
                </div>
              )}

              {/* What you'll need */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  What you&apos;ll need
                </h4>
                {selectedMission.equipmentNeeded.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {selectedMission.equipmentNeeded.map((eq, i) => (
                      <li
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800"
                      >
                        <span>🎒</span>
                        <span>{eq}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    ✨ No equipment needed — only your surroundings and group.
                  </p>
                )}
              </div>

              {/* How to do it (Steps) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  How to do it
                </h4>
                <ol className="space-y-2.5">
                  {selectedMission.steps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800"
                    >
                      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed pt-0.5">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Safety Notes */}
              {selectedMission.safetyNotes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Stay Safe</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedMission.safetyNotes.map((note, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                      >
                        <span className="text-amber-500 mt-0.5 font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Start Mission CTA */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                <button
                  id="start-mission-btn-bottom"
                  type="button"
                  onClick={handleStartMission}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <span>🚀</span>
                  <span>Start Mission</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Active Mission Execution / Countdown Timer View */}
        {selectedMission && missionStartedAt !== null && !missionCompleted && (
          <section id="active-mission-view" className="space-y-5 animate-fadeIn">
            {/* Near-end Warning Banner */}
            {warningTriggered && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-md animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-extrabold">
                      {getWarningLabel(selectedMission.durationMinutes)}
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Wrap up your current activity and prepare for the finish!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timer Hero Card */}
            <div
              className={`p-6 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border text-center space-y-6 transition-colors shadow-sm ${
                warningTriggered
                  ? "border-amber-400 dark:border-amber-500 shadow-amber-500/10 shadow-xl"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              {/* Header Status */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Mission in Progress</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {selectedMission.title}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto line-clamp-2">
                  {selectedMission.shortDescription}
                </p>
              </div>

              {/* Large Countdown Display */}
              <div className="py-2">
                <div
                  id="mission-countdown-display"
                  aria-live="polite"
                  aria-label={formatAccessibleTime(missionRemainingMs)}
                  className={`font-mono font-black text-6xl sm:text-7xl md:text-8xl tracking-tight transition-colors ${
                    warningTriggered
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-zinc-900 dark:text-zinc-50"
                  }`}
                >
                  {formatCountdown(missionRemainingMs)}
                </div>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2">
                  Time Remaining
                </p>

                {/* Visual Progress Bar */}
                {missionExpectedEndAt && missionStartedAt && missionExpectedEndAt > missionStartedAt && (
                  <div className="w-full max-w-xs sm:max-w-md mx-auto h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        warningTriggered ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (1 - missionRemainingMs / (missionExpectedEndAt - missionStartedAt)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Controls: Details Toggle & Finish Early */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDetailsWhileRunning(!showDetailsWhileRunning)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                >
                  <span>{showDetailsWhileRunning ? "▲" : "▼"}</span>
                  <span>{showDetailsWhileRunning ? "Hide Mission Details" : "View Steps & Gear"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinishEarly}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition cursor-pointer"
                >
                  <span>⏹</span>
                  <span>Finish Early</span>
                </button>
              </div>

              {/* Expandable Mission Details (Steps, Gear, Safety) */}
              {showDetailsWhileRunning && (
                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-left space-y-5 animate-fadeIn">
                  {/* Gear */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      What you&apos;ll need
                    </h4>
                    {selectedMission.equipmentNeeded.length > 0 ? (
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">
                        🎒 {selectedMission.equipmentNeeded.join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                        ✨ No equipment needed — only your surroundings.
                      </p>
                    )}
                  </div>

                  {/* Steps */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Mission Steps
                    </h4>
                    <ol className="space-y-2">
                      {selectedMission.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
                        >
                          <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px]">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Safety */}
                  {selectedMission.safetyNotes.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        🛡️ Stay Safe
                      </h4>
                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {selectedMission.safetyNotes.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Mission Complete & Feedback Experience */}
        {selectedMission && missionCompleted && (
          <section id="mission-complete-view" className="space-y-5 animate-fadeIn">
            {/* 1. Summary / Celebration State (before opening feedback form) */}
            {!isFeedbackOpen && !feedbackSubmitted && (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/80 shadow-lg text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 text-4xl shadow-inner mx-auto">
                  🎉
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Mission Complete!
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                    You made it to the end. Outstanding outventure with your group!
                  </p>
                </div>

                {/* Completed Recap Card */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedMission.title}
                  </h3>
                  <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                    <span>⏱️ {selectedMission.durationMinutes} min completed</span>
                    <span>•</span>
                    <span>👥 {selectedMission.players}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedMission.intensity} intensity</span>
                  </div>
                </div>

                {/* Expandable Review Steps */}
                <div className="max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setShowDetailsWhileRunning(!showDetailsWhileRunning)}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showDetailsWhileRunning ? "▲ Hide Mission Steps" : "▼ Review Mission Steps"}
                  </button>

                  {showDetailsWhileRunning && (
                    <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-left space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                      <ol className="space-y-1.5 list-decimal list-inside">
                        {selectedMission.steps.map((st, i) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Primary Feedback CTA */}
                <div className="pt-2 flex flex-col items-center gap-3">
                  <button
                    id="leave-feedback-btn"
                    type="button"
                    onClick={() => {
                      setIsFeedbackOpen(true);
                      setFeedbackRating((prev) => prev ?? 5);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
                  >
                    <span>⭐</span>
                    <span>Leave Feedback</span>
                  </button>

                  {/* Secondary Navigation Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
                    <button
                      type="button"
                      onClick={handleBackToMissions}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      <span>🎯</span>
                      <span>Back to Missions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleBackToMissions();
                        setExtractedContext(null);
                        setGeneratedMissions([]);
                        setSelectedMission(null);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                    >
                      <span>🌱</span>
                      <span>Plan New Outventure</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Feedback Form View */}
            {isFeedbackOpen && !feedbackSubmitted && (
              <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg space-y-6">
                {/* Back to Summary */}
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <span>←</span>
                  <span>Back to Summary</span>
                </button>

                {/* Form Header */}
                <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-5">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Share Your Experience
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Help us calibrate accuracy, difficulty, and fun for future missions.
                  </p>

                  {/* Compact Mission Reference Banner */}
                  <div className="p-3 mt-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      🎯 {selectedMission.title}
                    </span>
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium text-[11px]">
                      <span>⏱️ {selectedMission.durationMinutes}m</span>
                      <span>•</span>
                      <span className="capitalize">⚡ {selectedMission.intensity}</span>
                      <span>•</span>
                      <span>👥 {selectedMission.players}</span>
                    </div>
                  </div>
                </div>

                {/* Feedback Form */}
                <form onSubmit={handleSubmitFeedback} className="space-y-6 text-left">
                  {/* Question 1: Star Rating (Required) */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      How was your mission? <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-2" role="radiogroup" aria-label="Mission rating">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isSelected = feedbackRating !== null && feedbackRating >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setFeedbackRating(star as FeedbackRating);
                              setFeedbackValidationError(null);
                            }}
                            aria-label={`Rate ${star} out of 5 stars`}
                            aria-checked={feedbackRating === star}
                            role="radio"
                            className={`p-2 sm:p-2.5 rounded-xl transition text-2xl sm:text-3xl cursor-pointer ${
                              isSelected
                                ? "text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 hover:scale-110"
                                : "text-zinc-300 dark:text-zinc-700 hover:text-amber-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            ★
                          </button>
                        );
                      })}
                      {feedbackRating !== null && (
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-2">
                          {feedbackRating} / 5
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question 2: Context Match */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Was this mission a good match for your situation?
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Considering your group size, available time, space, and equipment.
                    </p>
                    <div className="flex gap-2 pt-1">
                      {(["yes", "mostly", "no"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFeedbackContextMatch(opt)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer capitalize ${
                            feedbackContextMatch === opt
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 3: Instructions Accuracy */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Were the instructions accurate and easy to follow?
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Were the steps practical and understandable in your environment?
                    </p>
                    <div className="flex gap-2 pt-1">
                      {(["yes", "mostly", "no"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setFeedbackInstructionsAccurate(opt)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer capitalize ${
                            feedbackInstructionsAccurate === opt
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 4: Difficulty */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      How did the mission feel?
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Helps calibrate physical intensity and pacing.
                    </p>
                    <div className="flex gap-2 pt-1">
                      {([
                        { val: "too-easy", label: "Too Easy" },
                        { val: "just-right", label: "Just Right" },
                        { val: "too-hard", label: "Too Hard" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setFeedbackDifficulty(opt.val)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            feedbackDifficulty === opt.val
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question 5: Optional Written Comment */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label htmlFor="feedback-comment" className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Anything else you&apos;d like to share?
                      </label>
                      <span className="text-[11px] text-zinc-400">
                        {1000 - feedbackComment.length} chars left
                      </span>
                    </div>
                    <textarea
                      id="feedback-comment"
                      rows={3}
                      maxLength={1000}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="What worked well, what could be better, or anything surprising..."
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-y"
                    />
                  </div>

                  {/* Question 6: Optional Completion Photo */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Add a completion photo (Optional)
                    </label>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Share a photo from your Outventure if you&apos;d like.
                    </p>

                    {!feedbackPhoto ? (
                      <div>
                        {isTouchDevice ? (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => feedbackCameraInputRef.current?.click()}
                              className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition cursor-pointer group"
                            >
                              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📷</span>
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Take Photo</span>
                              <span className="text-[10px] text-zinc-400">Rear camera</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => feedbackGalleryInputRef.current?.click()}
                              className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition cursor-pointer group"
                            >
                              <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Choose Photo</span>
                              <span className="text-[10px] text-zinc-400">From gallery</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => feedbackGalleryInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition cursor-pointer group"
                          >
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Choose Photo</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">JPEG, PNG, or WebP up to 10MB</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Selected Photo Preview */
                      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {feedbackPhotoPreviewUrl && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={feedbackPhotoPreviewUrl}
                                alt="Selected completion photo preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {feedbackPhoto.name}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {formatFileSize(feedbackPhoto.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => feedbackGalleryInputRef.current?.click()}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFeedbackPhoto}
                            className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {feedbackPhotoError && (
                      <p className="text-xs text-rose-500 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{feedbackPhotoError}</span>
                      </p>
                    )}

                    {/* Purpose explanation */}
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1">
                      If you choose to share your feedback publicly, your photo may be shown with your completed mission to help inspire other Outventure AI visitors.
                    </p>
                  </div>

                  {/* Public Sharing Consent Section */}
                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Community Sharing Preferences
                    </span>

                    {/* 1. Public Feedback Consent Checkbox */}
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareFeedbackPublicly}
                        onChange={(e) => handleToggleShareFeedback(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="space-y-0.5 text-xs">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                          Share my feedback publicly
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-relaxed">
                          My rating, comment, and completed mission may be shown to other Outventure AI visitors.
                        </span>
                      </div>
                    </label>

                    {/* 2. Public Photo Consent Checkbox (Separate, only if photo uploaded and feedback public) */}
                    {feedbackPhoto && shareFeedbackPublicly && (
                      <label className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer animate-fadeIn">
                        <input
                          type="checkbox"
                          checked={sharePhotoPublicly}
                          onChange={(e) => setSharePhotoPublicly(e.target.checked)}
                          className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="space-y-0.5 text-xs">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-200 block">
                            Allow my photo to be shown publicly
                          </span>
                          <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 block leading-relaxed">
                            If selected, the uploaded completion photo may appear with my public feedback.
                          </span>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Validation Error Banner */}
                  {feedbackValidationError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{feedbackValidationError}</span>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsFeedbackOpen(false)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      <span>Submit Feedback</span>
                      <span>✓</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. Thank-You State (after local feedback submission) */}
            {feedbackSubmitted && submittedFeedback && (
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/80 shadow-lg text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 text-4xl shadow-inner mx-auto">
                  💚
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Thanks for sharing your feedback!
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                    Your feedback helps improve future Outventures.
                  </p>
                </div>

                {/* Rating Recap */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto space-y-2 text-xs">
                  <div className="flex items-center justify-center gap-1 text-amber-400 text-lg">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>
                        {submittedFeedback.feedback.rating >= star ? "★" : "☆"}
                      </span>
                    ))}
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 ml-2">
                      ({submittedFeedback.feedback.rating} / 5)
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {submittedFeedback.feedback.contextMatch && (
                      <span className="capitalize">
                        Match: {submittedFeedback.feedback.contextMatch}
                      </span>
                    )}
                    {submittedFeedback.feedback.instructionsAccurate && (
                      <>
                        <span>•</span>
                        <span className="capitalize">
                          Instructions: {submittedFeedback.feedback.instructionsAccurate}
                        </span>
                      </>
                    )}
                    {submittedFeedback.feedback.difficulty && (
                      <>
                        <span>•</span>
                        <span className="capitalize">
                          Feel: {submittedFeedback.feedback.difficulty.replace("-", " ")}
                        </span>
                      </>
                    )}
                  </div>

                  {submittedFeedback.feedback.comment && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                      &ldquo;{submittedFeedback.feedback.comment}&rdquo;
                    </p>
                  )}
                </div>

                {/* Consent Status Messages */}
                <div className="max-w-md mx-auto space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {submittedFeedback.feedback.shareFeedbackPublicly ? (
                    <p className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      ✓ You&apos;ve chosen to allow this feedback to be considered for public sharing.
                    </p>
                  ) : (
                    <p className="text-zinc-400 dark:text-zinc-500 text-[11px]">
                      Your feedback will remain private.
                    </p>
                  )}

                  {submittedFeedback.feedback.sharePhotoPublicly && (
                    <p className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                      ✓ Your uploaded photo may also be shown with your feedback.
                    </p>
                  )}
                </div>

                {/* Navigation Actions */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToMissions}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    <span>🎯</span>
                    <span>Back to Missions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleBackToMissions();
                      setExtractedContext(null);
                      setGeneratedMissions([]);
                      setSelectedMission(null);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition cursor-pointer"
                  >
                    <span>🌱</span>
                    <span>Plan New Outventure</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
