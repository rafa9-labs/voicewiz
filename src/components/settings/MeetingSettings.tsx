import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsRow } from "../ui/SettingsSection";
import { Toggle } from "../ui/toggle";
import TranscriptionModelPicker from "../TranscriptionModelPicker";

export function MeetingSpeakerDetectionRow() {
  const { t } = useTranslation();
  const speakerDiarizationEnabled = useSettingsStore((s) => s.speakerDiarizationEnabled);
  const setSpeakerDiarizationEnabled = useSettingsStore((s) => s.setSpeakerDiarizationEnabled);

  return (
    <SettingsRow
      label={t("settings.meeting.speakerDetection.title")}
      description={t("settings.meeting.speakerDetection.description")}
    >
      <Toggle checked={speakerDiarizationEnabled} onChange={setSpeakerDiarizationEnabled} />
    </SettingsRow>
  );
}

export function MeetingTranscriptionPanel() {
  const { t } = useTranslation();

  const {
    meetingWhisperModel,
    setMeetingWhisperModel,
    meetingLocalTranscriptionProvider,
    setMeetingLocalTranscriptionProvider,
    meetingParakeetModel,
    setMeetingParakeetModel,
  } = useSettingsStore();

  const handleLocalTranscriptionModelSelect = useCallback(
    (modelId: string) => {
      if (meetingLocalTranscriptionProvider === "nvidia") {
        setMeetingParakeetModel(modelId);
      } else {
        setMeetingWhisperModel(modelId);
      }
    },
    [meetingLocalTranscriptionProvider, setMeetingParakeetModel, setMeetingWhisperModel]
  );

  return (
    <div className="space-y-3">
      <TranscriptionModelPicker
        streamingOnly
        selectedCloudProvider=""
        onCloudProviderSelect={() => {}}
        selectedCloudModel=""
        onCloudModelSelect={() => {}}
        selectedLocalModel={
          meetingLocalTranscriptionProvider === "nvidia" ? meetingParakeetModel : meetingWhisperModel
        }
        onLocalModelSelect={handleLocalTranscriptionModelSelect}
        selectedLocalProvider={meetingLocalTranscriptionProvider}
        onLocalProviderSelect={setMeetingLocalTranscriptionProvider}
        useLocalWhisper={true}
        onModeChange={() => {}}
        mode="local"
        variant="settings"
      />
      <MeetingSpeakerDetectionRow />
    </div>
  );
}
