import React, { useState } from 'react';
import {
  Send,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Cpu,
} from 'lucide-react';

interface ChannelMessage {
  id: number;
  sender: 'Alice' | 'Bob' | 'Mallory';
  senderFingerprint: string;
  text: string;
  timestamp: string;
}

export const EphemeralTransportLab: React.FC = () => {
  const [channelAddress, setChannelAddress] = useState('enishi://node-shrine-01/eph-1ea8b84a');
  const [channelStatus, setChannelStatus] = useState<'LISTENING' | 'LOCKED' | 'SELF_DESTRUCTED'>('LISTENING');
  const [lockedPeer, setLockedPeer] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);

  // Identities
  const aliceFingerprint = '4c69a2b6e1... (Creator)';
  const bobFingerprint = '278e4001f8... (Legitimate Peer)';
  const malloryFingerprint = '359da069d9... (Intruder Attacker)';

  const handleBobContact = () => {
    if (channelStatus === 'SELF_DESTRUCTED') return;
    setSecurityAlert(null);

    if (channelStatus === 'LISTENING') {
      setChannelStatus('LOCKED');
      setLockedPeer(bobFingerprint);
    }

    const newMsg: ChannelMessage = {
      id: Date.now(),
      sender: 'Bob',
      senderFingerprint: bobFingerprint,
      text: 'Encrypted Handshake: I have your gravity filter candle. Rendezvous at Shrine 14:00.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleAliceReply = () => {
    if (channelStatus === 'SELF_DESTRUCTED') return;
    setSecurityAlert(null);

    const newMsg: ChannelMessage = {
      id: Date.now(),
      sender: 'Alice',
      senderFingerprint: aliceFingerprint,
      text: 'Confirmed. I will bring the heirloom tomato seeds and solar test kit.',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleMalloryIntrusion = () => {
    if (channelStatus === 'SELF_DESTRUCTED') {
      setSecurityAlert('Channel already self-destructed. Connection refused.');
      return;
    }

    if (channelStatus === 'LOCKED') {
      setSecurityAlert(
        `OneSenderLockedViolation: Channel [${channelAddress}] is strictly locked to [${lockedPeer}]. Intrusion attempt by Mallory [${malloryFingerprint}] automatically bounced and discarded!`
      );
    } else {
      // If listening, mallory would lock it
      setChannelStatus('LOCKED');
      setLockedPeer(malloryFingerprint);
      setSecurityAlert('Warning: Mallory locked the channel first! (Always initiate quickly)');
    }
  };

  const handleSelfDestruct = () => {
    setChannelStatus('SELF_DESTRUCTED');
    setMessages([]);
    setLockedPeer(null);
    setSecurityAlert('Auto-Wipe Completed: All in-memory payloads zeroed out (0x00). Zero residual logs.');
  };

  const handleReset = () => {
    setChannelStatus('LISTENING');
    setLockedPeer(null);
    setMessages([]);
    setSecurityAlert(null);
    setChannelAddress(`enishi://node-shrine-01/eph-${Math.random().toString(16).slice(2, 10)}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
          <span>Layer 3: Ephemeral Communication Layer</span>
          <span aria-hidden="true">·</span>
          <span>Clova.Email-Inspired Paradigm</span>
          <span aria-hidden="true">·</span>
          <span>One-Sender Lock</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          One-Sender Disposable Channel Lab
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
          Inspired by Clova.Email's dynamic prefix disposable mailboxes, Enishi-Protocol prevents third-party eavesdropping and man-in-the-middle hijacking by locking the channel strictly to the first verified respondent. Upon exchange completion or timeout, all in-memory traces automatically self-destruct.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Channel Status & Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Disposable Channel State
              </h2>
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Address Badge */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 block">Dynamic Prefix Address</span>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-teal-300 break-all select-all">
                {channelAddress}
              </div>
            </div>

            {/* Status Indicator */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Lock State:</span>
                <span
                  className={`font-semibold font-mono ${
                    channelStatus === 'LISTENING'
                      ? 'text-amber-400'
                      : channelStatus === 'LOCKED'
                      ? 'text-teal-400'
                      : 'text-slate-500 line-through'
                  }`}
                >
                  {channelStatus}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Locked Peer:</span>
                <span className="font-mono text-slate-300">
                  {lockedPeer || 'None (Open to 1st peer)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">In-Memory Buffers:</span>
                <span className="font-mono text-slate-300">
                  {channelStatus === 'SELF_DESTRUCTED' ? 'Wiped (0 Bytes)' : `${messages.length} message(s)`}
                </span>
              </div>
            </div>

            {/* Simulated Action Triggers */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-300 block">
                Simulate Network Traffic:
              </span>

              <button
                type="button"
                onClick={handleBobContact}
                disabled={channelStatus === 'SELF_DESTRUCTED'}
                className="w-full px-3 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bob: Send Handshake (Lock Channel)</span>
              </button>

              <button
                type="button"
                onClick={handleAliceReply}
                disabled={channelStatus !== 'LOCKED'}
                className="w-full px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5 text-teal-400" />
                <span>Alice: Reply to Locked Peer</span>
              </button>

              <button
                type="button"
                onClick={handleMalloryIntrusion}
                disabled={channelStatus === 'SELF_DESTRUCTED'}
                className="w-full px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Mallory: Attempt Intrusion / Eavesdropping</span>
              </button>

              <button
                type="button"
                onClick={handleSelfDestruct}
                disabled={channelStatus === 'SELF_DESTRUCTED'}
                className="w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-950 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trigger In-Memory Self-Destruct</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live In-Memory Message Feed & Security Bounces (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Security Alert Toast */}
          {securityAlert && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg text-xs flex items-start gap-3 text-slate-200">
              <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block text-white">Security Event Log</span>
                <p className="font-mono text-[11px] leading-relaxed text-slate-300">
                  {securityAlert}
                </p>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                In-Memory Message Buffer
              </h3>
              <span className="text-xs font-mono text-slate-500">
                RAM Residency Only (Zero Disk Write)
              </span>
            </div>

            {channelStatus === 'SELF_DESTRUCTED' ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono space-y-2">
                <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>All message buffers zeroed out. Zero residual traces exist.</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 font-mono space-y-1">
                <div>Mailbox is listening at physical node.</div>
                <div>Waiting for first peer contact to lock channel.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      msg.sender === 'Bob'
                        ? 'bg-slate-950/80 border-teal-500/30'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <span>{msg.sender}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          [{msg.senderFingerprint}]
                        </span>
                      </span>
                      <span className="font-mono text-slate-500 text-[10px]">{msg.timestamp}</span>
                    </div>
                    <p className="font-mono text-slate-300 text-[11px] leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clova.Email Protocol Principles */}
          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-300 block mb-1">
              One-Sender Channel Invariants:
            </span>
            <ul className="space-y-1.5 text-slate-400 text-[11px] leading-relaxed list-disc list-inside">
              <li>
                <strong className="text-slate-300">Exclusive Peer Binding:</strong> The first peer submitting a valid handshake permanently locks the channel to their fingerprint.
              </li>
              <li>
                <strong className="text-slate-300">Silent Auto-Bounce:</strong> Any third-party messages or connection attempts are dropped immediately with no leakage of channel contents.
              </li>
              <li>
                <strong className="text-slate-300">Hardware Seizure Immunity:</strong> If the physical node hardware is seized or confiscated, memory is wiped upon power cycle or expiration; no historical logs exist on disk.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
