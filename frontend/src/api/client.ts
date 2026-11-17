import axios from 'axios';
import { 
  AuthResponse, 
  ProjectSummary, 
  ProjectMember, 
  FileTreeResponse, 
  FileContentResponse, 
  ChatMessage, 
  Plan, 
  Subscription, 
  UsageToday,
  ProjectType,
  ProgrammingLanguage,
  DsaSuiteResponse,
  TestCase,
  TestCaseStatus
} from '../types';

const API_BASE = '/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('lovable_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('lovable_token', token);
};

export const clearAuthToken = () => {
  localStorage.removeItem('lovable_token');
  localStorage.removeItem('lovable_user');
};

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

// Auth
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', { username, password });
  setAuthToken(res.data.token);
  localStorage.setItem('lovable_user', JSON.stringify(res.data.user));
  return res.data;
};

export const signup = async (name: string, username: string, password: string): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/signup', { name, username, password });
  setAuthToken(res.data.token);
  localStorage.setItem('lovable_user', JSON.stringify(res.data.user));
  return res.data;
};

// Projects
export const fetchProjects = async (): Promise<ProjectSummary[]> => {
  const res = await api.get<ProjectSummary[]>('/projects');
  return res.data;
};

export const createProject = async (name: string, type: ProjectType = 'WEB_APP'): Promise<ProjectSummary> => {
  const res = await api.post<ProjectSummary>('/projects', { name, type });
  return res.data;
};

// Project Members
export const fetchProjectMembers = async (projectId: number): Promise<ProjectMember[]> => {
  const res = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return res.data;
};

export const inviteMember = async (projectId: number, username: string, role: string): Promise<ProjectMember> => {
  const res = await api.post<ProjectMember>(`/projects/${projectId}/members`, { username, role });
  return res.data;
};

export const updateMemberRole = async (projectId: number, memberId: number, role: string): Promise<ProjectMember> => {
  const res = await api.patch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role });
  return res.data;
};

export const removeMember = async (projectId: number, userId: number): Promise<void> => {
  await api.delete(`/projects/${projectId}/members/${userId}`);
};

// Files
export const fetchFileTree = async (projectId: number): Promise<FileTreeResponse> => {
  const res = await api.get<FileTreeResponse>(`/projects/${projectId}/files`);
  return res.data;
};

export const fetchFileContent = async (projectId: number, path: string): Promise<FileContentResponse> => {
  const res = await api.get<FileContentResponse>(`/projects/${projectId}/files/content`, {
    params: { path },
  });
  return res.data;
};

// Chat
export const fetchChatHistory = async (projectId: number): Promise<ChatMessage[]> => {
  const res = await api.get<ChatMessage[]>(`/chat/projects/${projectId}`);
  return res.data;
};

// SSE Chat Streaming
export const streamChat = async (
  projectId: number,
  message: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: any) => void
) => {
  const token = getAuthToken();
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ projectId, message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace('data:', '').trim();
          if (jsonStr) {
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) {
                onChunk(parsed.text);
              }
            } catch (e) {
              onChunk(jsonStr);
            }
          }
        }
      }
    }
    onComplete();
  } catch (err) {
    onError(err);
  }
};

// Plans & Billing
export const fetchPlans = async (): Promise<Plan[]> => {
  const res = await api.get<Plan[]>('/plans');
  return res.data;
};

export const fetchMySubscription = async (): Promise<Subscription> => {
  const res = await api.get<Subscription>('/me/subscription');
  return res.data;
};

export const createCheckoutSession = async (planId: number): Promise<{ checkoutUrl: string }> => {
  const res = await api.post<{ checkoutUrl: string }>('/payments/checkout', { planId });
  return res.data;
};

export const openCustomerPortal = async (): Promise<{ portalUrl: string }> => {
  const res = await api.post<{ portalUrl: string }>('/payments/portal');
  return res.data;
};

// Usage
export const fetchTodayUsage = async (): Promise<UsageToday> => {
  const res = await api.get<UsageToday>('/usage/today');
  return res.data;
};

// DSA Suite & Adversary APIs
export const synthesizeDsaSuite = async (
  projectId: number,
  language: ProgrammingLanguage,
  problemDescription: string,
  userSolution: string
): Promise<DsaSuiteResponse> => {
  const res = await api.post<DsaSuiteResponse>(`/dsa/${projectId}/synthesize-suite`, {
    language,
    problemDescription,
    userSolution,
  });
  return res.data;
};

export const fetchTestCases = async (projectId: number, status?: TestCaseStatus): Promise<TestCase[]> => {
  const res = await api.get<TestCase[]>(`/dsa/${projectId}/test-cases`, {
    params: status ? { status } : {},
  });
  return res.data;
};

export const archiveTestCase = async (
  projectId: number,
  testCase: { input: string; expectedOutput: string; actualOutput: string; explanation: string }
): Promise<TestCase> => {
  const res = await api.post<TestCase>(`/dsa/${projectId}/test-cases`, testCase);
  return res.data;
};

export const updateTestCaseStatus = async (
  projectId: number,
  testCaseId: number,
  status: TestCaseStatus
): Promise<TestCase> => {
  const res = await api.patch<TestCase>(`/dsa/${projectId}/test-cases/${testCaseId}`, null, {
    params: { status },
  });
  return res.data;
};

// SSE DSA Failure Diagnosis Streaming
export const streamDsaDiagnosis = async (
  projectId: number,
  data: {
    language: ProgrammingLanguage;
    userCode: string;
    failingInput: string;
    expectedOutput: string;
    actualOutput: string;
  },
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (err: any) => void
) => {
  const token = getAuthToken();
  try {
    const response = await fetch(`/api/dsa/${projectId}/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim().startsWith('data:')) {
          const jsonStr = line.replace('data:', '').trim();
          try {
            const p = JSON.parse(jsonStr);
            if (p.text) onChunk(p.text);
          } catch {
            onChunk(jsonStr);
          }
        }
      }
    }
    onComplete();
  } catch (e) {
    onError(e);
  }
};
