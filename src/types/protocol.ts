export interface ProtocolNode {
  id: string;
  name: string;
  jpName: string;
  type: 'shrine' | 'coop' | 'station' | 'rogue';
  x: number;
  y: number;
  isSeed: boolean;
  trustScore: number;
  trusted: boolean;
  capsuleCount: number;
  loraChannel: string;
  batteryStatus: string;
}

export interface ProtocolCapsule {
  id: string;
  creatorName: string;
  nodeId: string;
  createdAtText: string;
  createdDaysAgo: number;
  ttlDays: number;
  categoryMask: number;
  categoryNames: string[];
  giveText: string;
  wantText: string;
  zkpCommitment: string;
  rendezvousToken: string;
  signature: string;
  byteSize: number;
  isAdmitted: boolean;
}

export interface SimulationStep {
  id: number;
  phase: string;
  timeLabel: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'success' | 'blocked';
  actor: string;
  details: string[];
  layer: 'physical' | 'security' | 'transport' | 'matching';
}

export interface RepoFile {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
}
