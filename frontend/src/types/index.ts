export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type ProjectType = 'WEB_APP' | 'DSA';

export interface User {
  id: number;
  username: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProjectSummary {
  id: number;
  name: string;
  type?: ProjectType;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: number;
  username: string;
  name?: string;
  role: ProjectRole;
  invitedAt: string;
}

export type ChatEventType = 'THOUGHT' | 'MESSAGE' | 'FILE_EDIT' | 'TOOL_LOG';

export interface ChatEvent {
  id?: number;
  type: ChatEventType;
  sequenceOrder: number;
  content?: string;
  filePath?: string;
  metadata?: string;
}

export interface ChatMessage {
  id?: number;
  role: 'USER' | 'ASSISTANT';
  content?: string;
  events?: ChatEvent[];
  tokensUsed?: number;
  createdAt?: string;
}

export interface FileNode {
  path: string;
}

export interface FileTreeResponse {
  files: FileNode[];
}

export interface FileContentResponse {
  path: string;
  content: string;
}

// Billing & Plans
export interface Plan {
  id: number;
  name: string;
  maxProjects: number;
  maxTokensPerDay: number;
  maxPreviews?: number;
  unlimitedAi: boolean;
  price?: string;
  active?: boolean;
}

export interface Subscription {
  plan?: Plan;
  status?: string;
  currentPeriodEnd?: string;
  tokensUsedThisCycle?: number;
}

export interface UsageToday {
  tokensUsed: number;
  tokensLimit: number;
  previewsRunning: number;
  previewsLimit: number;
}

// DSA Suite & Testing
export type ProgrammingLanguage = 'CPP' | 'JAVA' | 'PYTHON';
export type TestCaseStatus = 'FAILING' | 'RESOLVED';

export interface DsaSuiteResponse {
  projectId: number;
  language: ProgrammingLanguage;
  bruteForceCode: string;
  bruteForcePath: string;
  generatorCode: string;
  generatorPath: string;
  inputConstraints: string;
}

export interface StressTestResultResponse {
  foundCounterexample: boolean;
  failingInput?: string;
  expectedOutput?: string;
  actualOutput?: string;
  message: string;
  iterationsRun: number;
  bruteForceCode?: string;
  generatorCode?: string;
}

export interface TestCase {
  id: number;
  projectId: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  explanation: string;
  status: TestCaseStatus;
  createdAt: string;
}

// Kubernetes Preview
export interface K8sPreviewStatusResponse {
  projectId: number;
  podName: string;
  status: string;
  cluster: string;
  nodeName: string;
  podIp: string;
  previewUrl: string;
  logs: string;
  port: number;
}
