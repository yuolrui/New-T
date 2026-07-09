/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NetworkNode, NetworkInterface } from '../types';
import { Play, Square, Terminal, HardDrive, Cpu, Settings, Globe, Plus, Trash } from 'lucide-react';

interface NodePropertiesProps {
  node: NetworkNode;
  onStartNode: (id: string) => void;
  onStopNode: (id: string) => void;
  onOpenConsole: (id: string) => void;
  onUpdateInterfaceIP: (nodeId: string, interfaceName: string, ip: string, subnet: string, shutdown: 'shutdown' | 'no-shutdown') => void;
  onAddRoute: (nodeId: string, destination: string, mask: string, nextHop: string) => void;
  onDeleteRoute: (nodeId: string, idx: number) => void;
}

export const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onStartNode,
  onStopNode,
  onOpenConsole,
  onUpdateInterfaceIP,
  onAddRoute,
  onDeleteRoute
}) => {
  const [selectedPort, setSelectedPort] = useState<string>(Object.keys(node.interfaces)[0] || '');
  const [portIp, setPortIp] = useState<string>('');
  const [portSubnet, setPortSubnet] = useState<string>('255.255.255.0');
  const [isShut, setIsShut] = useState<boolean>(true);

  // New Route state
  const [routeDest, setRouteDest] = useState<string>('');
  const [routeMask, setRouteMask] = useState<string>('255.255.255.0');
  const [routeNextHop, setRouteNextHop] = useState<string>('');

  // Sync state when node or port selection shifts
  useEffect(() => {
    setSelectedPort(Object.keys(node.interfaces)[0] || '');
  }, [node.id]);

  useEffect(() => {
    if (selectedPort && node.interfaces[selectedPort]) {
      const inf = node.interfaces[selectedPort];
      setPortIp(inf.ip || '');
      setPortSubnet(inf.subnet || '255.255.255.0');
      setIsShut(inf.configStatus === 'shutdown');
    }
  }, [selectedPort, node.id]);

  const handleApplyPortConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateInterfaceIP(
      node.id,
      selectedPort,
      portIp.trim(),
      portSubnet.trim(),
      isShut ? 'shutdown' : 'no-shutdown'
    );
  };

  const handleAddStaticRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeDest && routeMask && routeNextHop) {
      onAddRoute(node.id, routeDest.trim(), routeMask.trim(), routeNextHop.trim());
      setRouteDest('');
      setRouteNextHop('');
    }
  };

  const deviceTypesChinese: Record<string, string> = {
    router: '核心路由器',
    switch: '以太网交换机',
    firewall: '安全防火墙',
    pc: '客户端 PC',
    server: 'Linux 服务器',
    cloud: '互联网云'
  };

  return (
    <div className="w-full h-full flex flex-col gap-6 p-5 bg-slate-900 border-l border-slate-800 text-slate-300 overflow-y-auto font-sans">
      {/* Node Info & Power */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-white">{node.name}</h2>
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider">
            {deviceTypesChinese[node.type] || node.type} • {node.status === 'started' ? '在线' : '离线'}
          </span>
        </div>

        {node.status === 'started' ? (
          <button
            onClick={() => onStopNode(node.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500 hover:text-white hover:border-amber-500 text-amber-400 rounded-lg transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> 关机
          </button>
        ) : (
          <button
            onClick={() => onStartNode(node.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-emerald-400 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> 开机
          </button>
        )}
      </div>

      {/* Resource Allocation */}
      <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-500" />
          <div className="text-xs">
            <span className="block text-slate-500 font-medium">系统分配内存</span>
            <span className="font-bold text-slate-200 font-mono">{node.ram} MB</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-500" />
          <div className="text-xs">
            <span className="block text-slate-500 font-medium">分配 CPU 核数</span>
            <span className="font-bold text-slate-200 font-mono">{node.cpu} 核 vCPU</span>
          </div>
        </div>
      </div>

      {/* Open Console shortcut */}
      {node.status === 'started' && (
        <button
          onClick={() => onOpenConsole(node.id)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-800 hover:bg-emerald-500 hover:text-white text-emerald-400 rounded-xl text-xs font-semibold border border-slate-700 hover:border-emerald-500 transition-all duration-200"
        >
          <Terminal className="w-4 h-4" /> 打开 SSH 控制台终端
        </button>
      )}

      {/* Interface Port Configurator form */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">物理网口 IP 快速配置</h3>
        <form onSubmit={handleApplyPortConfig} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase font-sans">选择物理接口</label>
            <select
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 text-slate-200 font-mono"
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
            >
              {Object.keys(node.interfaces).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase font-sans">IP 地址</label>
            <input
              type="text"
              placeholder="例如 192.168.1.1"
              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
              value={portIp}
              onChange={(e) => setPortIp(e.target.value)}
            />
          </div>

          {node.type !== 'pc' && (
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase font-sans">子网掩码</label>
              <input
                type="text"
                placeholder="例如 255.255.255.0"
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
                value={portSubnet}
                onChange={(e) => setPortSubnet(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[11px] text-slate-500 font-bold uppercase font-sans">网卡管理控制状态</span>
            <button
              type="button"
              onClick={() => setIsShut(prev => !prev)}
              className={`text-[10px] w-full py-1.5 rounded font-black border transition-all uppercase ${
                isShut
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              {isShut ? '已禁用 (Administratively DOWN)' : '已开启 (no shutdown)'}
            </button>
          </div>

          <button
            type="submit"
            className="mt-2 w-full py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 hover:text-white rounded text-xs font-semibold transition-all"
          >
            应用并保存配置
          </button>
        </form>
      </div>

      {/* Static Routing Rules configurations */}
      {node.type !== 'pc' && node.type !== 'switch' && (
        <div className="flex flex-col">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">IP 静态路由表</h3>
          
          {/* List of current routes */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-3 space-y-2 max-h-[180px] overflow-y-auto">
            {node.cliState.routingTable.length === 0 ? (
              <p className="text-[11px] text-slate-500 text-center py-4 italic font-sans">暂无静态路由规则。目前仅允许直连网络间通信。</p>
            ) : (
              node.cliState.routingTable.map((route, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="block font-bold text-slate-200">{route.destination}</span>
                    <span className="block text-[9px] text-slate-400">子网掩码 {route.mask} ➔ 下一跳 {route.nextHop}</span>
                  </div>
                  <button
                    onClick={() => onDeleteRoute(node.id, idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add static route form */}
          <form onSubmit={handleAddStaticRoute} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col gap-2">
            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1 font-sans">添加静态 IP 路由条目</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="目标网络网段"
                className="text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
                value={routeDest}
                onChange={(e) => setRouteDest(e.target.value)}
              />
              <input
                type="text"
                placeholder="子网掩码"
                className="text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
                value={routeMask}
                onChange={(e) => setRouteMask(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder="下一跳网关 IP"
                className="flex-1 text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
                value={routeNextHop}
                onChange={(e) => setRouteNextHop(e.target.value)}
              />
              <button
                type="submit"
                className="px-3 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white rounded text-[11px] font-semibold transition-all flex items-center gap-1 text-emerald-400 font-sans"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> 添加
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
