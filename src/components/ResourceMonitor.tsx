/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NetworkNode, NetworkLink } from '../types';
import { Play, Square, RefreshCw, Cpu, HardDrive, AlertCircle, HelpCircle } from 'lucide-react';

interface ResourceMonitorProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  onStartAll: () => void;
  onStopAll: () => void;
  onWipeAll: () => void;
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({
  nodes,
  links,
  onStartAll,
  onStopAll,
  onWipeAll
}) => {
  // Calculate resources
  const startedNodes = nodes.filter(n => n.status === 'started');
  const totalRamUsed = startedNodes.reduce((acc, n) => acc + n.ram, 0);
  const totalCpuUsed = startedNodes.reduce((acc, n) => acc + n.cpu, 0);

  // Limits
  const RAM_LIMIT = 8192; // 8 GB
  const CPU_LIMIT = 12;   // 12 vCPUs

  const ramPercentage = Math.min((totalRamUsed / RAM_LIMIT) * 100, 100);
  const cpuPercentage = Math.min((totalCpuUsed / CPU_LIMIT) * 100, 100);

  const getPercentageColor = (pct: number) => {
    if (pct < 60) return 'bg-emerald-500';
    if (pct < 85) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getTextColor = (pct: number) => {
    if (pct < 60) return 'text-emerald-400';
    if (pct < 85) return 'text-amber-400';
    return 'text-rose-400';
  };

  // Counters
  const routerCount = nodes.filter(n => n.type === 'router').length;
  const switchCount = nodes.filter(n => n.type === 'switch').length;
  const firewallCount = nodes.filter(n => n.type === 'firewall').length;
  const clientCount = nodes.filter(n => n.type === 'pc' || n.type === 'server').length;

  return (
    <div className="w-full h-full flex flex-col gap-6 p-5 bg-slate-900 border-l border-slate-800 text-slate-300 overflow-y-auto font-sans">
      {/* Global Actions Bar */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">全局集群控制</h3>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onStartAll}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-emerald-400 rounded-xl transition-all duration-200"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> 启动所有节点
            </button>
            <button
              onClick={onStopAll}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-white hover:border-amber-500 text-amber-400 rounded-xl transition-all duration-200"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> 关闭所有节点
            </button>
          </div>
          <button
            onClick={onWipeAll}
            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 hover:border-rose-500 hover:text-rose-400 hover:bg-rose-500/5 text-slate-400 rounded-xl transition-all duration-200"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 擦除所有配置
          </button>
        </div>
      </div>

      {/* Cluster Virtual Resource stats */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">集群虚拟资源占用</h3>
        <div className="flex flex-col gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl">
          {/* CPU Load bar */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-slate-500" /> 虚拟 CPU 限制
              </span>
              <span className={`font-mono font-bold ${getTextColor(cpuPercentage)}`}>
                {totalCpuUsed} / {CPU_LIMIT} 核心 ({Math.round(cpuPercentage)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getPercentageColor(cpuPercentage)} transition-all duration-500`}
                style={{ width: `${cpuPercentage}%` }}
              />
            </div>
          </div>

          {/* RAM Footprint bar */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" /> 虚拟内存分配
              </span>
              <span className={`font-mono font-bold ${getTextColor(ramPercentage)}`}>
                {totalRamUsed}MB / {RAM_LIMIT}MB ({Math.round(ramPercentage)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getPercentageColor(ramPercentage)} transition-all duration-500`}
                style={{ width: `${ramPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Alert Warning if too high */}
          {(ramPercentage > 85 || cpuPercentage > 85) && (
            <div className="flex items-start gap-2.5 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[10px] leading-normal">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">资源分配警告！</span> 已接近测试容器的最大负载。已关闭的设备不会实际消耗内存资源。
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Node count grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">设备部署分布</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-2xl font-black text-emerald-400 font-mono">{routerCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">核心路由器</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-2xl font-black text-sky-400 font-mono">{switchCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">二/三层交换机</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-2xl font-black text-rose-400 font-mono">{firewallCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">安全防火墙</span>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-2xl font-black text-indigo-400 font-mono">{clientCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">主机 / 客户端</span>
          </div>
        </div>
      </div>

      {/* Cable Connections List */}
      <div className="flex flex-col">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">物理链路状态 (Cabling)</h3>
        {links.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500 flex flex-col items-center gap-1">
            <HelpCircle className="w-5 h-5 text-slate-600" />
            暂无链路连线。请使用左侧“连线”工具连接设备接口。
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 max-h-[250px] overflow-y-auto">
            {links.map(link => {
              const fromNode = nodes.find(n => n.id === link.fromNodeId);
              const toNode = nodes.find(n => n.id === link.toNodeId);
              if (!fromNode || !toNode) return null;

              const isLinkActive = 
                fromNode.status === 'started' && 
                toNode.status === 'started' &&
                fromNode.interfaces[link.fromInterface]?.configStatus === 'no-shutdown' &&
                toNode.interfaces[link.toInterface]?.configStatus === 'no-shutdown';

              return (
                <div key={link.id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-slate-200 truncate">{fromNode.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{link.fromInterface}</span>
                    <span className="text-slate-600">⇌</span>
                    <span className="font-bold text-slate-200 truncate">{toNode.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{link.toInterface}</span>
                  </div>
                  <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${isLinkActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                    {isLinkActive ? 'UP / UP' : 'DOWN / DOWN'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
