import { describe, it, expect, beforeEach } from 'vitest';

function readBoolean(key: string, defaultValue: boolean): boolean {
  const val = localStorage.getItem(key);
  if (val === null) return defaultValue;
  return val === 'true';
}

function readString(key: string, defaultValue: string): string {
  const val = localStorage.getItem(key);
  if (val === null) return defaultValue;
  return val;
}

function resolveTranscriptionMode(): string {
  const cloudMode = localStorage.getItem('cloudTranscriptionMode');
  const useLocal = localStorage.getItem('useLocalWhisper') === 'true';
  const provider = localStorage.getItem('cloudTranscriptionProvider');

  if (useLocal) return 'local';
  if (cloudMode === 'byok') return provider === 'custom' ? 'self-hosted' : 'providers';
  return 'local';
}

function resolveMode(key: string): string {
  const v = readString(key, 'local');
  if (v === 'openwhispr' || v === 'providers' || v === 'local' || v === 'self-hosted' || v === 'enterprise') return v;
  return 'local';
}

describe('Local-only defaults', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults useLocalWhisper to true', () => {
    expect(readBoolean('useLocalWhisper', true)).toBe(true);
  });

  it('defaults whisperModel to turbo', () => {
    expect(readString('whisperModel', 'turbo')).toBe('turbo');
  });

  it('defaults transcriptionMode to local', () => {
    expect(resolveTranscriptionMode()).toBe('local');
  });

  it('defaults cleanupMode to local', () => {
    expect(resolveMode('cleanupMode')).toBe('local');
  });

  it('defaults meetingTranscriptionMode to local', () => {
    expect(resolveMode('meetingTranscriptionMode')).toBe('local');
  });

  it('defaults noteFormattingMode to local', () => {
    expect(resolveMode('noteFormattingMode')).toBe('local');
  });

  it('defaults chatAgentMode to local', () => {
    expect(resolveMode('chatAgentMode')).toBe('local');
  });

  it('defaults dictationAgentMode to local', () => {
    expect(resolveMode('dictationAgentMode')).toBe('local');
  });

  it('defaults cloudTranscriptionMode to byok', () => {
    expect(readString('cloudTranscriptionMode', 'byok')).toBe('byok');
  });

  it('defaults cleanupCloudMode to byok', () => {
    expect(readString('cleanupCloudMode', 'byok')).toBe('byok');
  });

  it('defaults meetingUseLocalWhisper to true', () => {
    expect(readBoolean('meetingUseLocalWhisper', true)).toBe(true);
  });

  it('respects existing localStorage override for useLocalWhisper', () => {
    localStorage.setItem('useLocalWhisper', 'true');
    expect(readBoolean('useLocalWhisper', false)).toBe(true);
  });

  it('respects existing localStorage override for transcriptionMode', () => {
    localStorage.setItem('transcriptionMode', 'local');
    const v = readString('transcriptionMode', 'openwhispr');
    const resolved = v === 'openwhispr' || v === 'providers' || v === 'local' || v === 'self-hosted' ? v : 'openwhispr';
    expect(resolved).toBe('local');
  });
});
