import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { calculateWoTScores } from '../lib/protocolEngine';

export const SecurityLab: React.FC = () => {
  // Web of Trust State
  const [dampingFactor, setDampingFactor] = useState(0.85);
  const [threshold, setThreshold] = useState(0.35);

  const [nodes, setNodes] = useState([
    { id: 'node-shrine-01', label: '北沢八幡の祠 (Shrine)', isSeed: true },
    { id: 'node-coop-02', label: '地域直売所 (Co-op)', isSeed: false },
    { id: 'node-station-03', label: '消防団屯所 (Civic Fire)', isSeed: false },
    { id: 'rogue-attacker-99', label: '野良中継器 (Rogue Attacker)', isSeed: false },
  ]);

  const [edges, setEdges] = useState([
    { from: 'node-shrine-01', to: 'node-coop-02', weight: 0.9 },
    { from: 'node-coop-02', to: 'node-station-03', weight: 0.85 },
    { from: 'node-station-03', to: 'node-shrine-01', weight: 0.8 },
  ]);

  const calculatedScores = useMemo(() => {
    return calculateWoTScores(nodes, edges, dampingFactor, 25);
  }, [nodes, edges, dampingFactor]);

  // ZKP Citizenship State
  const [zkpCommunity, setZkpCommunity] = useState('jp-tokyo-setagaya-kamikitazawa');
  const [isCredentialRevoked, setIsCredentialRevoked] = useState(false);
  const [isCredentialRegistered, setIsCredentialRegistered] = useState(true);
  const [tamperProof, setTamperProof] = useState(false);

  const verificationResult = useMemo(() => {
    if (!isCredentialRegistered) {
      return {
        valid: false,
        reason: 'Commitment not found in authorized local citizen registry. Dropped.',
      };
    }
    if (isCredentialRevoked) {
      return {
        valid: false,
        reason: 'Commitment revoked by community governance board. Blacklisted.',
      };
    }
    if (tamperProof) {
      return {
        valid: false,
        reason: 'Cryptographic challenge response mismatch. Forged proof.',
      };
    }
    return {
      valid: true,
      reason: 'Valid Zero-Knowledge Citizenship Verified (Math Proof: Confirmed)',
    };
  }, [isCredentialRegistered, isCredentialRevoked, tamperProof]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
          <span>Layer 2: Security & Governance Layer</span>
          <span aria-hidden="true">·</span>
          <span>Web of Trust (WoT)</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Knowledge Proofs (ZKP)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Security & Trust Governance Lab
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
          Open mesh networks are vulnerable to spam, rogue relay injection, and criminal dark-market recruitment. Enishi-Protocol prevents abuse without central identity authorities by combining anchored Web of Trust (for physical hardware) and Zero-Knowledge Citizenship (for human participants).
        </p>
      </div>

      {/* Grid: WoT on Left (6 cols), ZKP on Right (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Web of Trust Engine */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                Physical Node Web of Trust (WoT)
              </h2>
              <span className="text-xs font-mono text-slate-500">EigenTrust Variant</span>
            </div>

            {/* Parameter Sliders */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Damping Factor α: <span className="font-mono text-white">{dampingFactor.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={dampingFactor}
                  onChange={e => setDampingFactor(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Safety Threshold: <span className="font-mono text-white">{threshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  value={threshold}
                  onChange={e => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </div>
            </div>

            {/* Node Trust Table */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-300 block">
                Calculated Trust Scores & Peering Invariants:
              </span>
              <div className="space-y-2">
                {nodes.map(node => {
                  const score = calculatedScores[node.id] ?? 0;
                  const isTrusted = node.isSeed || score >= threshold;

                  return (
                    <div
                      key={node.id}
                      className={`p-3 rounded border text-xs flex items-center justify-between transition-colors ${
                        isTrusted
                          ? 'bg-slate-950/70 border-slate-800'
                          : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          <span>{node.label}</span>
                          {node.isSeed && (
                            <span className="text-[10px] text-teal-400 border border-teal-500/30 px-1 rounded">
                              Seed Anchor
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {node.id}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono tabular-nums font-semibold text-sm">
                          {score.toFixed(3)}
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            isTrusted ? 'text-teal-400' : 'text-rose-400'
                          }`}
                        >
                          {isTrusted ? 'ADMITTED' : 'BLOCKED'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Sybil Resistance Mechanism:</strong> Even if Mallory spins up 1,000 virtual nodes, none are endorsed by physical seed anchors. The damping factor α teleports probability back to the verified anchors, starving rogue nodes of trust.
            </div>
          </div>
        </div>

        {/* Right Column: Zero-Knowledge Proof Playground */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-400" />
                Zero-Knowledge Proof (ZKP) Verification
              </h2>
              <span className="text-xs font-mono text-slate-500">Fiat-Shamir NIZK</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Community Identity Scope
                </label>
                <input
                  type="text"
                  value={zkpCommunity}
                  onChange={e => setZkpCommunity(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded font-mono text-slate-300"
                />
              </div>

              {/* Interactive Attack Simulations */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-300 block">
                  Simulate Citizen Credential State:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCredentialRegistered(true);
                      setIsCredentialRevoked(false);
                      setTamperProof(false);
                    }}
                    className={`px-2.5 py-2 rounded text-xs border text-center transition-colors cursor-pointer ${
                      isCredentialRegistered && !isCredentialRevoked && !tamperProof
                        ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Legitimate Citizen
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCredentialRegistered(false);
                      setTamperProof(false);
                    }}
                    className={`px-2.5 py-2 rounded text-xs border text-center transition-colors cursor-pointer ${
                      !isCredentialRegistered
                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Unregistered Spammer
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCredentialRegistered(true);
                      setIsCredentialRevoked(true);
                      setTamperProof(false);
                    }}
                    className={`px-2.5 py-2 rounded text-xs border text-center transition-colors cursor-pointer ${
                      isCredentialRevoked
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Revoked Bad Actor
                  </button>
                </div>
              </div>

              {/* Verification Outcome Box */}
              <div
                className={`p-4 rounded-lg border text-xs space-y-1.5 ${
                  verificationResult.valid
                    ? 'bg-teal-950/20 border-teal-500/40 text-teal-300'
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {verificationResult.valid ? (
                    <CheckCircle className="w-4 h-4 text-teal-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {verificationResult.valid ? 'ZKP PROOF ACCEPTED' : 'ZKP PROOF REJECTED'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90 font-mono">
                  {verificationResult.reason}
                </p>
              </div>

              {/* Mathematical Explanation */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed font-mono">
                <div>Commitment C = SHA256(community || secret || salt)</div>
                <div>Challenge c = SHA256(C || R || capsule_id || timestamp)</div>
                <div>Response z = HMAC(witness_key, c || ephemeral_r)</div>
                <div className="mt-1 text-slate-500 text-[10px]">
                  * Proves possession of witness without disclosing name, phone, or public key.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
