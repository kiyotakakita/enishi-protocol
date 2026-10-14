import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  ArrowRight,
  Terminal,
  Send,
  Lock,
  Trash2,
  Cpu,
} from 'lucide-react';
import { ProtocolNode } from '../types/protocol';

interface MeshSimulatorProps {
  onRunBackendSimulation: () => void;
  backendOutput: string | null;
  isRunningBackend: boolean;
}

const INITIAL_NODES: ProtocolNode[] = [
  {
    id: 'node-shrine-kitazawa-01',
    name: 'Kitazawa Shrine Waypoint',
    jpName: '北沢八幡の祠 (Seed Anchor)',
    type: 'shrine',
    x: 28,
    y: 35,
    isSeed: true,
    trustScore: 1.0,
    trusted: true,
    capsuleCount: 1,
    loraChannel: '920.8 MHz / SF10',
    batteryStatus: '100% (Solar/LiFePO4)',
  },
  {
    id: 'node-coop-market-02',
    name: 'Farmers Co-op Market',
    jpName: '地域農協直売所 (Co-op Node)',
    type: 'coop',
    x: 72,
    y: 28,
    isSeed: false,
    trustScore: 0.85,
    trusted: true,
    capsuleCount: 3,
    loraChannel: '920.8 MHz / SF10',
    batteryStatus: '94% (Solar)',
  },
  {
    id: 'node-fire-hall-03',
    name: 'Disaster Relief Post',
    jpName: '消防団第2分団 (Civic Post)',
    type: 'station',
    x: 52,
    y: 75,
    isSeed: false,
    trustScore: 0.81,
    trusted: true,
    capsuleCount: 2,
    loraChannel: '920.8 MHz / SF10',
    batteryStatus: '98% (Mains/Battery)',
  },
  {
    id: 'rogue-darknet-sybil-99',
    name: 'Untrusted Rogue Radio',
    jpName: '野良中継器 (Attacker Rogue)',
    type: 'rogue',
    x: 85,
    y: 82,
    isSeed: false,
    trustScore: 0.0,
    trusted: false,
    capsuleCount: 0,
    loraChannel: '920.8 MHz / SF10',
    batteryStatus: 'Unknown (External)',
  },
];

interface SimulationStepDef {
  phase: number;
  timeframe: string;
  title: string;
  subtitle: string;
  actor: string;
  layer: string;
  logs: string[];
  status: 'nominal' | 'attack_blocked' | 'success';
}

