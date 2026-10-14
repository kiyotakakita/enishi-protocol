import React, { useState, useMemo } from 'react';
import {
  CATEGORY_FLAGS,
  CATEGORY_LABELS_JA,
  serializeCapsuleBinary,
} from '../lib/protocolEngine';
import { Layers, FileCode, Check, AlertCircle, Hash, RefreshCw } from 'lucide-react';

export const CapsuleInspector: React.FC = () => {
  const [giveText, setGiveText] = useState('Heirloom Tomato Seeds & Solar Inverter Maintenance');
  const [wantText, setWantText] = useState('Gravity Clean Water Filter Candle & Hand Pump');
  const [selectedCategories, setSelectedCategories] = useState<number>(
    CATEGORY_FLAGS.AGRICULTURE | CATEGORY_FLAGS.ENERGY
  );
  const [nodeHash, setNodeHash] = useState('736872696e653031'); // "shrine01" in hex
  const [zkpCommitment, setZkpCommitment] = useState('a1b2c3d4e5f60718293a4b5c6d7e8f90');
  const [rendezvousToken, setRendezvousToken] = useState('1ea8b84a');

  const toggleCategory = (flag: number) => {
    setSelectedCategories(prev => (prev & flag ? prev ^ flag : prev | flag));
  };

  const binaryResult = useMemo(() => {
    return serializeCapsuleBinary({
      categoryMask: selectedCategories,
      giveText,
      wantText,
      zkpCommitmentHex: zkpCommitment,
      nodeHashHex: nodeHash,
      rendezvousHex: rendezvousToken,
    });
  }, [selectedCategories, giveText, wantText, zkpCommitment, nodeHash, rendezvousToken]);

  const loraMtuMax = 255;
  const percentageOfMtu = Math.min(100, Math.round((binaryResult.size / loraMtuMax) * 100));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
          <span>Layer 1: Off-Grid Physical Layer</span>
          <span aria-hidden="true">·</span>
          <span>LoRa Sub-GHz MTU Optimization</span>
          <span aria-hidden="true">·</span>
          <span>Binary Serialization</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Capsule Binary Bitstream Inspector
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
          Off-grid mesh packets must travel over extreme distances via low-bandwidth LoRa modulations (Spreading Factor 10–12). The binary capsule layout eliminates JSON bloat, packaging header, routing hashes, ZKP commitments, and mutual aid intents into under 255 bytes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Capsule Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-5">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>Capsule Payload Builder</span>
              <span className="text-xs font-mono text-teal-400">EN-V1 Spec</span>
            </h2>

            {/* Give Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Give (提供できるリソース・技能)
              </label>
              <textarea
                value={giveText}
                onChange={e => setGiveText(e.target.value)}
                maxLength={120}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded focus:border-teal-500 focus:outline-none text-slate-200"
              />
              <span className="text-[10px] text-slate-500 block text-right font-mono">
                {giveText.length}/120 characters
              </span>
            </div>

            {/* Want Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">
                Want (必要としている支援・資材)
              </label>
              <textarea
                value={wantText}
                onChange={e => setWantText(e.target.value)}
                maxLength={120}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded focus:border-teal-500 focus:outline-none text-slate-200"
              />
              <span className="text-[10px] text-slate-500 block text-right font-mono">
                {wantText.length}/120 characters
              </span>
            </div>

            {/* Category Bitmask Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Category Bitmask (2 Bytes: 0x{selectedCategories.toString(16).padStart(4, '0').toUpperCase()})
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CATEGORY_FLAGS).map(([key, flag]) => {
                  const isChecked = (selectedCategories & flag) !== 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleCategory(flag)}
                      className={`px-2.5 py-1.5 text-left text-[11px] rounded border transition-colors flex items-center justify-between cursor-pointer ${
                        isChecked
                          ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="truncate">{key}</span>
                      {isChecked && <Check className="w-3 h-3 text-teal-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hex Fields */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Node Hash (8B Hex)
                </label>
                <input
                  type="text"
                  value={nodeHash}
                  onChange={e => setNodeHash(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded font-mono text-slate-300"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Rendezvous (4B Hex)
                </label>
                <input
                  type="text"
                  value={rendezvousToken}
                  onChange={e => setRendezvousToken(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded font-mono text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bitstream & Hex Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* MTU Gauge */}
          <div className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">LoRa SF12/SF10 MTU Budget</span>
              <span className="font-mono text-teal-400">
                <strong className="text-white">{binaryResult.size}</strong> / {loraMtuMax} Bytes ({percentageOfMtu}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${percentageOfMtu}%` }}
                className={`h-full transition-all duration-300 ${
                  binaryResult.size <= loraMtuMax ? 'bg-teal-400' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Header: {binaryResult.headerSize}B</span>
              <span aria-hidden="true">·</span>
              <span>Payload: {binaryResult.bodySize}B</span>
              <span aria-hidden="true">·</span>
              <span>HMAC-SHA256: {binaryResult.signatureSize}B</span>
              <span aria-hidden="true">·</span>
              <span>Margin: {loraMtuMax - binaryResult.size}B free</span>
            </div>
          </div>

          {/* Hex Dump Viewer */}
          <div className="p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-teal-400" />
                Raw Binary Serialization Hex Dump
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Network Byte Order (Big-Endian)
              </span>
            </div>

            <div className="p-3.5 bg-slate-950 rounded border border-slate-800/90 font-mono text-[11px] leading-relaxed text-teal-300 overflow-x-auto">
              <pre>{binaryResult.hexDump}</pre>
            </div>
          </div>

          {/* Binary Specification Legend */}
          <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-300 block mb-1">
              Binary Field Offset Layout:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
              <div>0x00..0x01: Magic "EN" (2B)</div>
              <div>0x02: Version 0x01 (1B)</div>
              <div>0x03..0x04: Category Mask (2B)</div>
              <div>0x05..0x08: CreatedAt Epoch (4B)</div>
              <div>0x09..0x0C: TTL Seconds (4B)</div>
              <div>0x0D..0x1C: Capsule UUID (16B)</div>
              <div>0x1D..0x24: Node Hash (8B)</div>
              <div>0x25..0x34: ZKP Commitment (16B)</div>
              <div>0x35..0x36: Give/Want Len (2B)</div>
              <div>0x37..0x3A: Rendezvous (4B)</div>
              <div>0x3B..Offset: Give & Want Text</div>
              <div>End-16B: Truncated HMAC</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
