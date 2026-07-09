/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NetworkNode, NetworkLink, DeviceType, PingAnimation } from '../types';
import { Play, Square, Terminal, Settings, Trash2, Edit3, ShieldAlert, Zap, ZoomIn, ZoomOut } from 'lucide-react';

interface NetworkCanvasProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNodePos: (id: string, x: number, y: number) => void;
  onStartNode: (id: string) => void;
  onStopNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onOpenConsole: (id: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  
  // Connection state
  activeTool: 'select' | 'cable' | 'delete' | 'pan';
  onSetTool: (tool: 'select' | 'cable' | 'delete' | 'pan') => void;
  onCreateLink: (fromId: string, fromPort: string, toId: string, toPort: string) => void;
  onDeleteLink: (id: string) => void;

  // Visual settings
  showGrid: boolean;
  showLabels: boolean;

  // Active ping animation
  pingAnimation: PingAnimation | null;
  onClearPingAnimation: () => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePos,
  onStartNode,
  onStopNode,
  onDeleteNode,
  onOpenConsole,
  onRenameNode,
  activeTool,
  onSetTool,
  onCreateLink,
  onDeleteLink,
  showGrid,
  showLabels,
  pingAnimation,
  onClearPingAnimation
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  
  // Listen to keyboard Space key to toggle isSpacePressed state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Dragging a node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cable tool flow state
  const [cableSource, setCableSource] = useState<{ nodeId: string; portName: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [portMenuNodeId, setPortMenuNodeId] = useState<string | null>(null);
  const [portMenuType, setPortMenuType] = useState<'source' | 'target'>('source');
  const [tempTargetNodeId, setTempTargetNodeId] = useState<string | null>(null);

  // Right-click context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  // Rename node inline state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');

  // Handle zooming with mouse wheel natively to prevent page scroll and support smooth zooming at mouse pointer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(zoom * scaleFactor, 0.4), 3.0);
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const dx = mouseX - pan.x;
      const dy = mouseY - pan.y;
      
      setPan({
        x: mouseX - dx * (newZoom / zoom),
        y: mouseY - dy * (newZoom / zoom)
      });
      setZoom(newZoom);
    };

    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelNative);
    };
  }, [zoom, pan]);

  const handleZoomIn = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newZoom = Math.min(zoom + 0.15, 3.0);
      const dx = centerX - pan.x;
      const dy = centerY - pan.y;
      setPan({
        x: centerX - dx * (newZoom / zoom),
        y: centerY - dy * (newZoom / zoom)
      });
      setZoom(newZoom);
    } else {
      setZoom(prev => Math.min(prev + 0.15, 3.0));
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newZoom = Math.max(zoom - 0.15, 0.4);
      const dx = centerX - pan.x;
      const dy = centerY - pan.y;
      setPan({
        x: centerX - dx * (newZoom / zoom),
        y: centerY - dy * (newZoom / zoom)
      });
      setZoom(newZoom);
    } else {
      setZoom(prev => Math.max(prev - 0.15, 0.4));
    }
  };

  // Convert client cursor coords to Canvas space (accounting for pan & zoom)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  // Global mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (draggingNodeId) {
      // Snapping to 20px grid
      const snappedX = Math.round((coords.x - dragOffset.x) / 20) * 20;
      const snappedY = Math.round((coords.y - dragOffset.y) / 20) * 20;
      onUpdateNodePos(draggingNodeId, snappedX, snappedY);
    }
  };

  // Global mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Close context and port menus on canvas click
    setContextMenu(null);
    setPortMenuNodeId(null);
    onSelectNode(null);

    // Allow panning with left mouse button (0) or middle mouse button (1)
    // Supports pan tool, select tool, Spacebar shortcut, middle click, or shift-drag
    if (
      activeTool === 'pan' ||
      activeTool === 'select' ||
      isSpacePressed ||
      e.button === 1 ||
      e.shiftKey
    ) {
      if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    } else if (activeTool === 'cable' && cableSource) {
      // Cancel cable drawing if clicked empty canvas space
      setCableSource(null);
    }
  };

  // Node mouse events
  const handleNodeMouseDown = (e: React.MouseEvent, node: NetworkNode) => {
    e.stopPropagation();
    setContextMenu(null);
    onSelectNode(node.id);

    if (activeTool === 'delete') {
      onDeleteNode(node.id);
      return;
    }

    if (activeTool === 'cable') {
      if (!cableSource) {
        // Step 1: Open source port menu
        setPortMenuNodeId(node.id);
        setPortMenuType('source');
      } else if (cableSource.nodeId !== node.id) {
        // Step 2: Open target port menu
        setTempTargetNodeId(node.id);
        setPortMenuNodeId(node.id);
        setPortMenuType('target');
      }
      return;
    }

    if (activeTool === 'select') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDraggingNodeId(node.id);
      setDragOffset({
        x: coords.x - node.x,
        y: coords.y - node.y
      });
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectNode(nodeId);
    
    // Position menu in standard window coordinate space
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        nodeId
      });
    }
  };

  // Check if port is already connected
  const isPortConnected = (nodeId: string, portName: string) => {
    return links.some(l => 
      (l.fromNodeId === nodeId && l.fromInterface === portName) ||
      (l.toNodeId === nodeId && l.toInterface === portName)
    );
  };

  const selectSourcePort = (portName: string) => {
    if (!portMenuNodeId) return;
    setCableSource({ nodeId: portMenuNodeId, portName });
    setPortMenuNodeId(null);
  };

  const selectTargetPort = (portName: string) => {
    if (!cableSource || !tempTargetNodeId) return;
    onCreateLink(cableSource.nodeId, cableSource.portName, tempTargetNodeId, portName);
    setCableSource(null);
    setTempTargetNodeId(null);
    setPortMenuNodeId(null);
  };

  // Dynamic animations for active ping packets
  const [animatedPacket, setAnimatedPacket] = useState<{ x: number; y: number; progress: number } | null>(null);

  useEffect(() => {
    if (!pingAnimation) {
      setAnimatedPacket(null);
      return;
    }

    // Solve path coordinates
    const pathCoords: { x: number; y: number }[] = [];
    const startNode = nodes.find(n => n.id === pingAnimation.fromNodeId);
    if (startNode) pathCoords.push({ x: startNode.x, y: startNode.y });

    // Traverse links to gather nodes path
    let currentId = pingAnimation.fromNodeId;
    pingAnimation.linkIds.forEach(linkId => {
      const link = links.find(l => l.id === linkId);
      if (link) {
        const nextId = link.fromNodeId === currentId ? link.toNodeId : link.fromNodeId;
        const nextNode = nodes.find(n => n.id === nextId);
        if (nextNode) {
          pathCoords.push({ x: nextNode.x, y: nextNode.y });
          currentId = nextId;
        }
      }
    });

    if (pathCoords.length < 2) {
      onClearPingAnimation();
      return;
    }

    // Run frame-by-frame path animation
    let step = 0;
    const totalFrames = 120; // 2 seconds total loop
    const interval = setInterval(() => {
      step++;
      const p = step / totalFrames;
      
      if (p >= 1) {
        clearInterval(interval);
        setAnimatedPacket(null);
        setTimeout(() => {
          onClearPingAnimation();
        }, 800);
        return;
      }

      // Calculate position on multi-segment path
      // Handle forward path (ping request) and return path (ping reply) if success
      let progress = p;
      let actualPath = [...pathCoords];

      if (pingAnimation.status === 'success') {
        // If success, forward is 0.0 to 0.5, backward is 0.5 to 1.0
        if (progress < 0.5) {
          progress = progress * 2; // scale to 0..1
        } else {
          progress = (1.0 - progress) * 2; // scale back 1..0
        }
      } else {
        // If fail, packet travels forward but dissipates or fails at the last hop
        progress = Math.min(progress * 1.5, 1.0);
      }

      const segmentCount = actualPath.length - 1;
      const scaledProgress = progress * segmentCount;
      const currentSegment = Math.min(Math.floor(scaledProgress), segmentCount - 1);
      const segmentProgress = scaledProgress - currentSegment;

      const p1 = actualPath[currentSegment];
      const p2 = actualPath[currentSegment + 1];

      if (p1 && p2) {
        setAnimatedPacket({
          x: p1.x + (p2.x - p1.x) * segmentProgress,
          y: p1.y + (p2.y - p1.y) * segmentProgress,
          progress: p
        });
      }
    }, 16);

    return () => clearInterval(interval);
  }, [pingAnimation, nodes, links]);

  // Icons mapper
  const renderDeviceIcon = (type: DeviceType, status: 'started' | 'stopped') => {
    const activeColor = status === 'started' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'text-slate-400';
    switch (type) {
      case 'router':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-emerald-500 bg-slate-950' : 'border-slate-700'} ${activeColor} transition-all duration-300`}>
            <Zap className="w-8 h-8" />
            {status === 'started' && <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />}
          </div>
        );
      case 'switch':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-emerald-500' : 'border-slate-700'} ${activeColor} transition-all duration-300`}>
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
              <path d="M17 11H7V9l-4 3 4 3v-2h10v2l4-3-4-3v2zM7 5h10V3l4 3-4 3V7H7v2L3 6l4-3v2zM17 17H7v-2l-4 3 4 3v-2h10v2l4-3-4-3v2z" />
            </svg>
            {status === 'started' && <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />}
          </div>
        );
      case 'firewall':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-emerald-500' : 'border-slate-700'} ${activeColor} transition-all duration-300`}>
            <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 3v18M3 9h18M3 15h18" />
            </svg>
            {status === 'started' && <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />}
          </div>
        );
      case 'pc':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-emerald-500' : 'border-slate-700'} ${activeColor} transition-all duration-300`}>
            <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="13" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="16" x2="12" y2="21" />
            </svg>
          </div>
        );
      case 'server':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-emerald-500' : 'border-slate-700'} ${activeColor} transition-all duration-300`}>
            <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="6" rx="1" />
              <rect x="3" y="11" width="18" height="6" rx="1" />
              <line x1="6" y1="6" x2="7" y2="6" />
              <line x1="10" y1="6" x2="14" y2="6" />
              <line x1="6" y1="14" x2="7" y2="14" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
          </div>
        );
      case 'cloud':
        return (
          <div className={`relative p-2 rounded-xl bg-slate-900 border-2 ${status === 'started' ? 'border-sky-500' : 'border-slate-700'} ${status === 'started' ? 'text-sky-400' : 'text-slate-400'} transition-all duration-300`}>
            <svg className="w-8 h-8 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </div>
        );
    }
  };

  const handleStartRename = (node: NetworkNode) => {
    setRenamingId(node.id);
    setRenameValue(node.name);
    setContextMenu(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameValue.trim()) {
      onRenameNode(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div
      id="topo-canvas-container"
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-slate-950 border border-slate-800 rounded-2xl ${
        isPanning ? 'cursor-grabbing' : 
        (activeTool === 'pan' || isSpacePressed) ? 'cursor-grab' : 
        activeTool === 'cable' ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Grid Overlay background */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(#475569 1px, transparent 1px)`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        />
      )}

      {/* SVG Cables drawing layer */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <defs>
          <linearGradient id="activeLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
        </defs>

        {/* Existing Cables */}
        {links.map(link => {
          const fromNode = nodes.find(n => n.id === link.fromNodeId);
          const toNode = nodes.find(n => n.id === link.toNodeId);
          if (!fromNode || !toNode) return null;

          const isLinkActive = 
            fromNode.status === 'started' && 
            toNode.status === 'started' &&
            fromNode.interfaces[link.fromInterface]?.configStatus === 'no-shutdown' &&
            toNode.interfaces[link.toInterface]?.configStatus === 'no-shutdown';

          const strokeColor = isLinkActive ? 'url(#activeLinkGrad)' : '#475569';
          const strokeWidth = isLinkActive ? 3 : 2;

          // Avoid zero-dimension bounding boxes for linear gradients by adding a tiny offset if coordinates are exactly equal
          const x1 = fromNode.x;
          const y1 = fromNode.y;
          const x2 = fromNode.x === toNode.x ? toNode.x + 0.1 : toNode.x;
          const y2 = fromNode.y === toNode.y ? toNode.y + 0.1 : toNode.y;

          return (
            <g key={link.id} className="pointer-events-auto cursor-pointer">
              <path
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="transparent"
                strokeWidth={16}
                className="hover:stroke-amber-500/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTool === 'delete') {
                    onDeleteLink(link.id);
                  }
                }}
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                className="transition-all duration-300"
                strokeDasharray={isLinkActive ? "none" : "4 4"}
              />
              
              {/* Optional dynamic active flowing particles on up link */}
              {isLinkActive && (
                <circle r="3" fill="#34d399">
                  <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    path={`M ${x1} ${y1} L ${x2} ${y2}`}
                  />
                </circle>
              )}

              {/* Port Name Labels on Hover / Toggle */}
              {showLabels && (
                <g className="opacity-80 hover:opacity-100 transition-opacity">
                  {/* From Port */}
                  <g transform={`translate(${fromNode.x + (toNode.x - fromNode.x) * 0.18}, ${fromNode.y + (toNode.y - fromNode.y) * 0.18})`}>
                    <rect x="-18" y="-10" width="36" height="15" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <text fill="#94a3b8" fontSize="8" textAnchor="middle" y="0" fontFamily="monospace">
                      {link.fromInterface}
                    </text>
                  </g>
                  {/* To Port */}
                  <g transform={`translate(${fromNode.x + (toNode.x - fromNode.x) * 0.82}, ${fromNode.y + (toNode.y - fromNode.y) * 0.82})`}>
                    <rect x="-18" y="-10" width="36" height="15" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <text fill="#94a3b8" fontSize="8" textAnchor="middle" y="0" fontFamily="monospace">
                      {link.toInterface}
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* Dynamic Temporary Dash Cable when connecting */}
        {activeTool === 'cable' && cableSource && (
          <g>
            {(() => {
              const srcNode = nodes.find(n => n.id === cableSource.nodeId);
              if (!srcNode) return null;
              return (
                <line
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />
              );
            })()}
          </g>
        )}

        {/* Live Packet Ping Animation */}
        {animatedPacket && (
          <g>
            {/* Glowing outer halo */}
            <circle
              cx={animatedPacket.x}
              cy={animatedPacket.y}
              r="12"
              fill={pingAnimation?.status === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}
              className="animate-ping"
            />
            {/* Core traveling node */}
            <circle
              cx={animatedPacket.x}
              cy={animatedPacket.y}
              r="6"
              fill={pingAnimation?.status === 'success' ? '#10b981' : '#ef4444'}
              className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            />
            {/* Packet visual label */}
            <g transform={`translate(${animatedPacket.x}, ${animatedPacket.y - 14})`}>
              <rect x="-24" y="-8" width="48" height="14" rx="4" fill="#020617" stroke={pingAnimation?.status === 'success' ? '#10b981' : '#ef4444'} strokeWidth="1" />
              <text fill="#ffffff" fontSize="7" textAnchor="middle" y="1" fontWeight="bold" fontFamily="monospace">
                ICMP
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* Nodes (Draggable divs Layer) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id;
          return (
            <div
              key={node.id}
              className="absolute pointer-events-auto select-none"
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
            >
              {/* Device Icon Wrapper */}
              <div 
                className={`flex flex-col items-center justify-center p-1 rounded-2xl cursor-grab active:cursor-grabbing transition-all ${
                  isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-105' : 'hover:scale-102'
                }`}
              >
                {renderDeviceIcon(node.type, node.status)}

                {/* Inline Editing or Label Text */}
                <div className="mt-1.5 flex items-center justify-center text-center">
                  {renamingId === node.id ? (
                    <input
                      type="text"
                      className="w-20 px-1 py-0.5 text-xs text-center bg-slate-900 text-white rounded border border-emerald-500 focus:outline-none"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleSaveRename(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(node.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-semibold text-slate-200 tracking-wide select-none truncate max-w-[100px]">
                        {node.name}
                      </span>
                      {/* Subtitle with active primary IP if present */}
                      {node.status === 'started' && (
                        <span className="text-[9px] font-mono text-emerald-400 mt-0.5 opacity-80">
                          {node.type === 'pc' && node.cliState.vpcsIp ? node.cliState.vpcsIp : 
                           node.interfaces['eth0']?.ip || node.interfaces['e0/0']?.ip || ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Port Connector Popups (Visual helpers inside connecting flow) */}
              {portMenuNodeId === node.id && (
                <div 
                  className="absolute z-50 left-full top-0 ml-4 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[120px]"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-bold text-slate-400 px-1 border-b border-slate-800 pb-1 mb-1 font-sans">
                    {portMenuType === 'source' ? '选择源端口:' : '选择目标端口:'}
                  </p>
                  {Object.keys(node.interfaces).map(portName => {
                    const isUsed = isPortConnected(node.id, portName);
                    return (
                      <button
                        key={portName}
                        disabled={isUsed}
                        onClick={() => portMenuType === 'source' ? selectSourcePort(portName) : selectTargetPort(portName)}
                        className={`text-left text-xs px-2 py-1 rounded font-mono ${
                          isUsed 
                            ? 'text-slate-600 bg-slate-950 cursor-not-allowed' 
                            : 'text-slate-300 hover:bg-emerald-500 hover:text-white transition-colors'
                        }`}
                      >
                        {portName} {isUsed ? '(已连接)' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Node Context Menu */}
      {contextMenu && (
        <div
          className="absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl shadow-2xl p-1.5 min-w-[170px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const node = nodes.find(n => n.id === contextMenu.nodeId);
            if (!node) return null;
            const deviceTypesChinese: Record<DeviceType, string> = {
              router: '路由器',
              switch: '交换机',
              firewall: '防火墙',
              pc: '客户端 PC',
              server: '服务器',
              cloud: '互联网云'
            };
            return (
              <div className="flex flex-col gap-0.5 font-sans">
                <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  {node.name} ({deviceTypesChinese[node.type] || node.type})
                </div>

                {node.status === 'stopped' ? (
                  <button
                    onClick={() => { onStartNode(node.id); setContextMenu(null); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors text-left"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" /> 启动设备
                  </button>
                ) : (
                  <button
                    onClick={() => { onStopNode(node.id); setContextMenu(null); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-amber-500 hover:text-white rounded-lg transition-colors text-left"
                  >
                    <Square className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" /> 关闭设备
                  </button>
                )}

                {node.status === 'started' && (
                  <button
                    onClick={() => { onOpenConsole(node.id); setContextMenu(null); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-sky-500 hover:text-white rounded-lg transition-colors text-left"
                  >
                    <Terminal className="w-3.5 h-3.5 text-sky-400" /> 打开控制台
                  </button>
                )}

                <button
                  onClick={() => handleStartRename(node)}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" /> 重命名节点
                </button>

                <div className="h-[1px] bg-slate-800 my-1" />

                <button
                  onClick={() => { onDeleteNode(node.id); setContextMenu(null); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" /> 擦除并删除
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Floating Canvas Controls (Reset Zoom, Pan, etc.) */}
      <div className="absolute bottom-4 left-4 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg flex items-center gap-1 z-10 pointer-events-auto">
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="px-2.5 py-1.5 text-[10px] text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all font-semibold uppercase tracking-wider font-sans"
        >
          重置视图
        </button>
        <div className="w-[1px] bg-slate-800 h-4 mx-1" />
        
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center"
          title="缩小 (Zoom Out)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        
        <span className="px-1 py-1.5 text-[10px] text-slate-300 font-sans font-medium min-w-[44px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all flex items-center justify-center"
          title="放大 (Zoom In)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
