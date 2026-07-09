/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType = 'router' | 'switch' | 'firewall' | 'pc' | 'server' | 'cloud';

export interface NetworkInterface {
  name: string;
  ip: string;       // e.g. "192.168.1.1"
  subnet: string;   // e.g. "255.255.255.0"
  configStatus: 'shutdown' | 'no-shutdown';
}

export interface RouteEntry {
  destination: string; // Network IP, e.g. "192.168.2.0" or "0.0.0.0"
  mask: string;        // Netmask, e.g. "255.255.255.0" or "0.0.0.0"
  nextHop: string;     // e.g. "192.168.1.2"
  interfaceName: string;
}

export interface CLIState {
  currentMode: 'user' | 'priv' | 'config' | 'config-if' | 'vpcs' | 'linux';
  activeInterface?: string; // Interface currently being edited, e.g., "e0/0"
  vpcsIp?: string;          // VPCS Specific IP
  vpcsMask?: number;        // VPCS Specific CIDR (e.g., 24)
  vpcsGw?: string;          // VPCS Specific Gateway
  routingTable: RouteEntry[];
  savedConfig: string;      // Simulated flash config
}

export interface NetworkNode {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  status: 'started' | 'stopped';
  ram: number; // in MB
  cpu: number; // in vCPUs
  interfaces: { [portName: string]: NetworkInterface };
  cliState: CLIState;
  bootProgress: number; // -1 if stopped, 0-100 if booting/booted
  terminalLogs: { type: 'input' | 'output' | 'system'; text: string }[];
  terminalInputBuffer: string;
}

export interface NetworkLink {
  id: string;
  fromNodeId: string;
  fromInterface: string;
  toNodeId: string;
  toInterface: string;
}

export interface Topology {
  id: string;
  name: string;
  description: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  createdAt: string;
}

export interface PingAnimation {
  id: string;
  linkIds: string[]; // List of links the packet traverses in order
  pathPoints: { x: number; y: number }[]; // Coordinates for the SVG stroke animation
  status: 'success' | 'failure';
  fromNodeId: string;
  toNodeId: string;
}