const SIMULATION_STEPS: SimulationStepDef[] = [
  {
    phase: 1,
    timeframe: 'System Bootstrap',
    title: 'Anchor Node Web of Trust Convergence',
    subtitle: 'Physical nodes calculate trust scores via anchored EigenTrust iteration',
    actor: 'Protocol Core',
    layer: 'Security Layer (WoT)',
    status: 'nominal',
    logs: [
      'Initialized 3 community trust anchors: Kitazawa Shrine, Co-op Market, Disaster Post',
      'Mutual cryptographic endorsements computed with damping factor α = 0.85',
      'Shrine Node (Seed Anchor) trust score: 1.000 [VERIFIED]',
      'Co-op Node score: 0.850 [VERIFIED] · Fire Hall score: 0.810 [VERIFIED]',
      'Rogue node rogue-darknet-sybil-99 trust score: 0.000 [AUTOMATICALLY BLOCKED]',
    ],
  },
  {
    phase: 2,
    timeframe: 'Citizen Issuance',
    title: 'Zero-Knowledge Citizenship Registry Initialization',
    subtitle: 'Residents receive private witness credentials without revealing identities',
    actor: 'Community Anchor',
    layer: 'Security Layer (ZKP)',
    status: 'nominal',
    logs: [
      'Community anchor issued Citizenship Credentials to Alice and Bob (validity: 90 days)',
      'Commitment C_alice = SHA256(community_id || secret_witness || salt) registered in node ring',
      'Commitment C_bob registered in node ring',
      'Citizenship verified mathematically via Pedersen / Fiat-Shamir NIZK; names and keys remain 100% private',
    ],
  },
  {
    phase: 3,
    timeframe: 'Day T-3 (3 Days Ago)',
    title: 'Alice Deposits Asynchronous Capsule at Shrine Node',
    subtitle: 'Ultra-compact binary capsule (< 255 bytes) verified via ZKP and stored in node ring',
    actor: 'Alice (Citizen)',
    layer: 'Physical & Security Layers',
    status: 'nominal',
    logs: [
      'Alice physically visits Kitazawa Shrine Node (北沢八幡の祠)',
      'Transmitted capsule: Give: Heirloom Tomato Seeds & Solar Diagnostics / Want: Gravity Water Filter',
      'Category mask: 0x0003 (AGRICULTURE | ENERGY)',
      'Payload serialized to 182 bytes (within LoRa 255-byte MTU budget)',
      'Node verified Alice NIZK membership proof -> ADMITTED & SIGNED by Node secret key',
    ],
  },
  {
    phase: 4,
    timeframe: 'Day T-1 (Yesterday)',
    title: 'Attacker Threat Defense: 3 Rogue Attacks Neutralized',
    subtitle: 'WoT and ZKP mechanisms instantly discard malicious, unauthenticated packets',
    actor: 'Mallory (Attacker)',
    layer: 'Governance & Security Layer',
    status: 'attack_blocked',
    logs: [
      'Attack A: Mallory attempts to relay dark-market loan scam through Rogue Node (rogue-darknet-sybil-99)',
      '-> DEFENSE: Web of Trust check failed (Score 0.00 < 0.35 threshold). Inter-node sync rejected.',
      'Attack B: Unvouched scammer attempts direct LoRa packet injection without ZKP proof',
      '-> DEFENSE: Packet dropped at admission barrier (Missing ZKP Citizenship Proof).',
      'Attack C: Attacker generates forged ZKP commitment using unknown community ID',
      '-> DEFENSE: Proof commitment not found in authorized citizen registry. Dropped.',
    ],
  },
  {
    phase: 5,
    timeframe: 'Day T+3 (Today)',
    title: 'Bob Arrives at Shrine & Semantic Matching Pairs Needs',
    subtitle: 'Bob queries node storage; asynchronous rule engine identifies high-affinity mutual aid',
    actor: 'Bob (Citizen)',
    layer: 'Semantic Matching Layer',
    status: 'nominal',
    logs: [
      'Bob visits Shrine Node with portable LoRa terminal',
      'Bob queries active capsules with his profile (Give: Gravity Water Filter / Want: Solar Diagnostics)',
      'Semantic Matcher calculated bidirectional complementarity score: 0.74 (Mutual Aid: TRUE)',
      'Give->Want affinity: 0.66 (Bob supplies Alice filter need)',
      'Want->Give affinity: 0.98 (Alice supplies Bob solar diagnosis need)',
      'Matching rationale: "High-affinity mutual aid pairing across time and geography"',
    ],
  },
  {
    phase: 6,
    timeframe: 'Rendezvous Handshake',
    title: 'One-Sender Ephemeral Channel Locks to Bob',
    subtitle: 'Dynamic prefix address locks to Bob; Mallory attempts intrusion and is bounced',
    actor: 'Bob & Mallory',
    layer: 'Ephemeral Transport Layer',
    status: 'attack_blocked',
    logs: [
      'Alice ephemeral mailbox ready at: enishi://node-shrine-kitazawa-01/eph-1ea8b84a',
      'Bob sends first contact handshake with his session key',
      'Mailbox state transitioned: LISTENING -> LOCKED_TO_SENDER [278e4001f8ebc840]',
      'INTRUSION ATTEMPT: Mallory tries to inject malicious phishing payload into the channel',
      '-> BOUNCED: OneSenderLockedViolation raised! Unauthorized sender 359da069 bounced and logged.',
    ],
  },
  {
    phase: 7,
    timeframe: 'Completion & Auto-Wipe',
    title: 'Message Retrieved & In-Memory Buffers Self-Destruct',
    subtitle: 'Zero residual forensic logs remain on the physical node hardware',
    actor: 'Alice & Shrine Node',
    layer: 'Forensic Zero-Trace Wipe',
    status: 'success',
    logs: [
      'Alice queries mailbox and retrieves Bob rendezvous message: "ENCRYPTED_HELLO_BOB: I have your gravity filter candle!"',
      'Channel triggers immediate self-destruct protocol',
      'In-memory buffers zeroed out with null bytes (0x00)',
      'Session keys and address prefix erased from node memory',
      'Remaining residual traces on physical node: ZERO BYTES',
    ],
  },
];

