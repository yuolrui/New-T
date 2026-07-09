/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { NetworkNode, NetworkLink } from '../types';
import { getPrompt } from '../utils/cliParser';
import { Terminal, X, RefreshCw, Layers, ChevronDown, ChevronUp } from 'lucide-react';

interface ConsoleTabsProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  openConsoleNodeIds: string[];
  activeConsoleNodeId: string | null;
  onSetActiveConsole: (id: string | null) => void;
  onCloseConsole: (id: string) => void;
  onExecuteCommand: (nodeId: string, command: string) => void;
  onClearConsoleLogs: (nodeId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ConsoleTabs: React.FC<ConsoleTabsProps> = ({
  nodes,
  links,
  openConsoleNodeIds,
  activeConsoleNodeId,
  onSetActiveConsole,
  onCloseConsole,
  onExecuteCommand,
  onClearConsoleLogs,
  isCollapsed,
  onToggleCollapse
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [inputVal, setInputVal] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const activeNode = nodes.find(n => n.id === activeConsoleNodeId);

  // Focus input automatically
  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (activeConsoleNodeId) {
      focusInput();
      scrollToBottom();
    }
  }, [activeConsoleNodeId, activeNode?.terminalLogs.length]);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsoleNodeId) return;

    const trimmed = inputVal.trim();
    onExecuteCommand(activeConsoleNodeId, inputVal);
    
    if (trimmed) {
      setCommandHistory(prev => [trimmed, ...prev].slice(0, 50));
    }
    setHistoryIndex(-1);
    setInputVal('');
  };

  // Command history traversing with Arrow Keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        className="h-full flex items-center justify-between px-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 font-sans cursor-pointer hover:bg-slate-800/80 transition-all select-none shadow-lg"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wide text-slate-300">
            {openConsoleNodeIds.length > 0
              ? `终端控制台 (${openConsoleNodeIds.length} 个活动会话 - 已折叠)`
              : '终端控制台 (已折叠)'}
          </span>
          {openConsoleNodeIds.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800 text-[10px] text-slate-500 font-mono">
              {openConsoleNodeIds.map(id => nodes.find(n => n.id === id)?.name).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 rounded-lg transition-all"
          >
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            <span>展开控制台</span>
          </button>
        </div>
      </div>
    );
  }

  if (openConsoleNodeIds.length === 0) {
    return (
      <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 font-sans overflow-hidden shadow-lg">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 h-11 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-400">终端控制台</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center"
            title="折叠控制台"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        {/* Empty Splash */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-950">
          <Terminal className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
          <p className="text-sm font-semibold tracking-wide text-slate-400">无活动控制台会话</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm text-center leading-normal">
            在网络拓扑画布上右键单击已启动的设备，然后选择 <strong className="text-slate-400 font-medium">打开控制台</strong> 以开始配置。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 font-sans overflow-hidden shadow-lg">
      {/* Console Tab Bars */}
      <div className="flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 h-11 flex-shrink-0">
        <div className="flex gap-1 overflow-x-auto scrollbar-none h-full pt-1">
          {openConsoleNodeIds.map(id => {
            const node = nodes.find(n => n.id === id);
            if (!node) return null;
            const isActive = activeConsoleNodeId === id;
            return (
              <div
                key={id}
                onClick={() => onSetActiveConsole(id)}
                className={`group flex items-center gap-2 px-3 h-full text-xs font-semibold rounded-t-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-slate-950 border-t-2 border-emerald-500 text-slate-100'
                    : 'bg-slate-900 text-slate-400 border-t-2 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Terminal className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="truncate max-w-[80px]">{node.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseConsole(id);
                  }}
                  className="p-0.5 rounded-full hover:bg-slate-800 group-hover:opacity-100 opacity-60 text-slate-400 hover:text-slate-200 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Console control utilities */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {activeNode && (
            <>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeNode.status === 'started' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {activeNode.status === 'started' ? '在线' : '离线'}
              </span>
              <button
                onClick={() => onClearConsoleLogs(activeNode.id)}
                className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                清除历史输出
              </button>
            </>
          )}
          <div className="w-[1px] h-4 bg-slate-800" />
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center"
            title="折叠控制台"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div
        ref={containerRef}
        onClick={focusInput}
        className="flex-1 overflow-y-auto p-5 font-mono text-sm leading-relaxed cursor-text selection:bg-emerald-500/30 select-text"
      >
        {activeNode ? (
          <div className="max-w-4xl mx-auto flex flex-col min-h-full">
            {/* If node is offline, show black splash */}
            {activeNode.status === 'stopped' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12 font-sans">
                <RefreshCw className="w-8 h-8 text-slate-700 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-slate-400">控制台会话已离线</p>
                <p className="text-xs text-slate-500 mt-0.5">设备已关闭电源。请在画布上右键单击节点以开启电源。</p>
              </div>
            ) : activeNode.bootProgress < 100 ? (
              // Boot sequence loader screen
              <div className="text-amber-500 space-y-2">
                <p className="animate-pulse">正在从 ROM 加载引导微代码...</p>
                <p>正在解压 IOS 引导程序镜像 [####################] 100%</p>
                <p>系统内存容量: {activeNode.ram}MB 内存, {activeNode.cpu} 核虚拟 CPU</p>
                <p>正在 NVRAM 中搜索安全启动配置 (startup-config)...</p>
                {activeNode.bootProgress > 40 && (
                  <>
                    <p className="text-emerald-500">自检诊断: 通过 (PASS)</p>
                    <p className="text-emerald-500">网卡物理端口初始化: 已就绪 (UP)</p>
                  </>
                )}
                {activeNode.bootProgress > 70 && (
                  <>
                    <p>擦除动态路由寄存器内存... 完成。</p>
                    <p className="text-slate-400 font-bold">\n--- 请按回车键 (ENTER) 开始使用控制台 ---\n</p>
                  </>
                )}
                <div className="w-full bg-slate-900 rounded h-1.5 mt-4 overflow-hidden">
                  <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${activeNode.bootProgress}%` }} />
                </div>
              </div>
            ) : (
              // Live active scrollback
              <div className="flex-1 flex flex-col">
                <div className="space-y-1 select-text">
                  {activeNode.terminalLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`whitespace-pre-wrap select-text ${
                        log.type === 'input' ? 'text-slate-100 font-bold' :
                        log.type === 'system' ? 'text-sky-400/90 italic' : 'text-emerald-400/90'
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                </div>

                {/* Command Input Area */}
                <form onSubmit={handleSubmit} className="flex items-center mt-2 flex-shrink-0">
                  <span className="text-slate-100 font-bold whitespace-nowrap select-none mr-1.5">
                    {getPrompt(activeNode)}
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-100 font-mono text-sm caret-emerald-400 p-0 m-0"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                </form>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
