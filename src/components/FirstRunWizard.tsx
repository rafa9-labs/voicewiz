import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, Download, Trash2, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { DownloadProgressBar } from "./ui/DownloadProgressBar";
import { useModelDownload } from "../hooks/useModelDownload";
import { WHISPER_MODEL_INFO } from "../models/ModelRegistry";
import WindowControls from "./WindowControls";
import type { CudaWhisperStatus } from "../types/electron";
import logger from "../utils/logger";

interface LocalModel {
  model: string;
  size_mb?: number;
  downloaded?: boolean;
}

interface FirstRunWizardProps {
  onComplete: () => void;
}

type WizardStep = "welcome" | "model" | "done";

const MODEL_ORDER = ["tiny", "base", "small", "medium", "large", "turbo"];

function formatBytes(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)}GB`;
  return `${mb}MB`;
}

export default function FirstRunWizard({ onComplete }: FirstRunWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [models, setModels] = useState<LocalModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("base");
  const [cudaStatus, setCudaStatus] = useState<CudaWhisperStatus | null>(null);
  const hasLoadedRef = useRef(false);

  const {
    downloadingModel,
    downloadProgress,
    downloadModel,
    deleteModel,
    isDownloadingModel,
    isInstalling,
    cancelDownload,
    isCancelling,
  } = useModelDownload({
    modelType: "whisper",
    onDownloadComplete: loadModels,
  });

  async function loadModels() {
    try {
      const result = await window.electronAPI?.listWhisperModels();
      if (result?.success) {
        setModels(result.models);
        if (result.models.length > 0) {
          const downloaded = result.models.find((m: LocalModel) => m.downloaded);
          if (downloaded) {
            setSelectedModel(downloaded.model);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to load models", { error }, "firstRun");
      setModels([]);
    }
  }

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadModels();
    window.electronAPI?.getCudaWhisperStatus?.()
      .then(setCudaStatus)
      .catch(() => {});
  }, []);

  const isModelDownloaded = (modelId: string) =>
    models.find((m) => m.model === modelId)?.downloaded ?? false;

  const canContinue = step === "model" && isModelDownloaded(selectedModel);

  const handleDownload = async (modelId: string) => {
    await downloadModel(modelId, (downloadedId) => {
      setModels((prev) =>
        prev.map((m) => (m.model === downloadedId ? { ...m, downloaded: true } : m))
      );
      setSelectedModel(downloadedId);
    });
  };

  const handleDelete = async (modelId: string) => {
    await deleteModel(modelId, async () => {
      const result = await window.electronAPI?.listWhisperModels();
      if (result?.success) {
        setModels(result.models);
        const downloaded = result.models.find((m: LocalModel) => m.downloaded);
        if (downloaded) {
          setSelectedModel(downloaded.model);
        }
      }
    });
  };

  const handleFinish = () => {
    localStorage.setItem("firstRunWizardComplete", "true");
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("whisperModel", selectedModel);
    localStorage.setItem("useLocalWhisper", "true");
    localStorage.setItem("skipAuth", "true");
    localStorage.setItem("authenticationSkipped", "true");
    localStorage.removeItem("onboardingCurrentStep");
    onComplete();
  };

  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center py-8 px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-6">
        <svg viewBox="0 0 1024 1024" className="w-9 h-9" aria-label="VoiceWiz">
          <rect width="1024" height="1024" rx="241" fill="#2056DF" />
          <circle cx="512" cy="512" r="314" fill="#2056DF" stroke="white" strokeWidth="74" />
          <path d="M512 383V641" stroke="white" strokeWidth="74" strokeLinecap="round" />
          <path d="M627 457V568" stroke="white" strokeWidth="74" strokeLinecap="round" />
          <path d="M397 457V568" stroke="white" strokeWidth="74" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3">
        {t("firstRun.welcome.title")}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
        {t("firstRun.welcome.description")}
      </p>
      <Button onClick={() => setStep("model")} className="h-10 px-8 rounded-full text-sm">
        {t("firstRun.welcome.getStarted")}
        <ChevronRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );

  const renderModelSelection = () => {
    const modelsToRender =
      models.length === 0
        ? MODEL_ORDER.map((id) => ({
            model: id,
            downloaded: false,
            size_mb: WHISPER_MODEL_INFO[id]?.sizeMb,
          }))
        : MODEL_ORDER.map((id) => models.find((m) => m.model === id) ?? {
            model: id,
            downloaded: false,
            size_mb: WHISPER_MODEL_INFO[id]?.sizeMb,
          });

    return (
      <div className="py-4 px-2">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-foreground mb-1.5">
            {t("firstRun.model.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {t("firstRun.model.description")}
          </p>
        </div>

        {downloadingModel && (
          <div className="mb-4 rounded-lg border border-border bg-surface-1 overflow-hidden">
            <DownloadProgressBar
              modelName={WHISPER_MODEL_INFO[downloadingModel]?.name || downloadingModel}
              progress={downloadProgress}
              isInstalling={isInstalling}
            />
          </div>
        )}

        {cudaStatus?.gpuInfo.hasNvidiaGpu && cudaStatus.downloaded && (
          <div className="mb-3 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
            <Check size={14} className="text-success shrink-0" />
            <span className="text-xs font-medium text-foreground">GPU acceleration active</span>
          </div>
        )}

        <div className="space-y-1.5">
          {modelsToRender.map((model) => {
            const info = WHISPER_MODEL_INFO[model.model];
            if (!info) return null;
            const downloaded = model.downloaded ?? false;
            const isSelected = model.model === selectedModel;
            const isDownloading = isDownloadingModel(model.model);

            return (
              <div
                key={model.model}
                onClick={() => {
                  if (downloaded) setSelectedModel(model.model);
                }}
                className={`relative w-full rounded-lg border transition-colors duration-200 ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : downloaded
                      ? "border-border/60 bg-surface-1 hover:border-border cursor-pointer"
                      : "border-border/40 bg-surface-1/50"
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <div
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      downloaded
                        ? isSelected
                          ? "bg-primary"
                          : "bg-success"
                        : isDownloading
                          ? "bg-amber-500"
                          : "bg-muted-foreground/20"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {info.name}
                      </span>
                      <span className="text-xs text-muted-foreground/50 tabular-nums">
                        {model.size_mb ? formatBytes(model.size_mb) : info.size}
                      </span>
                      {info.recommended && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          {t("common.recommended")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {t(info.descriptionKey, { defaultValue: info.description })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {downloaded ? (
                      <div className="flex items-center gap-1">
                        {isSelected && (
                          <span className="text-xs font-medium text-primary px-2 py-0.5 bg-primary/10 rounded">
                            {t("common.active")}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(model.model);
                          }}
                          className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : isDownloading ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelDownload();
                        }}
                        disabled={isCancelling}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-destructive border border-destructive/25 rounded hover:bg-destructive/8 transition-colors"
                      >
                        <X size={11} />
                        {isCancelling ? "..." : t("common.cancel")}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(model.model);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                      >
                        <Download size={11} />
                        {t("common.download")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <Button
            onClick={() => setStep("done")}
            disabled={!canContinue}
            className="h-9 px-6 rounded-full text-sm"
          >
            {t("firstRun.model.continue")}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {!canContinue && (
          <p className="text-xs text-muted-foreground/50 text-right mt-2">
            {t("firstRun.model.downloadRequired")}
          </p>
        )}
      </div>
    );
  };

  const renderDone = () => {
    const info = WHISPER_MODEL_INFO[selectedModel];
    return (
      <div className="flex flex-col items-center text-center py-8 px-4">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-success" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t("firstRun.done.title")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          {t("firstRun.done.description", { model: info?.name || selectedModel })}
        </p>
        <p className="text-xs text-muted-foreground/50 max-w-xs mb-8">
          You can change the model or switch to cloud services anytime in Settings.
        </p>
        <Button
          onClick={handleFinish}
          variant="success"
          className="h-10 px-8 rounded-full text-sm"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {t("firstRun.done.launch")}
        </Button>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div
        className="flex items-center justify-end w-full h-10 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {window.electronAPI?.getPlatform?.() !== "darwin" && (
          <div className="pr-1" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
            <WindowControls />
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center px-4 overflow-y-auto">
        <Card className="w-full max-w-lg bg-card/90 backdrop-blur-2xl border border-border/50 dark:border-white/5 shadow-lg rounded-xl overflow-hidden">
          <CardContent className="p-6 md:p-8">
            {step === "welcome" && renderWelcome()}
            {step === "model" && renderModelSelection()}
            {step === "done" && renderDone()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
