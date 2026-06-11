import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// Use vi.hoisted so these are available in hoisted vi.mock factories
const state = vi.hoisted(() => ({
  isRecording: false,
  isProcessing: false,
}));

// Mock electronAPI on window before any module loads
vi.stubGlobal("electronAPI", {
  setMainWindowInteractivity: vi.fn(),
  resizeMainWindow: vi.fn(),
  onHotkeyFallbackUsed: vi.fn().mockReturnValue(() => {}),
  onHotkeyRegistrationFailed: vi.fn().mockReturnValue(() => {}),
  onCorrectionsLearned: vi.fn().mockReturnValue(() => {}),
  onFloatingIconAutoHideChanged: vi.fn().mockReturnValue(() => {}),
  onToggleDictation: vi.fn().mockReturnValue(() => {}),
  onCancelHotkeyPressed: vi.fn().mockReturnValue(() => {}),
  registerCancelHotkey: vi.fn(),
  unregisterCancelHotkey: vi.fn(),
  hideWindow: vi.fn(),
  showDictationPanel: vi.fn(),
});

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { changeLanguage: vi.fn(), language: "en" },
    }),
  };
});

vi.mock("lucide-react", () => ({
  X: () => null,
  Mic: () => null,
  Loader2: () => null,
}));

vi.mock("../components/ui/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
    dismiss: vi.fn(),
    toastCount: 0,
  }),
}));

vi.mock("../components/ui/LoadingDots", () => ({
  LoadingDots: () => null,
}));

vi.mock("../hooks/useHotkey", () => ({
  useHotkey: () => ({ hotkey: "Control+Super" }),
}));

vi.mock("../utils/hotkeys", () => ({
  formatHotkeyLabel: (h: string) => h,
}));

vi.mock("../hooks/useWindowDrag", () => ({
  useWindowDrag: () => ({
    isDragging: false,
    handleMouseDown: vi.fn(),
    handleMouseUp: vi.fn(),
  }),
}));

vi.mock("../hooks/useAudioRecording", () => ({
  useAudioRecording: () => ({
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    isStreaming: false,
    transcript: "",
    partialTranscript: "",
    toggleListening: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    cancelRecording: vi.fn(),
    cancelProcessing: vi.fn(),
  }),
}));

vi.mock("../stores/settingsStore", () => ({
  useSettingsStore: vi.fn((selector?: (s: any) => any) => {
    const state = { floatingIconAutoHide: false, panelStartPosition: "bottom-right" };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("../components/RecordingHUD", () => ({
  default: () => null,
}));

// Must import App AFTER all mocks are registered
import App from "../App";

describe("App component — TDZ regression & resize states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isRecording = false;
    state.isProcessing = false;
  });

  it("renders without crashing — confirms no TDZ ReferenceError on isRecording/isProcessing", () => {
    render(<App />);
    const container = document.querySelector(".dictation-window");
    expect(container).toBeTruthy();
  });

  it("calls resizeMainWindow('BASE') on idle render", () => {
    render(<App />);
    expect(window.electronAPI.resizeMainWindow).toHaveBeenCalledWith("BASE");
  });

  it("calls resizeMainWindow('RECORDING') when isRecording is true", () => {
    window.electronAPI.resizeMainWindow = vi.fn();
    state.isRecording = true;

    render(<App />);
    expect(window.electronAPI.resizeMainWindow).toHaveBeenCalledWith("RECORDING");
  });

  it("calls resizeMainWindow('RECORDING') when isProcessing is true", () => {
    window.electronAPI.resizeMainWindow = vi.fn();
    state.isProcessing = true;

    render(<App />);
    expect(window.electronAPI.resizeMainWindow).toHaveBeenCalledWith("RECORDING");
  });

  it("shows dark background when recording", () => {
    state.isRecording = true;
    render(<App />);
    const container = document.querySelector(".dictation-window") as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.style.background).toBe("rgba(14, 14, 18, 0.92)");
  });

  it("shows transparent background when idle", () => {
    render(<App />);
    const container = document.querySelector(".dictation-window") as HTMLElement;
    expect(container).toBeTruthy();
    expect(container.style.background).toBe("transparent");
  });
});
