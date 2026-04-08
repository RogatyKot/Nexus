/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Cpu, 
  Database, 
  Zap, 
  PlusCircle, 
  Bolt, 
  Send, 
  Terminal as TerminalIcon,
  Battery,
  Wifi,
  Folder,
  File,
  FolderPlus,
  FilePlus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  HardDrive,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'error' | 'code' | 'user';
}

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isOpen?: boolean;
  parentId?: string | null;
}

const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'NEXUS_CORE',
    type: 'directory',
    isOpen: true,
    parentId: null,
    children: [
      {
        id: 'sys',
        name: 'system',
        type: 'directory',
        isOpen: true,
        parentId: 'root',
        children: [
          { id: 'kernel', name: 'kernel.bin', type: 'file', parentId: 'sys' },
          { id: 'boot', name: 'boot.conf', type: 'file', parentId: 'sys' },
        ]
      },
      {
        id: 'usr',
        name: 'users',
        type: 'directory',
        parentId: 'root',
        children: [
          { id: 'admin', name: 'admin_profile.json', type: 'file', parentId: 'usr' },
        ]
      },
      { id: 'readme', name: 'README.txt', type: 'file', parentId: 'root' },
    ]
  }
];

interface FileExplorerNodeProps {
  key?: string | number;
  node: FileNode;
  depth?: number;
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  toggleFolder: (id: string) => void;
  createFile: (parentId: string, type: 'file' | 'directory') => void;
  deleteFile: (id: string) => void;
  startRename: (node: FileNode) => void;
  saveRename: () => void;
  downloadFile: (node: FileNode) => void;
}

