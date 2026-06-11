import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import {
  useSettingsStore,
  selectResolvedLLMConfig,
  setResolvedLLMConfig,
} from "../../stores/settingsStore";
import ReasoningModelSelector from "../ReasoningModelSelector";
import { Toggle } from "../ui/toggle";
import { getLocalModel } from "../../models/ModelRegistry";
import type { InferenceScope } from "../../config/inferenceScopes";

interface InferenceConfigEditorProps {
  scope: InferenceScope;
  onModeChange?: (mode: string) => void;
}

export default function InferenceConfigEditor({ scope, onModeChange }: InferenceConfigEditorProps) {
  const { t } = useTranslation();
  const config = useSettingsStore(useShallow((s) => selectResolvedLLMConfig(s, scope)));

  const setField = useCallback(
    <K extends keyof Omit<typeof config, "scope">>(field: K) =>
      (value: NonNullable<(typeof config)[K]>) => {
        setResolvedLLMConfig(scope, { [field]: value });
      },
    [scope]
  );

  const setMode = setField("mode");
  const setProvider = setField("provider");
  const setModel = setField("model");

  return (
    <div className="space-y-3">
      <ReasoningModelSelector
        reasoningModel={config.model}
        setReasoningModel={setModel}
        localReasoningProvider={config.provider}
        setLocalReasoningProvider={setProvider}
        cloudReasoningBaseUrl=""
        setCloudReasoningBaseUrl={setField("cloudBaseUrl")}
        customReasoningApiKey={config.customApiKey ?? ""}
        setCustomReasoningApiKey={setField("customApiKey")}
        setReasoningMode={setMode}
        mode="local"
      />

      {!!getLocalModel(config.model)?.supportsThinking && (
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground">
              {t("reasoning.disableThinking.label")}
            </h4>
            <p className="text-xs text-muted-foreground">{t("reasoning.disableThinking.help")}</p>
          </div>
          <Toggle checked={config.disableThinking} onChange={setField("disableThinking")} />
        </div>
      )}
    </div>
  );
}
