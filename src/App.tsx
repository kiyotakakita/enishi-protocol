/**
 * Enishi-Protocol (縁プロトコル) Web Workstation & Interactive Simulator
 * Asynchronous Physical Mesh Protocol with Zero-Knowledge Trust & Ephemeral One-Sender Channels
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { MeshSimulator } from './components/MeshSimulator';
import { CapsuleInspector } from './components/CapsuleInspector';
import { SecurityLab } from './components/SecurityLab';
import { EphemeralTransportLab } from './components/EphemeralTransportLab';
import { CodebaseExplorer } from './components/CodebaseExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('simulator');
  const [isDownloading, setIsDownloading] = useState(false);
  const [backendOutput, setBackendOutput] = useState<string | null>(null);
  const [isRunningBackend, setIsRunningBackend] = useState(false);

  // Live Python backend simulation trigger
  const handleRunBackendSimulation = async () => {
    setIsRunningBackend(true);
    setBackendOutput('Executing python3 examples/simulation.py in container runtime...');
    try {
      const res = await fetch('/api/run/simulation', { method: 'POST' });
      const data = await res.json();
      const output = `${data.stdout || ''}\n${data.stderr || ''}`.trim();
      setBackendOutput(output || 'Simulation finished with exit code ' + data.exitCode);
    } catch (err: any) {
      setBackendOutput(`Backend execution error: ${err.message}`);
    } finally {
      setIsRunningBackend(false);
    }
  };

  // Download entire repository as authentic .zip archive
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/repo/bundle');
      const data = await res.json();
      if (!data.files) {
        throw new Error('No files returned from bundle endpoint');
      }

      const zip = new JSZip();
      const rootFolder = zip.folder('enishi-protocol');

      for (const [relPath, content] of Object.entries(data.files as Record<string, string>)) {
        rootFolder?.file(relPath, content);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enishi-protocol.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download ZIP:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulator' && (
          <MeshSimulator
            onRunBackendSimulation={handleRunBackendSimulation}
            backendOutput={backendOutput}
            isRunningBackend={isRunningBackend}
          />
        )}

        {activeTab === 'inspector' && <CapsuleInspector />}

        {activeTab === 'security' && <SecurityLab />}

        {activeTab === 'transport' && <EphemeralTransportLab />}

        {activeTab === 'code' && (
          <CodebaseExplorer
            onDownloadZip={handleDownloadZip}
            isDownloading={isDownloading}
          />
        )}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-800/80 py-6 bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Enishi-Protocol (縁プロトコル)</span>
            <span aria-hidden="true">·</span>
            <span>Apache-2.0 License</span>
            <span aria-hidden="true">·</span>
            <span>Version 0.2.0</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Mesh Simulator
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Binary Capsule
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              WoT & ZKP
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Codebase
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