const FileExplorerNode = ({ 
  node, 
  depth = 0, 
  editingId, 
  editName, 
  setEditName, 
  toggleFolder, 
  createFile, 
  deleteFile, 
  startRename, 
  saveRename,
  downloadFile 
}: FileExplorerNodeProps) => {
  const isEditing = editingId === node.id;

  return (
    <div className="flex flex-col">
      <div 
        className={`group flex items-center py-1 px-2 hover:bg-emerald-500/10 rounded cursor-pointer transition-colors ${isEditing ? 'bg-emerald-500/20' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center flex-1 min-w-0" onClick={() => node.type === 'directory' && toggleFolder(node.id)}>
          {node.type === 'directory' ? (
            <>
              {node.isOpen ? <ChevronDown className="w-3 h-3 mr-1 shrink-0" /> : <ChevronRight className="w-3 h-3 mr-1 shrink-0" />}
              <Folder className="w-4 h-4 mr-2 text-emerald-400 shrink-0" />
            </>
          ) : (
            <File className="w-4 h-4 mr-2 text-emerald-200/50 ml-4 shrink-0" />
          )}
          
          {isEditing ? (
            <input 
              autoFocus
              className="bg-emerald-950 border border-emerald-500 text-xs px-1 outline-none w-full"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveRename()}
              onBlur={saveRename}
            />
          ) : (
            <span className="text-xs truncate">{node.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-1 ml-2 shrink-0">
            {node.type === 'directory' ? (
              <>
                <button onClick={(e) => { e.stopPropagation(); createFile(node.id, 'file'); }} title="Nowy plik">
                  <FilePlus className="w-3 h-3 hover:text-emerald-300" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); createFile(node.id, 'directory'); }} title="Nowy folder">
                  <FolderPlus className="w-3 h-3 hover:text-emerald-300" />
                </button>
              </>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); downloadFile(node); }} title="Pobierz">
                <Download className="w-3 h-3 hover:text-emerald-300" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); startRename(node); }} title="Zmień nazwę">
              <Edit2 className="w-3 h-3 hover:text-emerald-300" />
            </button>
            {node.id !== 'root' && (
              <button onClick={(e) => { e.stopPropagation(); deleteFile(node.id); }} title="Usuń">
                <Trash2 className="w-3 h-3 hover:text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {node.type === 'directory' && node.isOpen && node.children && (
        <div className="flex flex-col">
          {node.children.map(child => (
            <FileExplorerNode 
              key={child.id} 
              node={child} 
              depth={depth + 1}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              toggleFolder={toggleFolder}
              createFile={createFile}
              deleteFile={deleteFile}
              startRename={startRename}
              saveRename={saveRename}
              downloadFile={downloadFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [cpuLoad, setCpuLoad] = useState(12);
  const [ramUsage, setRamUsage] = useState(2.4);
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Initialize Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const addLog = (text: string, type: 'info' | 'error' | 'code' | 'user' = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    const sequence = [
      { text: 'Inicjalizacja Nexus OS...', delay: 0 },
      { text: 'Uzyskiwanie uprawnień ROOT...', delay: 500 },
      { text: 'Protokół samonaprawy: AKTYWNY', delay: 1000 },
      { text: 'Skanowanie struktury plików urządzenia...', delay: 1500 },
      { text: 'Połączono z lokalnym API Android/iOS.', delay: 2500 },
      { text: 'System gotowy na Twoje polecenia.', delay: 3500 },
    ];

    sequence.forEach(item => {
      setTimeout(() => addLog(item.text), item.delay);
    });

    const interval = setInterval(() => {
      setCpuLoad(Math.floor(Math.random() * 30 + 5));
      setRamUsage(parseFloat((Math.random() * 1 + 2).toFixed(1)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSendCommand = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg = input;
    setInput('');
    addLog(userMsg, 'user');
    setIsProcessing(true);

    try {
      addLog('Przetwarzanie zapytania przez rdzeń AI...', 'info');
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: "Jesteś Nexus Core AI, futurystycznym systemem operacyjnym AI. Odpowiadaj w stylu terminalowym, technologicznym, zwięźle, po polsku. Używaj terminologii hakerskiej i systemowej.",
        }
      });

      const response = result.text;
      if (response) {
        addLog(response, response.includes('```') ? 'code' : 'info');
      }
    } catch (error) {
      console.error(error);
      addLog('Błąd krytyczny: Nieudane połączenie z rdzeniem AI.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateAction = (action: 'Gen_App' | 'Optimize') => {
    if (action === 'Gen_App') {
      addLog('Inicjowanie modułu projektowania aplikacji...');
      setTimeout(() => addLog('Generowanie szablonu HTML5/JS...', 'code'), 800);
      setTimeout(() => addLog('Wdrażanie interfejsu w piaskownicy...', 'code'), 1500);
      setTimeout(() => addLog('Aplikacja "Nexus_Tools" została pomyślnie skompilowana.'), 2500);
    } else {
      addLog('Analiza nieużywanych zasobów systemowych...');
      setTimeout(() => addLog('Refaktoryzacja pamięci podręcznej...', 'code'), 1000);
      setTimeout(() => addLog('Zoptymalizowano zużycie baterii o 12%.'), 2000);
    }
  };

  // File Operations
  const toggleFolder = (nodeId: string) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFiles(updateNodes(files));
  };

  const createFile = (parentId: string, type: 'file' | 'directory') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newNode: FileNode = {
      id: newId,
      name: type === 'file' ? 'new_file.txt' : 'new_folder',
      type,
      parentId,
      children: type === 'directory' ? [] : undefined,
      isOpen: type === 'directory' ? true : undefined
    };

    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          return { ...node, children: [...(node.children || []), newNode], isOpen: true };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFiles(updateNodes(files));
    addLog(`Utworzono ${type === 'file' ? 'plik' : 'katalog'}: ${newNode.name}`);
    setEditingId(newId);
    setEditName(newNode.name);
  };

  const deleteFile = (nodeId: string) => {
    if (nodeId === 'root') return;
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          children: node.children ? updateNodes(node.children) : undefined
        }));
    };
    setFiles(updateNodes(files));
    addLog(`Usunięto zasób: ${nodeId}`, 'error');
  };

  const startRename = (node: FileNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const saveRename = () => {
    if (!editingId) return;
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === editingId) {
          return { ...node, name: editName };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFiles(updateNodes(files));
    addLog(`Zmieniono nazwę na: ${editName}`);
    setEditingId(null);
  };

  const downloadFile = (node: FileNode) => {
    if (node.type !== 'file') return;
    
    addLog(`Inicjowanie pobierania: ${node.name}...`);
    
    // Create mock content for the file
    const content = `// Nexus Core AI - Virtual File System\n// File: ${node.name}\n// Generated: ${new Date().toISOString()}\n\n[BINARY_DATA_ENCRYPTED]`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = node.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => addLog(`Pobieranie ${node.name} zakończone pomyślnie.`), 1000);
  };

  const downloadApp = () => {
    addLog('Inicjowanie eksportu całego systemu Nexus Core AI...', 'info');
    
    const systemInfo = {
      name: "Nexus Core AI",
      version: "4.2.0",
      exportDate: new Date().toISOString(),
      status: "STABLE",
      checksum: Math.random().toString(36).substring(7).toUpperCase(),
      note: "To jest obraz eksportowy systemu Nexus Core AI. Pełny kod źródłowy dostępny w menu AI Studio."
    };
    
    const content = JSON.stringify(systemInfo, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_core_v420_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => addLog('Eksport systemu zakończony. Obraz Nexus Core AI został pobrany.', 'info'), 1500);
  };

  return (
    <div className="flex flex-col h-screen p-4 space-y-4 max-w-6xl mx-auto">
      
      {/* Header: System Status */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-4 relative overflow-hidden shrink-0"
      >
        <div className="scanning-line"></div>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold neon-glow flex items-center gap-2">
            <Cpu className="w-6 h-6" />
            NEXUS CORE AI
          </h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={downloadApp}
              className="flex items-center gap-2 text-[10px] uppercase border border-emerald-500/30 px-2 py-1 hover:bg-emerald-500/20 transition-colors text-emerald-400"
              title="Pobierz System"
            >
              <Download className="w-3 h-3" />
              Pobierz System
            </button>
            <div className="flex items-center gap-1 text-xs">
              <Battery className="w-4 h-4" />
              <span>100%</span>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px] uppercase">
          <div className="border border-emerald-900/50 p-2 flex items-center gap-2">
            <Cpu className="w-3 h-3 opacity-50" />
            CPU: <span className="text-emerald-400">{cpuLoad}%</span>
          </div>
          <div className="border border-emerald-900/50 p-2 flex items-center gap-2">
            <Database className="w-3 h-3 opacity-50" />
            RAM: <span className="text-emerald-400">{ramUsage}GB</span>
          </div>
          <div className="border border-emerald-900/50 p-2 flex items-center gap-2">
            <Wifi className="w-3 h-3 opacity-50" />
            UPLINK: <span className="text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area: Terminal + File Explorer */}
      <div className="flex flex-1 gap-4 min-h-0">
        
        {/* AI Neural Monitor (Terminal) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass flex-[2] p-4 relative flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs opacity-70 italic flex items-center gap-2">
              <TerminalIcon className="w-3 h-3" />
              // PROCESY MYŚLOWE AI
            </h2>
            <div className="text-[8px] opacity-40 uppercase tracking-widest">
              Neural Core v4.2.0
            </div>
          </div>
          <div 
            ref={terminalRef}
            className="terminal-text overflow-y-auto flex-1 space-y-2 text-emerald-400 custom-scrollbar pr-2"
          >
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <span className="opacity-30 text-[8px] shrink-0 mt-1">{log.timestamp}</span>
                  <p className={`
                    ${log.type === 'error' ? 'text-red-500' : ''}
                    ${log.type === 'code' ? 'text-yellow-400 font-mono bg-yellow-400/5 p-1 rounded' : ''}
                    ${log.type === 'user' ? 'text-white font-bold' : ''}
                  `}>
                    <span className="opacity-50 mr-1">
                      {log.type === 'error' ? '[!]' : log.type === 'user' ? 'USR>' : '>'}
                    </span>
                    {log.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
            {isProcessing && (
              <motion.div 
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex gap-2"
              >
                <span className="opacity-30 text-[8px] shrink-0 mt-1">{new Date().toLocaleTimeString()}</span>
                <p className="italic opacity-50 underline decoration-dotted">Oczekiwanie na odpowiedź rdzenia...</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* File Explorer */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass flex-1 p-4 relative flex flex-col min-h-0"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs opacity-70 italic flex items-center gap-2">
              <HardDrive className="w-3 h-3" />
              // EKSPLORATOR SYSTEMU
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {files.map(node => (
              <FileExplorerNode 
                key={node.id} 
                node={node} 
                editingId={editingId}
                editName={editName}
                setEditName={setEditName}
                toggleFolder={toggleFolder}
                createFile={createFile}
                deleteFile={deleteFile}
                startRename={startRename}
                saveRename={saveRename}
                downloadFile={downloadFile}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Dynamic App Factory */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-4 shrink-0"
      >
        <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          MODUŁY AUTOPROGRAMOWANIA
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => simulateAction('Gen_App')}
            className="bg-emerald-950/50 border border-emerald-500/30 p-3 rounded text-xs hover:bg-emerald-500 hover:text-black transition-all flex flex-col items-center gap-1 group"
          >
            <PlusCircle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            GENERUJ NOWĄ APKĘ
          </button>
          <button 
            onClick={() => simulateAction('Optimize')}
            className="bg-emerald-950/50 border border-emerald-500/30 p-3 rounded text-xs hover:bg-emerald-500 hover:text-black transition-all flex flex-col items-center gap-1 group"
          >
            <Bolt className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            OPTYMALIZUJ KOD
          </button>
        </div>
      </motion.div>

      {/* Bottom Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex space-x-2 shrink-0"
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
          placeholder="Wydaj polecenie Nexusowi..." 
          className="glass bg-transparent border-emerald-500/50 p-4 flex-1 text-sm focus:outline-none focus:border-emerald-400 transition-colors placeholder:opacity-30"
        />
        <button 
          onClick={handleSendCommand}
          disabled={isProcessing}
          className={`glass px-8 py-2 bg-emerald-500/10 hover:bg-emerald-500/30 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Send className={`w-5 h-5 ${isProcessing ? 'animate-pulse' : ''}`} />
        </button>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 255, 170, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 170, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 170, 0.4);
        }
      `}</style>
    </div>
  );
}
