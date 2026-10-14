import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileCode,
  FileText,
  Copy,
  Check,
  Play,
  Download,
  Terminal,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface CodebaseExplorerProps {
  onDownloadZip: () => void;
  isDownloading: boolean;
}

interface FileEntry {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
}

export const CodebaseExplorer: React.FC<CodebaseExplorerProps> = ({
  onDownloadZip,
  isDownloading,
}) => {
  const [fileList, setFileList] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('README.md');
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [copied, setCopied] = useState(false);

  // Test Runner State
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    // Fetch file tree
    fetch('/api/repo/files')
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setFileList(data.files);
        }
      })
      .catch(err => console.error('Failed to fetch files:', err));
  }, []);

  useEffect(() => {
    if (!selectedFile) return;
    setIsLoadingContent(true);
    fetch(`/api/repo/file?path=${encodeURIComponent(selectedFile)}`)
      .then(res => res.json())
      .then(data => {
        setFileContent(data.content || '');
      })
      .catch(err => {
        setFileContent(`# Error loading file: ${err.message}`);
      })
      .finally(() => setIsLoadingContent(false));
  }, [selectedFile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestOutput('Running python3 -m unittest discover tests ...');
    try {
      const res = await fetch('/api/run/tests', { method: 'POST' });
      const data = await res.json();
      const output = `${data.stdout || ''}\n${data.stderr || ''}`.trim();
      setTestOutput(output || 'Tests completed with code ' + data.exitCode);
    } catch (err: any) {
      setTestOutput(`Execution error: ${err.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2">
            <span>Repository Workspace</span>
            <span aria-hidden="true">·</span>
            <span>enishi-protocol</span>
            <span aria-hidden="true">·</span>
            <span>Python 3.10+</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Codebase & Live Test Suite
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Inspect all files in the Enishi-Protocol codebase. Run the live Python test suite directly in the sandbox container or download the complete repository for local deployment on your hardware nodes.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-teal-400" />
            <span>{isRunningTests ? 'Running Unittest...' : 'Run Python Tests'}</span>
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-md flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Packaging...' : 'Download .ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Test Execution Output Banner (if run) */}
      {testOutput && (
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              Python Test Runner Output
            </span>
            <button
              onClick={() => setTestOutput(null)}
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              Dismiss
            </button>
          </div>
          <pre className="text-slate-300 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {testOutput}
          </pre>
        </div>
      )}

      {/* Main File Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Tree Column (4 cols) */}
        <div className="lg:col-span-4 p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>Project Files</span>
            <span className="text-[10px] font-mono text-slate-500">enishi-protocol/</span>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-xs">
            {fileList.map(f => {
              if (f.isDir) {
                return (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 px-2 py-1 text-slate-400 font-medium select-none"
                  >
                    <Folder className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{f.path}</span>
                  </div>
                );
              }

              const isSelected = selectedFile === f.path;
              const isTest = f.path.startsWith('tests/');
              const isExample = f.path.startsWith('examples/');

              return (
                <button
                  key={f.path}
                  onClick={() => setSelectedFile(f.path)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {f.name.endsWith('.md') ? (
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isTest ? 'text-amber-400' : isExample ? 'text-teal-400' : 'text-slate-400'}`} />
                    )}
                    <span className="truncate">{f.name}</span>
                  </div>
                  {f.size && (
                    <span className="text-[10px] text-slate-600 tabular-nums shrink-0 ml-2">
                      {Math.round(f.size / 1024 * 10) / 10}kb
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Viewer Column (8 cols) */}
        <div className="lg:col-span-8 p-5 bg-slate-900/90 rounded-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-mono font-semibold text-white">
                {selectedFile}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 bg-slate-950 rounded border border-slate-800/90 font-mono text-xs text-slate-300 overflow-x-auto max-h-[620px] overflow-y-auto leading-relaxed">
            {isLoadingContent ? (
              <div className="py-12 text-center text-slate-500">Loading file content...</div>
            ) : (
              <pre className="text-[11px] font-mono leading-relaxed select-text whitespace-pre">
                {fileContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
