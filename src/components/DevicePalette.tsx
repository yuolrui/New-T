/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DeviceType } from '../types';
import { MousePointer, Cable, Eraser, Layers, Zap, Info, Shield, Laptop, Server, Cloud } from 'lucide-react';

interface DevicePaletteProps {
  activeTool: 'select' | 'cable' | 'delete' | 'pan';
  onSetTool: (tool: 'select' | 'cable' | 'delete' | 'pan') => void;
  onAddDevice: (type: DeviceType) => void;
}

interface DeviceTemplate {
  type: DeviceType;
  label: string;
  desc: string;
  ram: number;
  cpu: number;
  ports: number;
  icon: React.ReactNode;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({
  activeTool,
  onSetTool,
  onAddDevice
}) => {
  const templates: DeviceTemplate[] = [
    {
      type: 'router',
      label: 'Cisco IOS 路由器',
      desc: '模拟的三层核心路由器，支持路由协议引擎和高级访问控制列表。',
      ram: 512,
      cpu: 1,
      ports: 4,
      icon: <Zap className="w-5 h-5 text-emerald-400" />
    },
    {
      type: 'switch',
      label: '二层以太网交换机',
      desc: '具有 8 个以太网端口的透明网桥交换设备。',
      ram: 256,
      cpu: 1,
      ports: 8,
      icon: (
        <svg className="w-5 h-5 text-sky-400 fill-current" viewBox="0 0 24 24">
          <path d="M17 11H7V9l-4 3 4 3v-2h10v2l4-3-4-3v2zM7 5h10V3l4 3-4 3V7H7v2L3 6l4-3v2zM17 17H7v-2l-4 3 4 3v-2h10v2l4-3-4-3v2z" />
        </svg>
      )
    },
    {
      type: 'firewall',
      label: '安全防火墙',
      desc: '模拟的自适应安全设备 (ASA)，用于边界安全防护。',
      ram: 1024,
      cpu: 2,
      ports: 4,
      icon: <Shield className="w-5 h-5 text-rose-400" />
    },
    {
      type: 'pc',
      label: 'VPCS 客户端 PC',
      desc: '轻量级客户端终端，支持自定义 IP/网关设置和 ping 连通性测试。',
      ram: 64,
      cpu: 1,
      ports: 1,
      icon: <Laptop className="w-5 h-5 text-indigo-400" />
    },
    {
      type: 'server',
      label: 'Linux 服务器',
      desc: '可运行核心服务并支持手动网卡和网络配置的 Linux 环境。',
      ram: 1024,
      cpu: 1,
      ports: 1,
      icon: <Server className="w-5 h-5 text-amber-400" />
    },
    {
      type: 'cloud',
      label: '互联网云',
      desc: '模拟 NAT 或网关以连通外部公共域的网络节点。',
      ram: 0,
      cpu: 0,
      ports: 1,
      icon: <Cloud className="w-5 h-5 text-sky-400" />
    }
  ];

  return (
    <div className="w-full flex flex-col gap-6 p-5 bg-slate-900 border-r border-slate-800 text-slate-300 overflow-y-auto">
      {/* Topology Toolbar */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">操作工具</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSetTool('select')}
            title="选择工具"
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs gap-1.5 font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/5'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            选择
          </button>

          <button
            onClick={() => onSetTool('cable')}
            title="连线工具"
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs gap-1.5 font-medium transition-all ${
              activeTool === 'cable'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/5'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400'
            }`}
          >
            <Cable className="w-4 h-4" />
            连线
          </button>

          <button
            onClick={() => onSetTool('delete')}
            title="删除工具"
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs gap-1.5 font-medium transition-all ${
              activeTool === 'delete'
                ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-md shadow-rose-500/5'
                : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400'
            }`}
          >
            <Eraser className="w-4 h-4" />
            删除
          </button>
        </div>
      </div>

      {/* Network Nodes Catalog */}
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">添加网络设备</h3>
        
        {/* Device Templates list */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {templates.map(tpl => (
            <div
              key={tpl.type}
              onClick={() => onAddDevice(tpl.type)}
              className="group flex gap-4 p-3 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-950/80 rounded-xl cursor-pointer transition-all duration-200"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-slate-900 border border-slate-800 group-hover:border-emerald-500/30 rounded-xl transition-all">
                {tpl.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {tpl.label}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed truncate">
                  {tpl.desc}
                </p>
                <div className="flex items-center gap-2.5 mt-2 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> 内存: {tpl.ram > 0 ? `${tpl.ram}MB` : '无限制'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> 端口数: {tpl.ports}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructional Quick Cards */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex gap-3">
        <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-slate-400">
          <p className="font-bold text-slate-300 mb-1">画布快速操作指南</p>
          <ul className="list-disc pl-3.5 space-y-1">
            <li>点击设备列表中的项目即可生成到画布中。</li>
            <li>在节点上右键单击可以开关电源、打开控制台等。</li>
            <li>点击“连线”工具后，先点击节点 A，再点击节点 B，并选择对应接口进行连接。</li>
            <li>启动节点并打开控制台，即可配置网卡 IP 和静态路由。</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