export const MeshSimulator: React.FC<MeshSimulatorProps> = ({
  onRunBackendSimulation,
  backendOutput,
  isRunningBackend,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedNode, setSelectedNode] = useState<ProtocolNode | null>(INITIAL_NODES[0]);
  const [autoPlay, setAutoPlay] = useState(false);

  const currentStep = SIMULATION_STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < SIMULATION_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
            <span>Enishi-Protocol Physical Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Sub-GHz LoRa Mesh</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Knowledge Trust</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Asynchronous Mesh Simulator
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
            Experience the full lifecycle of an off-grid mutual aid exchange. Follow Alice depositing a capsule at a local shrine node, watch the Web of Trust and ZKP barriers neutralize rogue attacks, and see Bob establish an exclusive One-Sender ephemeral channel.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRunBackendSimulation}
            disabled={isRunningBackend}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Terminal className="w-3.5 h-3.5 text-teal-400" />
            <span>{isRunningBackend ? 'Running Python Script...' : 'Run Python simulation.py'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Physical Node Topology Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              01. Physical Waypoint Network (Kamikitazawa District)
            </h2>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span>Bandwidth: 300 bps – 5 kbps</span>
              <span aria-hidden="true">·</span>
              <span>MTU: 255 Bytes</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full aspect-[16/10] bg-slate-900/90 rounded-lg border border-slate-800 p-6 overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Mesh Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* Shrine to Co-op */}
              <line
                x1="28%"
                y1="35%"
                x2="72%"
                y2="28%"
                stroke="#14b8a6"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-70 animate-pulse"
              />
              {/* Co-op to Fire Hall */}
              <line
                x1="72%"
                y1="28%"
                x2="52%"
                y2="75%"
                stroke="#14b8a6"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-70"
              />
              {/* Fire Hall to Shrine */}
              <line
                x1="52%"
                y1="75%"
                x2="28%"
                y2="35%"
                stroke="#14b8a6"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-70"
              />
              {/* Rogue Attempt (Blocked Red Line) */}
              <line
                x1="85%"
                y1="82%"
                x2="52%"
                y2="75%"
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="2 4"
                className="opacity-40"
              />
            </svg>

            {/* Render Nodes */}
            {INITIAL_NODES.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isTargetPhaseNode = currentStepIndex >= 2 && node.id === 'node-shrine-kitazawa-01';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 group ${
                    isSelected ? 'scale-110 z-20' : 'z-10'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${
                      node.type === 'rogue'
                        ? 'bg-rose-950/80 border-rose-500/50 text-rose-400 group-hover:border-rose-400'
                        : node.isSeed
                        ? 'bg-teal-950/80 border-teal-400 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                        : 'bg-slate-900 border-slate-700 text-slate-300 group-hover:border-slate-500'
                    } ${isTargetPhaseNode ? 'ring-2 ring-teal-400/60 ring-offset-2 ring-offset-slate-950' : ''}`}
                  >
                    <Radio className="w-5 h-5" />
                  </div>

                  {/* Node Label Tooltip */}
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
                    <span className="text-xs font-semibold text-slate-200 block drop-shadow-md">
                      {node.jpName.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums block">
                      WoT Score: {node.trustScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Actor Location Avatars during simulation */}
            {currentStepIndex >= 2 && currentStepIndex <= 4 && (
              <div
                style={{ left: '22%', top: '25%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-500 z-30"
              >
                <div className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-[11px] font-semibold text-amber-300 whitespace-nowrap shadow">
                  Alice (Day T-3)
                </div>
              </div>
            )}

            {currentStepIndex >= 4 && currentStepIndex <= 6 && (
              <div
                style={{ left: '34%', top: '45%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-500 z-30"
              >
                <div className="px-2 py-1 bg-teal-500/20 border border-teal-500/40 rounded text-[11px] font-semibold text-teal-300 whitespace-nowrap shadow">
                  Bob (Day T+3)
                </div>
              </div>
            )}

            {currentStepIndex === 3 && (
              <div
                style={{ left: '88%', top: '72%' }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-500 z-30"
              >
                <div className="px-2 py-1 bg-rose-500/20 border border-rose-500/40 rounded text-[11px] font-semibold text-rose-300 whitespace-nowrap shadow">
                  Mallory (Blocked)
                </div>
              </div>
            )}
          </div>

          {/* Selected Node Inspector Strip */}
          {selectedNode && (
            <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-400">Selected Node: </span>
                <span className="font-semibold text-white">{selectedNode.name}</span>
                <span className="text-slate-500"> ({selectedNode.id})</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <span>Trust Score: <strong className="font-mono tabular-nums text-teal-400">{selectedNode.trustScore.toFixed(3)}</strong></span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Radio: <span className="font-mono text-slate-300">{selectedNode.loraChannel}</span></span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span>Status: <span className={selectedNode.trusted ? 'text-teal-400' : 'text-rose-400'}>{selectedNode.trusted ? 'Active in WoT' : 'Untrusted / Isolated'}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Step Stepper & Execution Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              02. Simulation Timeline ({currentStepIndex + 1}/{SIMULATION_STEPS.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <button
                onClick={handleNext}
                disabled={currentStepIndex === SIMULATION_STEPS.length - 1}
                className="px-2.5 py-1 text-xs text-slate-950 font-semibold bg-teal-400 hover:bg-teal-300 rounded disabled:opacity-40 cursor-pointer"
              >
                Next Phase
              </button>
              <button
                onClick={handleReset}
                title="Reset simulation"
                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Step Card */}
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-mono text-teal-400">{currentStep.timeframe}</span>
                <span aria-hidden="true">·</span>
                <span>{currentStep.layer}</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Phase 0{currentStep.phase}
              </span>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">
                {currentStep.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {currentStep.subtitle}
              </p>
            </div>

            {/* Execution Trace Logs */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800/80 font-mono text-xs space-y-1.5 max-h-56 overflow-y-auto">
              {currentStep.logs.map((log, idx) => {
                const isDefense = log.startsWith('-> DEFENSE:') || log.startsWith('-> BOUNCED:');
                const isAttack = log.startsWith('Attack');
                const isSuccess = log.includes('[VERIFIED]') || log.includes('ADMITTED') || log.includes('SUCCESS:');

                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isDefense
                        ? 'text-rose-400 font-semibold'
                        : isAttack
                        ? 'text-amber-400'
                        : isSuccess
                        ? 'text-teal-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>

            {/* Stepper Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {SIMULATION_STEPS.map((s, idx) => (
                <button
                  key={s.phase}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-teal-400'
                      : idx < currentStepIndex
                      ? 'w-2 bg-slate-600'
                      : 'w-2 bg-slate-800'
                  }`}
                  aria-label={`Jump to phase ${s.phase}`}
                />
              ))}
            </div>
          </div>

          {/* Backend Python Output Terminal (if executed) */}
          {backendOutput && (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-teal-400">
                  <Terminal className="w-3.5 h-3.5" />
                  Live Python Execution (simulation.py)
                </span>
                <span className="text-[10px] text-slate-500">Exit Code: 0</span>
              </div>
              <pre className="text-slate-300 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {backendOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
