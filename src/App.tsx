/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NetworkNode, NetworkLink, DeviceType, PingAnimation, Topology, NetworkInterface } from './types';
import { NetworkCanvas } from './components/NetworkCanvas';
import { DevicePalette } from './components/DevicePalette';
import { ConsoleTabs } from './components/ConsoleTabs';
import { ResourceMonitor } from './components/ResourceMonitor';
import { NodeProperties } from './components/NodeProperties';
import { parseCommand } from './utils/cliParser';
import { 
  Network, 
  Settings, 
  HelpCircle, 
  Plus, 
  Save, 
  Download, 
  Upload, 
  LayoutGrid, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  PanelBottomOpen,
  PanelBottomClose,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Create initial corporate preset topology
function createCorporatePreset(): Topology {
  const nodes: NetworkNode[] = [
    {
      id: 'node-r1',
      name: 'R1',
      type: 'router',
      x: 410,
      y: 190,
      status: 'started',
      ram: 512,
      cpu: 1,
      interfaces: {
        'e0/0': { name: 'e0/0', ip: '10.0.0.1', subnet: '255.255.255.0', configStatus: 'no-shutdown' },
        'e0/1': { name: 'e0/1', ip: '10.0.1.1', subnet: '255.255.255.0', configStatus: 'no-shutdown' },
        'e0/2': { name: 'e0/2', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'e0/3': { name: 'e0/3', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' }
      },
      cliState: {
        currentMode: 'priv',
        routingTable: [
          { destination: '192.168.2.0', mask: '255.255.255.0', nextHop: '10.0.1.2', interfaceName: 'e0/1' }
        ],
        savedConfig: '! Startup Configuration for R1\nhostname R1\n!\ninterface e0/0\n  ip address 10.0.0.1 255.255.255.0\n  no shutdown\n!\ninterface e0/1\n  ip address 10.0.1.1 255.255.255.0\n  no shutdown\n!\nip route 192.168.2.0 255.255.255.0 10.0.1.2\n!'
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: 'R1#\n*Mar 1 00:01:05.123: %SYS-5-RESTART: System restarted --\nCisco IOS Software, C7200 Software (C7200-ADVENTERPRISEK9-M), Version 15.4(3)M2, RELEASE SOFTWARE (fc2)\nTechnical Support: http://www.cisco.com/techsupport\nCompiled Wed 26-Nov-14 16:32 by prod_rel_team\n\n' },
        { type: 'output', text: 'R1#show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol\ne0/0                  10.0.0.1        YES manual up                    up      \ne0/1                  10.0.1.1        YES manual up                    up      \ne0/2                  unassigned      YES manual administratively down down    \ne0/3                  unassigned      YES manual administratively down down    \n' }
      ],
      terminalInputBuffer: ''
    },
    {
      id: 'node-r2',
      name: 'R2',
      type: 'router',
      x: 650,
      y: 190,
      status: 'started',
      ram: 512,
      cpu: 1,
      interfaces: {
        'e0/0': { name: 'e0/0', ip: '10.0.1.2', subnet: '255.255.255.0', configStatus: 'no-shutdown' },
        'e0/1': { name: 'e0/1', ip: '192.168.2.1', subnet: '255.255.255.0', configStatus: 'no-shutdown' },
        'e0/2': { name: 'e0/2', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'e0/3': { name: 'e0/3', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' }
      },
      cliState: {
        currentMode: 'priv',
        routingTable: [
          { destination: '10.0.0.0', mask: '255.255.255.0', nextHop: '10.0.1.1', interfaceName: 'e0/0' }
        ],
        savedConfig: '! Startup Configuration for R2\nhostname R2\n!\ninterface e0/0\n  ip address 10.0.1.2 255.255.255.0\n  no shutdown\n!\ninterface e0/1\n  ip address 192.168.2.1 255.255.255.0\n  no shutdown\n!\nip route 10.0.0.0 255.255.255.0 10.0.1.1\n!'
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: 'R2#\n*Mar 1 00:01:06.102: %SYS-5-RESTART: System restarted --\nCisco IOS Software, C7200 Software (C7200-ADVENTERPRISEK9-M), Version 15.4(3)M2\nCompiled Wed 26-Nov-14 16:32 by prod_rel_team\n\n' },
        { type: 'output', text: 'R2#show ip route\nCodes: L - local, C - connected, S - static\n\nGateway of last resort is not set\n\nC     10.0.1.0/24 is directly connected, e0/0\nC     192.168.2.0/24 is directly connected, e0/1\nS     10.0.0.0/24 [1/0] via 10.0.1.1, e0/0\n' }
      ],
      terminalInputBuffer: ''
    },
    {
      id: 'node-sw1',
      name: 'SW1',
      type: 'switch',
      x: 410,
      y: 350,
      status: 'started',
      ram: 256,
      cpu: 1,
      interfaces: {
        'e0/0': { name: 'e0/0', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/1': { name: 'e0/1', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/2': { name: 'e0/2', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/3': { name: 'e0/3', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/4': { name: 'e0/4', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/5': { name: 'e0/5', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/6': { name: 'e0/6', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/7': { name: 'e0/7', ip: '', subnet: '', configStatus: 'shutdown' }
      },
      cliState: {
        currentMode: 'priv',
        routingTable: [],
        savedConfig: '! Startup Configuration for SW1\nhostname SW1\n!'
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: 'SW1#\n*Mar 1 00:01:03.011: %SYS-5-RESTART: Switch restarted --\nLayer 2 Ethernet Catalyst Switch, Version 15.2(1)E1\n\nSW1#show mac address-table\n          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       ----        -----\n   1    5254.0012.ef10    DYNAMIC     e0/1\n   1    5254.0012.ef03    DYNAMIC     e0/2\n' }
      ],
      terminalInputBuffer: ''
    },
    {
      id: 'node-pc1',
      name: 'PC1',
      type: 'pc',
      x: 290,
      y: 470,
      status: 'started',
      ram: 64,
      cpu: 1,
      interfaces: {
        'eth0': { name: 'eth0', ip: '10.0.0.10', subnet: '255.255.255.0', configStatus: 'no-shutdown' }
      },
      cliState: {
        currentMode: 'vpcs',
        vpcsIp: '10.0.0.10',
        vpcsMask: 24,
        vpcsGw: '10.0.0.1',
        routingTable: [],
        savedConfig: ''
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: '\nVPCS 0.8a (Virtual PC Simulator)\nPC1> show ip\nNAME         : PC1\nIP ADDRESS   : 10.0.0.10/24\nGATEWAY      : 10.0.0.1\nMAC ADDRESS  : 52:54:00:12:ef:10\nINTERFACE    : eth0\n\nType "ping 192.168.2.50" to test WAN connectivity!\n' }
      ],
      terminalInputBuffer: ''
    },
    {
      id: 'node-server1',
      name: 'Server1',
      type: 'server',
      x: 530,
      y: 470,
      status: 'started',
      ram: 1024,
      cpu: 1,
      interfaces: {
        'eth0': { name: 'eth0', ip: '10.0.0.100', subnet: '255.255.255.0', configStatus: 'no-shutdown' }
      },
      cliState: {
        currentMode: 'linux',
        vpcsIp: '10.0.0.100',
        vpcsMask: 24,
        vpcsGw: '10.0.0.1',
        routingTable: [],
        savedConfig: ''
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: 'root@Server1:~# ifconfig\neth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet 10.0.0.100  netmask 255.255.255.0  broadcast 10.0.0.255\n        ether 02:42:ac:11:00:03  (Ethernet)\n\nlo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n' }
      ],
      terminalInputBuffer: ''
    },
    {
      id: 'node-pc2',
      name: 'PC2',
      type: 'pc',
      x: 800,
      y: 300,
      status: 'started',
      ram: 64,
      cpu: 1,
      interfaces: {
        'eth0': { name: 'eth0', ip: '192.168.2.50', subnet: '255.255.255.0', configStatus: 'no-shutdown' }
      },
      cliState: {
        currentMode: 'vpcs',
        vpcsIp: '192.168.2.50',
        vpcsMask: 24,
        vpcsGw: '192.168.2.1',
        routingTable: [],
        savedConfig: ''
      },
      bootProgress: 100,
      terminalLogs: [
        { type: 'output', text: '\nVPCS 0.8a (Virtual PC Simulator)\nPC2> show ip\nNAME         : PC2\nIP ADDRESS   : 192.168.2.50/24\nGATEWAY      : 192.168.2.1\nMAC ADDRESS  : 52:54:00:12:ef:50\nINTERFACE    : eth0\n' }
      ],
      terminalInputBuffer: ''
    }
  ];

  const links: NetworkLink[] = [
    { id: 'link-1', fromNodeId: 'node-pc1', fromInterface: 'eth0', toNodeId: 'node-sw1', toInterface: 'e0/1' },
    { id: 'link-2', fromNodeId: 'node-server1', fromInterface: 'eth0', toNodeId: 'node-sw1', toInterface: 'e0/2' },
    { id: 'link-3', fromNodeId: 'node-r1', fromInterface: 'e0/0', toNodeId: 'node-sw1', toInterface: 'e0/0' },
    { id: 'link-4', fromNodeId: 'node-r1', fromInterface: 'e0/1', toNodeId: 'node-r2', toInterface: 'e0/0' },
    { id: 'link-5', fromNodeId: 'node-r2', fromInterface: 'e0/1', toNodeId: 'node-pc2', toInterface: 'eth0' }
  ];

  return {
    id: 'topo-corp',
    name: '企业级广域网预设',
    description: '预配置的多子网静态路由广域网拓扑',
    nodes,
    links,
    createdAt: new Date().toISOString()
  };
}

export default function App() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'cable' | 'delete' | 'pan'>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Terminal drawer sessions
  const [openConsoleNodeIds, setOpenConsoleNodeIds] = useState<string[]>([]);
  const [activeConsoleNodeId, setActiveConsoleNodeId] = useState<string | null>(null);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState<boolean>(false);
  const [isConsoleHidden, setIsConsoleHidden] = useState<boolean>(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(false);

  // Layout settings
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Saved Topologies
  const [savedTopologies, setSavedTopologies] = useState<Topology[]>([]);
  const [currentTopoName, setCurrentTopoName] = useState<string>('企业级广域网预设');
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Active ping travel animation
  const [pingAnimation, setPingAnimation] = useState<PingAnimation | null>(null);

  // Load first layout from localStorage or preset
  useEffect(() => {
    const localSaved = localStorage.getItem('ais_saved_topologies');
    const defaultPreset = createCorporatePreset();

    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved) as Topology[];
        setSavedTopologies(parsed);
        // Load the active topology
        const active = parsed[0] || defaultPreset;
        setNodes(active.nodes);
        setLinks(active.links);
        setCurrentTopoName(active.name);
      } catch (e) {
        setNodes(defaultPreset.nodes);
        setLinks(defaultPreset.links);
      }
    } else {
      setNodes(defaultPreset.nodes);
      setLinks(defaultPreset.links);
      setSavedTopologies([defaultPreset]);
      localStorage.setItem('ais_saved_topologies', JSON.stringify([defaultPreset]));
    }
  }, []);

  const handleSaveToLocalStorage = (customName?: string) => {
    const nameToSave = customName || currentTopoName;
    const currentTopo: Topology = {
      id: customName ? `topo-${Date.now()}` : 'topo-corp',
      name: nameToSave,
      description: '保存的自定义网络拓扑',
      nodes,
      links,
      createdAt: new Date().toISOString()
    };

    let updatedList = [...savedTopologies];
    const matchIdx = updatedList.findIndex(t => t.name === nameToSave);
    if (matchIdx !== -1) {
      updatedList[matchIdx] = currentTopo;
    } else {
      updatedList.push(currentTopo);
    }

    setSavedTopologies(updatedList);
    localStorage.setItem('ais_saved_topologies', JSON.stringify(updatedList));
    setCurrentTopoName(nameToSave);
  };

  const handleLoadTopology = (topo: Topology) => {
    setNodes(topo.nodes);
    setLinks(topo.links);
    setCurrentTopoName(topo.name);
    setSelectedNodeId(null);
    setOpenConsoleNodeIds([]);
    setActiveConsoleNodeId(null);
    setShowSavedModal(false);
  };

  const handleAddNewBlankTopology = () => {
    const newName = `New Topology ${savedTopologies.length + 1}`;
    setNodes([]);
    setLinks([]);
    setCurrentTopoName(newName);
    setSelectedNodeId(null);
    setOpenConsoleNodeIds([]);
    setActiveConsoleNodeId(null);
    setShowSavedModal(false);
  };

  // Export JSON file
  const handleExportJSON = () => {
    const data = {
      name: currentTopoName,
      nodes,
      links
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${currentTopoName.toLowerCase().replace(/\s+/g, '_')}_topology.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.nodes && parsed.links) {
            setNodes(parsed.nodes);
            setLinks(parsed.links);
            setCurrentTopoName(parsed.name || '导入的拓扑');
            setSelectedNodeId(null);
            setOpenConsoleNodeIds([]);
            setActiveConsoleNodeId(null);
          } else {
            alert('无效的 JSON 文件格式。文件必须包含 nodes 和 links 数组。');
          }
        } catch (error) {
          alert('解析 JSON 文件失败。');
        }
      };
    }
  };

  // Node position dragged
  const handleUpdateNodePos = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };

  // Node operations
  const handleStartNode = (id: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        // Trigger simulated boot sequence
        return {
          ...node,
          status: 'started',
          bootProgress: 0,
        };
      }
      return node;
    }));

    // Run boot sequence steps
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setNodes(prev => prev.map(node => {
        if (node.id === id) {
          if (progress >= 100) {
            clearInterval(interval);
            // Append boot completed log
            return {
              ...node,
              bootProgress: 100,
              terminalLogs: [
                ...node.terminalLogs,
                { type: 'system', text: '\n系统引导加载程序已完成。' },
                { type: 'output', text: `\n按回车键 (ENTER) 激活 SSH 控制台终端。` }
              ]
            };
          }
          return { ...node, bootProgress: progress };
        }
        return node;
      }));
    }, 400);
  };

  const handleStopNode = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, status: 'stopped', bootProgress: -1 } : n));
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setLinks(prev => prev.filter(l => l.fromNodeId !== id && l.toNodeId !== id));
    setOpenConsoleNodeIds(prev => prev.filter(cid => cid !== id));
    if (activeConsoleNodeId === id) {
      setActiveConsoleNodeId(null);
    }
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const handleRenameNode = (id: string, newName: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, name: newName } : n));
  };

  const handleOpenConsole = (id: string) => {
    if (!openConsoleNodeIds.includes(id)) {
      setOpenConsoleNodeIds(prev => [...prev, id]);
    }
    setActiveConsoleNodeId(id);
    setIsConsoleCollapsed(false);
    setIsConsoleHidden(false);
  };

  const handleCloseConsole = (id: string) => {
    const updated = openConsoleNodeIds.filter(cid => cid !== id);
    setOpenConsoleNodeIds(updated);
    if (activeConsoleNodeId === id) {
      setActiveConsoleNodeId(updated[updated.length - 1] || null);
    }
  };

  const handleClearConsoleLogs = (id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, terminalLogs: [] } : n));
  };

  // Add Device Node template
  const handleAddDevice = (type: DeviceType) => {
    const typeCounts = nodes.filter(n => n.type === type).length;
    const defaultNames: { [key in DeviceType]: string } = {
      router: 'R',
      switch: 'SW',
      firewall: 'FW',
      pc: 'PC',
      server: 'Server',
      cloud: 'Internet'
    };
    const nodeName = `${defaultNames[type]}${typeCounts + 1}`;
    
    // Default interfaces mapping
    let interfaces: { [portName: string]: any } = {};
    if (type === 'router') {
      interfaces = {
        'e0/0': { name: 'e0/0', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'e0/1': { name: 'e0/1', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'e0/2': { name: 'e0/2', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'e0/3': { name: 'e0/3', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' }
      };
    } else if (type === 'switch') {
      interfaces = {
        'e0/0': { name: 'e0/0', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/1': { name: 'e0/1', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/2': { name: 'e0/2', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/3': { name: 'e0/3', ip: '', subnet: '', configStatus: 'no-shutdown' },
        'e0/4': { name: 'e0/4', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/5': { name: 'e0/5', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/6': { name: 'e0/6', ip: '', subnet: '', configStatus: 'shutdown' },
        'e0/7': { name: 'e0/7', ip: '', subnet: '', configStatus: 'shutdown' }
      };
    } else if (type === 'firewall') {
      interfaces = {
        'g0/0': { name: 'g0/0', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'g0/1': { name: 'g0/1', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'g0/2': { name: 'g0/2', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' },
        'g0/3': { name: 'g0/3', ip: '', subnet: '255.255.255.0', configStatus: 'shutdown' }
      };
    } else {
      // PC / Server / Cloud has single ethernet
      interfaces = {
        'eth0': { name: 'eth0', ip: '', subnet: '255.255.255.0', configStatus: 'no-shutdown' }
      };
    }

    const defaultRam: { [key in DeviceType]: number } = {
      router: 512,
      switch: 256,
      firewall: 1024,
      pc: 64,
      server: 1024,
      cloud: 0
    };

    const newNode: NetworkNode = {
      id: `node-${type}-${Date.now()}`,
      name: nodeName,
      type,
      x: 350 + (typeCounts * 30) % 200,
      y: 250 + (typeCounts * 30) % 150,
      status: 'stopped',
      ram: defaultRam[type],
      cpu: type === 'firewall' ? 2 : 1,
      interfaces,
      cliState: {
        currentMode: type === 'pc' ? 'vpcs' : type === 'server' ? 'linux' : 'user',
        routingTable: [],
        savedConfig: ''
      },
      bootProgress: -1,
      terminalLogs: [
        { type: 'system', text: `\n设备部署成功。目前处于关机 (OFF) 状态。\n` }
      ],
      terminalInputBuffer: ''
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleCreateLink = (fromId: string, fromPort: string, toId: string, toPort: string) => {
    const newLink: NetworkLink = {
      id: `link-${Date.now()}`,
      fromNodeId: fromId,
      fromInterface: fromPort,
      toNodeId: toId,
      toInterface: toPort
    };
    setLinks(prev => [...prev, newLink]);
  };

  const handleDeleteLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  // GUI Quick Interface IP update
  const handleUpdateInterfaceIP = (
    nodeId: string,
    interfaceName: string,
    ip: string,
    subnet: string,
    shutdownStatus: 'shutdown' | 'no-shutdown'
  ) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const inf = node.interfaces[interfaceName];
        if (inf) {
          const updatedInf = { ...inf, ip, subnet, configStatus: shutdownStatus };
          
          // Sync specialized VPCS properties
          let updatedCli = { ...node.cliState };
          if (node.type === 'pc' && interfaceName === 'eth0') {
            updatedCli.vpcsIp = ip || undefined;
            // Parse mask
            if (subnet) {
              const dots = subnet.split('.');
              if (dots.length === 4) {
                // Convert subnet decimal back to prefix
                const intVal = dots.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
                let cidr = 0;
                for (let i = 31; i >= 0; i--) {
                  if (((intVal >>> i) & 1) === 1) cidr++; else break;
                }
                updatedCli.vpcsMask = cidr || 24;
              }
            }
          }

          // Sync Linux server IP
          if (node.type === 'server' && interfaceName === 'eth0') {
            updatedCli.vpcsIp = ip || undefined;
          }

          return {
            ...node,
            interfaces: { ...node.interfaces, [interfaceName]: updatedInf },
            cliState: updatedCli
          };
        }
      }
      return node;
    }));
  };

  const handleAddRoute = (nodeId: string, destination: string, mask: string, nextHop: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const newRoute = { destination, mask, nextHop, interfaceName: Object.keys(node.interfaces)[0] };
        return {
          ...node,
          cliState: {
            ...node.cliState,
            routingTable: [...node.cliState.routingTable, newRoute]
          }
        };
      }
      return node;
    }));
  };

  const handleDeleteRoute = (nodeId: string, idx: number) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const routes = [...node.cliState.routingTable];
        routes.splice(idx, 1);
        return {
          ...node,
          cliState: { ...node.cliState, routingTable: routes }
        };
      }
      return node;
    }));
  };

  // Console Shell command submission execution
  const handleExecuteCommand = (nodeId: string, command: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const res = parseCommand(node, nodes, links, command);
    
    // Append logs
    setNodes(prev => prev.map(n => {
      if (n.id === nodeId) {
        const withLogs = [...n.terminalLogs, ...res.outputLogs];
        return {
          ...res.updatedNode,
          terminalLogs: withLogs
        };
      }
      return n;
    }));

    // Trigger ping animation
    if (res.triggerPing) {
      const ping = res.triggerPing;
      // Find link coordinates
      setPingAnimation({
        id: `ping-${Date.now()}`,
        linkIds: ping.linkIds,
        pathPoints: [],
        status: ping.success ? 'success' : 'failure',
        fromNodeId: nodeId,
        toNodeId: nodes.find(n => {
          if (n.type === 'pc') return n.cliState.vpcsIp === ping.destIp;
          return (Object.values(n.interfaces) as NetworkInterface[]).some(inf => inf.configStatus === 'no-shutdown' && inf.ip === ping.destIp);
        })?.id || nodeId
      });
    }
  };

  // Global actions
  const handleStartAll = () => {
    nodes.forEach(n => {
      if (n.status === 'stopped') handleStartNode(n.id);
    });
  };

  const handleStopAll = () => {
    setNodes(prev => prev.map(n => ({ ...n, status: 'stopped', bootProgress: -1 })));
  };

  const handleWipeAllConfigs = () => {
    if (confirm('您确定要擦除所有自定义的 IP 和路由配置吗？所有节点都将恢复到默认的初始配置状态。')) {
      setNodes(prev => prev.map(node => {
        const wipedInterfaces = { ...node.interfaces };
        Object.keys(wipedInterfaces).forEach(port => {
          wipedInterfaces[port] = {
            ...wipedInterfaces[port],
            ip: '',
            configStatus: node.type === 'switch' || node.type === 'pc' || node.type === 'server' ? 'no-shutdown' : 'shutdown'
          };
        });

        return {
          ...node,
          interfaces: wipedInterfaces,
          cliState: {
            currentMode: node.type === 'pc' ? 'vpcs' : node.type === 'server' ? 'linux' : 'user',
            routingTable: [],
            savedConfig: '',
            vpcsIp: undefined,
            vpcsMask: undefined,
            vpcsGw: undefined
          },
          terminalLogs: [{ type: 'system', text: '\n设备配置已全部擦除。当前节点处于默认初始启动状态。' }]
        };
      }));
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Top Header Controls bar */}
      <header className={`${isHeaderHidden ? 'h-0 border-b-0 opacity-0 overflow-hidden' : 'h-16 border-b border-slate-800'} flex items-center justify-between px-6 bg-slate-900 flex-shrink-0 z-20 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Network className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wide text-white">网络拓扑仿真系统</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-500 border border-slate-800 font-bold">
                EVE-NG 仿真内核 v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
              当前工作区: <span className="text-emerald-400 font-semibold">{currentTopoName}</span>
            </p>
          </div>
        </div>

        {/* Global Toolbar and presets */}
        <div className="flex items-center gap-3">
          {/* Preset trigger */}
          <button
            onClick={() => {
              const preset = createCorporatePreset();
              setNodes(preset.nodes);
              setLinks(preset.links);
              setCurrentTopoName(preset.name);
              setSelectedNodeId(null);
              setOpenConsoleNodeIds([]);
              setActiveConsoleNodeId(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 rounded-xl transition-all duration-200"
          >
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            重置并加载预设
          </button>

          <div className="w-[1px] bg-slate-800 h-6" />

          {/* Toggle Grid */}
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              showGrid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="切换网格背景"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              showLabels
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title="切换接口名称标签"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Toggle Left Sidebar */}
          <button
            onClick={() => setIsLeftSidebarCollapsed(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              !isLeftSidebarCollapsed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={isLeftSidebarCollapsed ? "显示左侧工具栏" : "隐藏左侧工具栏"}
          >
            {isLeftSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Toggle Bottom Console */}
          <button
            onClick={() => setIsConsoleHidden(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              !isConsoleHidden
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={isConsoleHidden ? "显示底部控制台" : "隐藏底部控制台"}
          >
            {isConsoleHidden ? <PanelBottomOpen className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
          </button>

          {/* Toggle Right Sidebar */}
          <button
            onClick={() => setIsRightSidebarCollapsed(prev => !prev)}
            className={`p-2 rounded-xl border transition-all ${
              !isRightSidebarCollapsed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={isRightSidebarCollapsed ? "显示右侧属性栏" : "隐藏右侧属性栏"}
          >
            {isRightSidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>

          <div className="w-[1px] bg-slate-800 h-6" />

          {/* Save & Load manager buttons */}
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-950 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 rounded-xl transition-all duration-200"
          >
            <Save className="w-4 h-4 text-emerald-400" /> 保存 / 读取
          </button>

          {/* Help Modal trigger */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300 rounded-xl transition-all"
            title="系统使用帮助"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Core Editor split panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left column: Node and tools catalog palette */}
        <aside className={`${isLeftSidebarCollapsed ? 'w-0 border-r-0' : 'w-80 border-r border-slate-800'} flex flex-col flex-shrink-0 bg-slate-900 overflow-hidden transition-all duration-300 relative`}>
          <DevicePalette
            activeTool={activeTool}
            onSetTool={setActiveTool}
            onAddDevice={handleAddDevice}
          />
        </aside>

        {/* Central columns: Canvas (Top) and SSH console drawer (Bottom) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden p-4">
          <div className="flex-1 min-h-0 relative">
            <NetworkCanvas
              nodes={nodes}
              links={links}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onUpdateNodePos={handleUpdateNodePos}
              onStartNode={handleStartNode}
              onStopNode={handleStopNode}
              onDeleteNode={handleDeleteNode}
              onOpenConsole={handleOpenConsole}
              onRenameNode={handleRenameNode}
              activeTool={activeTool}
              onSetTool={setActiveTool}
              onCreateLink={handleCreateLink}
              onDeleteLink={handleDeleteLink}
              showGrid={showGrid}
              showLabels={showLabels}
              pingAnimation={pingAnimation}
              onClearPingAnimation={() => setPingAnimation(null)}
            />

            {/* Top Header Floating Toggle Button */}
            <button
              onClick={() => setIsHeaderHidden(prev => !prev)}
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-10 p-1.5 px-2 bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white rounded-xl shadow-2xl transition-all duration-200 pointer-events-auto flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider ${
                isHeaderHidden ? 'ring-2 ring-emerald-500/50' : ''
              }`}
              title={isHeaderHidden ? "展开顶部导航栏" : "折叠顶部导航栏"}
            >
              {isHeaderHidden ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span className="text-emerald-400 pr-1">展开顶部导航</span>
                </>
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Left Sidebar Floating Toggle Button */}
            <button
              onClick={() => setIsLeftSidebarCollapsed(prev => !prev)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white rounded-xl shadow-2xl transition-all duration-200 pointer-events-auto ${
                isLeftSidebarCollapsed ? 'ring-2 ring-emerald-500/50' : ''
              }`}
              title={isLeftSidebarCollapsed ? "展开左侧工具栏" : "折叠左侧工具栏"}
            >
              {isLeftSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-emerald-400" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Right Sidebar Floating Toggle Button */}
            <button
              onClick={() => setIsRightSidebarCollapsed(prev => !prev)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-slate-900/95 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white rounded-xl shadow-2xl transition-all duration-200 pointer-events-auto ${
                isRightSidebarCollapsed ? 'ring-2 ring-emerald-500/50' : ''
              }`}
              title={isRightSidebarCollapsed ? "展开右侧属性栏" : "折叠右侧属性栏"}
            >
              {isRightSidebarCollapsed ? <PanelRightOpen className="w-4 h-4 text-emerald-400" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>

          <div className={`${isConsoleHidden ? 'h-0 opacity-0 overflow-hidden mt-0' : isConsoleCollapsed ? 'h-11 mt-4' : 'h-72 mt-4'} flex-shrink-0 transition-all duration-300 relative`}>
            {!isConsoleHidden && (
              <ConsoleTabs
                nodes={nodes}
                links={links}
                openConsoleNodeIds={openConsoleNodeIds}
                activeConsoleNodeId={activeConsoleNodeId}
                onSetActiveConsole={setActiveConsoleNodeId}
                onCloseConsole={handleCloseConsole}
                onExecuteCommand={handleExecuteCommand}
                onClearConsoleLogs={handleClearConsoleLogs}
                isCollapsed={isConsoleCollapsed}
                onToggleCollapse={() => setIsConsoleCollapsed(!isConsoleCollapsed)}
              />
            )}
          </div>
        </main>

        {/* Right column: Properties of selected, or resource summary monitor */}
        <aside className={`${isRightSidebarCollapsed ? 'w-0 border-l-0' : 'w-80 border-l border-slate-800'} flex flex-col flex-shrink-0 bg-slate-900 overflow-hidden transition-all duration-300 relative`}>
          {selectedNode ? (
            <NodeProperties
              node={selectedNode}
              onStartNode={handleStartNode}
              onStopNode={handleStopNode}
              onOpenConsole={handleOpenConsole}
              onUpdateInterfaceIP={handleUpdateInterfaceIP}
              onAddRoute={handleAddRoute}
              onDeleteRoute={handleDeleteRoute}
            />
          ) : (
            <ResourceMonitor
              nodes={nodes}
              links={links}
              onStartAll={handleStartAll}
              onStopAll={handleStopAll}
              onWipeAll={handleWipeAllConfigs}
            />
          )}
        </aside>
      </div>

      {/* Save & Load / Import & Export Library Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">拓扑项目库</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">管理、加载或导入/导出自定义网络拓扑方案</p>
              </div>
              <button onClick={() => setShowSavedModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Quick rename current layout */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">当前工作区项目名称</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-emerald-500 text-slate-100 font-semibold"
                    value={currentTopoName}
                    onChange={(e) => setCurrentTopoName(e.target.value)}
                  />
                  <button
                    onClick={() => handleSaveToLocalStorage()}
                    className="flex items-center gap-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <Check className="w-4 h-4" /> 保存当前
                  </button>
                </div>
              </div>

              {/* Saved list library */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5">浏览器本地已保存项目</label>
                <div className="max-h-48 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  {savedTopologies.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
                      <div>
                        <span className="block text-xs font-bold text-slate-200">{t.name}</span>
                        <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{t.nodes.length} 个节点 • {t.links.length} 条物理连线</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleLoadTopology(t)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded transition-all"
                        >
                          加载拓扑
                        </button>
                        <button
                          onClick={() => {
                            const updated = savedTopologies.filter(x => x.name !== t.name);
                            setSavedTopologies(updated);
                            localStorage.setItem('ais_saved_topologies', JSON.stringify(updated));
                          }}
                          disabled={t.name === '企业级广域网预设' || t.name === 'Corporate WAN Preset'}
                          className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-all"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JSON export/import */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> 导出 JSON 配置文件
                </button>
                <label className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-emerald-400" /> 导入 JSON 配置文件
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportJSON}
                  />
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 bg-slate-950 border-t border-slate-800">
              <button
                onClick={handleAddNewBlankTopology}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                + 新建空白画布拓扑
              </button>
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructional Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-sans">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">网络拓扑系统使用帮助</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">快速配置指南与 CLI 命令行参考</p>
              </div>
              <button onClick={() => setShowHelpModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto text-xs text-slate-400 leading-relaxed">
              <p>
                本系统是一个可交互的二层、三层 Cisco IOS 与 Linux 虚拟网络仿真实验室。您可以在此设计网络拓扑、配置接口 IP、建立静态路由，并实时观察 ICMP ping 数据包在链路中的流动轨迹。
              </p>

              <div>
                <h4 className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">1. 连接设备物理网线 (连线)</h4>
                <p>点击左侧工具栏的 <strong>“连线” (Cable)</strong> 动作工具。点击设备 A 选择一个物理网口，接着点击设备 B 选择一个物理网口。即可在两台设备间拉起一条虚线链路电缆。</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">2. 设备电源开关与终端控制台</h4>
                <p>新建的设备默认处于关闭状态（离线）。右键单击画布上的设备以打开右键菜单，并选择 <strong>“启动设备”</strong>。启动完成后，选择 <strong>“打开控制台”</strong> 即可在下方开启交互式 SSH 终端。</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">3. 配置子网 IP 与默认网关</h4>
                <p>为了在不同物理子网之间建立跨路由通信，请按如下方式分配接口 IP：</p>
                <ul className="list-disc pl-5 mt-1 space-y-1.5 font-mono text-[10.5px]">
                  <li>
                    <span className="text-emerald-400 font-bold">VPCS PC 客户端</span>: <br />
                    <code>ip 10.0.0.10/24 10.0.0.1</code> (ip/前缀掩码 默认网关)
                  </li>
                  <li>
                    <span className="text-sky-400 font-bold">Cisco IOS 路由器</span>: <br />
                    <code>enable</code> <br />
                    <code>configure terminal</code> <br />
                    <code>interface e0/0</code> <br />
                    <code>ip address 10.0.0.1 255.255.255.0</code> <br />
                    <code>no shutdown</code>
                  </li>
                  <li>
                    <span className="text-amber-400 font-bold">Linux 服务器</span>: <br />
                    <code>ifconfig eth0 10.0.0.100 netmask 255.255.255.0 up</code> <br />
                    <code>route add default gw 10.0.0.1</code>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 mb-1 border-b border-slate-800 pb-1">4. 实时路径追踪与 ICMP Pings</h4>
                <p>在任意已启动节点的控制台终端中（如 PC1）运行 <code>ping 192.168.2.50</code>。若物理链路接口 IP 配置正确，且中介路由器配置了静态路由，您将看到金色 ICMP 报文在画布中依次穿过各交换机、路由器和广域网物理线路，并安全返回！</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-4 bg-slate-950 border-t border-slate-800">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                关闭并开始搭建拓扑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
