import React from 'react';
import { Download, Terminal, Shield, Radio, Cpu, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  isDownloading,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <button
            onClick={() => setActiveTab('simulator')}
            className="text-left group cursor-pointer"
          >
            <span className="text-lg font-bold tracking-tight text-white block">
              Enishi-Protocol
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean unboxed typography) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'simulator' ? 'text-teal-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Interactive Mesh
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'inspector' ? 'text-teal-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Capsule Bitstream
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'security' ? 'text-teal-400 font-semibold' : 'text-slate-400'
            }`}
          >
            WoT & ZKP Lab
          </button>
          <button
            onClick={() => setActiveTab('transport')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'transport' ? 'text-teal-400 font-semibold' : 'text-slate-400'
            }`}
          >
            One-Sender Transport
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              activeTab === 'code' ? 'text-teal-400 font-semibold' : 'text-slate-400'
            }`}
          >
            Codebase & Tests
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-colors rounded-md flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Packaging...' : 'Download Repo .ZIP'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
