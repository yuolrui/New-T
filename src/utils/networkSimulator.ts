/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NetworkNode, NetworkLink, RouteEntry } from '../types';

/**
 * Convert IP string (e.g., "192.168.1.1") to a 32-bit unsigned integer.
 */
export function ipToInt(ip: string): number {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((res, octet) => {
    const val = parseInt(octet, 10);
    return (res << 8) + (isNaN(val) ? 0 : val);
  }, 0) >>> 0;
}

/**
 * Convert 32-bit integer back to IP string.
 */
export function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff
  ].join('.');
}

/**
 * Convert CIDR number (e.g., 24) to a 32-bit netmask integer.
 */
export function cidrToMaskInt(cidr: number): number {
  if (cidr <= 0) return 0;
  if (cidr >= 32) return 0xffffffff;
  return (0xffffffff << (32 - cidr)) >>> 0;
}

/**
 * Convert dotted decimal netmask to CIDR prefix length.
 */
export function maskToCidr(mask: string): number {
  const maskInt = ipToInt(mask);
  let cidr = 0;
  for (let i = 31; i >= 0; i--) {
    if (((maskInt >>> i) & 1) === 1) {
      cidr++;
    } else {
      break;
    }
  }
  return cidr;
}

/**
 * Checks if two IPs are on the same subnet given a mask.
 */
export function ipInSubnet(ip1: string, ip2: string, mask: string): boolean {
  const ip1Int = ipToInt(ip1);
  const ip2Int = ipToInt(ip2);
  const maskInt = mask.includes('.') ? ipToInt(mask) : cidrToMaskInt(parseInt(mask, 10));
  return (ip1Int & maskInt) === (ip2Int & maskInt);
}

export interface L2Endpoint {
  nodeId: string;
  interfaceName: string;
  linkIds: string[]; // Accumulated link IDs traversed to reach this endpoint
  nodeIdsTraversed: string[]; // Nodes visited (mostly switches)
}

/**
 * Traverses links starting from a specific node interface to find all Layer 2 connected endpoints.
 * A restarted switch behaves as an L2 broadcast domain hub, flooding packets.
 */
export function getL2BroadcastDomain(
  nodes: NetworkNode[],
  links: NetworkLink[],
  startNodeId: string,
  startInterfaceName: string
): L2Endpoint[] {
  const endpoints: L2Endpoint[] = [];
  const visited = new Set<string>(); // "nodeId:interfaceName"
  
  const startNode = nodes.find(n => n.id === startNodeId);
  if (!startNode || startNode.status === 'stopped') return [];

  // Queue for BFS
  // Each entry represents a port we are traversing FROM
  const queue: { nodeId: string; interfaceName: string; linkIds: string[]; nodeIdsTraversed: string[] }[] = [
    { nodeId: startNodeId, interfaceName: startInterfaceName, linkIds: [], nodeIdsTraversed: [startNodeId] }
  ];

  visited.add(`${startNodeId}:${startInterfaceName}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Find link connected to this interface
    const link = links.find(l => 
      (l.fromNodeId === current.nodeId && l.fromInterface === current.interfaceName) ||
      (l.toNodeId === current.nodeId && l.toInterface === current.interfaceName)
    );

    if (!link) continue;

    // Determine the other side of the link
    const otherNodeId = link.fromNodeId === current.nodeId ? link.toNodeId : link.fromNodeId;
    const otherInterfaceName = link.fromNodeId === current.nodeId ? link.toInterface : link.fromInterface;
    
    const otherNode = nodes.find(n => n.id === otherNodeId);
    if (!otherNode || otherNode.status === 'stopped') continue;

    const visitedKey = `${otherNodeId}:${otherInterfaceName}`;
    if (visited.has(visitedKey)) continue;
    visited.add(visitedKey);

    const nextLinkIds = [...current.linkIds, link.id];
    const nextNodesTraversed = [...current.nodeIdsTraversed, otherNodeId];

    if (otherNode.type === 'switch') {
      // It's a switch! Flood out of all other interfaces of this switch that are connected to links
      const switchInterfaces = Object.keys(otherNode.interfaces);
      for (const swInt of switchInterfaces) {
        if (swInt === otherInterfaceName) continue; // Don't flood back to the same interface

        const swVisitedKey = `${otherNodeId}:${swInt}`;
        if (!visited.has(swVisitedKey)) {
          visited.add(swVisitedKey);
          queue.push({
            nodeId: otherNodeId,
            interfaceName: swInt,
            linkIds: nextLinkIds,
            nodeIdsTraversed: nextNodesTraversed
          });
        }
      }
    } else {
      // It's an end-device (Router, Firewall, PC, Server, Cloud)
      // Check if this interface is no-shutdown
      const inf = otherNode.interfaces[otherInterfaceName];
      if (inf && inf.configStatus === 'no-shutdown') {
        endpoints.push({
          nodeId: otherNodeId,
          interfaceName: otherInterfaceName,
          linkIds: nextLinkIds,
          nodeIdsTraversed: nextNodesTraversed
        });
      }
    }
  }

  return endpoints;
}

export interface TraceResult {
  success: boolean;
  linkIds: string[]; // List of links traversed
  nodeNames: string[]; // Names of nodes visited
  error?: string;
  debugLogs: string[];
}

/**
 * Resolves the path of a ping packet from a source node to a destination IP.
 * Supports static routes, gateways, and switches.
 */
export function traceRoute(
  nodes: NetworkNode[],
  links: NetworkLink[],
  srcNodeId: string,
  destIp: string,
  maxHops: number = 10
): TraceResult {
  const debugLogs: string[] = [];
  const srcNode = nodes.find(n => n.id === srcNodeId);
  
  if (!srcNode) {
    return { success: false, linkIds: [], nodeNames: [], error: 'Source device not found', debugLogs };
  }
  if (srcNode.status === 'stopped') {
    return { success: false, linkIds: [], nodeNames: [srcNode.name], error: 'Source device is powered off', debugLogs };
  }

  let currentNode = srcNode;
  const linkIdsTraversed: string[] = [];
  const nodeNamesVisited: string[] = [srcNode.name];
  const visitedNodeIds = new Set<string>([srcNodeId]);

  debugLogs.push(`Starting traceroute from ${srcNode.name} to ${destIp}`);

  for (let hop = 0; hop < maxHops; hop++) {
    debugLogs.push(`--- Hop ${hop + 1}: Currently at ${currentNode.name} ---`);
    
    // 1. Check if the destination is on the current node itself (any of its active interfaces)
    const localMatch = Object.values(currentNode.interfaces).find(inf => {
      // For PCs, check VPCS variables
      if (currentNode.type === 'pc' && currentNode.cliState.vpcsIp === destIp) {
        return true;
      }
      return inf.configStatus === 'no-shutdown' && inf.ip === destIp;
    });

    if (localMatch) {
      debugLogs.push(`Destination ${destIp} is a local IP of ${currentNode.name}. Ping successful!`);
      return {
        success: true,
        linkIds: linkIdsTraversed,
        nodeNames: nodeNamesVisited,
        debugLogs
      };
    }

    // 2. Determine where to forward the packet.
    // For PCs/Servers, we use their IP configuration and Gateway.
    // For Routers/Firewalls, we use their Routing Table.
    
    let outgoingInterface: string | undefined;
    let nextHopIp: string | undefined;
    let isDirectlyConnected = false;

    if (currentNode.type === 'pc') {
      const pcIp = currentNode.cliState.vpcsIp;
      const pcMask = currentNode.cliState.vpcsMask;
      const pcGw = currentNode.cliState.vpcsGw;

      if (!pcIp || !pcMask) {
        debugLogs.push(`PC ${currentNode.name} has no IP address configured.`);
        return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'Source IP not configured', debugLogs };
      }

      const maskStr = cidrToMaskInt(pcMask);
      const isDestInLocalSubnet = ipInSubnet(pcIp, destIp, maskStr.toString());

      if (isDestInLocalSubnet) {
        outgoingInterface = 'eth0';
        nextHopIp = destIp;
        isDirectlyConnected = true;
        debugLogs.push(`Destination ${destIp} is in local subnet. ARP-ing directly...`);
      } else if (pcGw) {
        outgoingInterface = 'eth0';
        nextHopIp = pcGw;
        debugLogs.push(`Destination ${destIp} is remote. Forwarding to gateway ${pcGw}...`);
      } else {
        debugLogs.push(`Destination ${destIp} is remote but PC has no default gateway.`);
        return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'No route to host', debugLogs };
      }
    } else {
      // Router / Firewall / Server
      // Check if destination matches any direct subnet
      const directMatch = Object.entries(currentNode.interfaces).find(([name, inf]) => {
        if (inf.configStatus === 'shutdown' || !inf.ip || !inf.subnet) return false;
        return ipInSubnet(inf.ip, destIp, inf.subnet);
      });

      if (directMatch) {
        const [intName, inf] = directMatch;
        outgoingInterface = intName;
        nextHopIp = destIp;
        isDirectlyConnected = true;
        debugLogs.push(`Destination ${destIp} is directly connected on ${intName}`);
      } else {
        // Look up routing table
        debugLogs.push(`Looking up routing table on ${currentNode.name}...`);
        const routingTable = currentNode.cliState.routingTable;
        
        let bestRoute: RouteEntry | null = null;
        let bestMaskLen = -1;

        for (const route of routingTable) {
          const rDestInt = ipToInt(route.destination);
          const rMaskInt = ipToInt(route.mask);
          const destInt = ipToInt(destIp);

          if ((destInt & rMaskInt) === (rDestInt & rMaskInt)) {
            const maskLen = maskToCidr(route.mask);
            if (maskLen > bestMaskLen) {
              bestMaskLen = maskLen;
              bestRoute = route;
            }
          }
        }

        if (bestRoute) {
          outgoingInterface = bestRoute.interfaceName;
          nextHopIp = bestRoute.nextHop || destIp; // If nextHop is blank, assume directly connected on interface
          if (!bestRoute.nextHop) {
            isDirectlyConnected = true;
          }
          debugLogs.push(`Matched route: ${bestRoute.destination}/${bestMaskLen} via ${bestRoute.nextHop || 'direct'} interface ${bestRoute.interfaceName}`);
        } else {
          debugLogs.push(`No routing entry found for ${destIp} in ${currentNode.name}`);
          return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'No route to host', debugLogs };
        }
      }
    }

    if (!outgoingInterface || !nextHopIp) {
      return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'No route to host', debugLogs };
    }

    // Verify outgoing interface is UP
    const outInf = currentNode.interfaces[outgoingInterface];
    // PC eth0 is always up if started
    if (currentNode.type !== 'pc' && (!outInf || outInf.configStatus === 'shutdown')) {
      debugLogs.push(`Outgoing interface ${outgoingInterface} on ${currentNode.name} is administrative shutdown.`);
      return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'Interface shutdown', debugLogs };
    }

    // 3. Find connected L2 endpoint for the outgoing IP / Next Hop
    debugLogs.push(`ARP resolving ${nextHopIp} on L2 domain of ${currentNode.name}:${outgoingInterface}...`);
    const l2Endpoints = getL2BroadcastDomain(nodes, links, currentNode.id, outgoingInterface);
    
    // Find the endpoint matching the IP
    const matchingEndpoint = l2Endpoints.find(ep => {
      const epNode = nodes.find(n => n.id === ep.nodeId);
      if (!epNode) return false;
      
      // Match node's connected interface IP
      const epInf = epNode.interfaces[ep.interfaceName];
      if (epNode.type === 'pc' && epNode.cliState.vpcsIp === nextHopIp) {
        return true;
      }
      return epInf && epInf.configStatus === 'no-shutdown' && epInf.ip === nextHopIp;
    });

    if (!matchingEndpoint) {
      debugLogs.push(`ARP failed: No active device answered ARP request for IP ${nextHopIp}`);
      return { success: false, linkIds: [...linkIdsTraversed], nodeNames: nodeNamesVisited, error: 'Request timed out (ARP failed)', debugLogs };
    }

    // Append link IDs traversed at L2 level (switches are transparent)
    linkIdsTraversed.push(...matchingEndpoint.linkIds);
    
    // Append nodes traversed
    const nextNode = nodes.find(n => n.id === matchingEndpoint.nodeId)!;
    nodeNamesVisited.push(...matchingEndpoint.nodeIdsTraversed.filter(id => id !== currentNode.id).map(id => nodes.find(n => n.id === id)?.name || ''));
    
    if (visitedNodeIds.has(nextNode.id)) {
      debugLogs.push(`Routing loop detected! Already visited ${nextNode.name}`);
      return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'TTL expired in transit (Routing loop)', debugLogs };
    }
    
    visitedNodeIds.add(nextNode.id);
    currentNode = nextNode;

    // If we've reached the target IP on this hop, we are done!
    if (isDirectlyConnected && (
      (currentNode.type === 'pc' && currentNode.cliState.vpcsIp === destIp) ||
      Object.values(currentNode.interfaces).some(inf => inf.configStatus === 'no-shutdown' && inf.ip === destIp)
    )) {
      debugLogs.push(`Reached target IP ${destIp} on ${currentNode.name}. Ping successful!`);
      return {
        success: true,
        linkIds: linkIdsTraversed,
        nodeNames: nodeNamesVisited,
        debugLogs
      };
    }
  }

  return { success: false, linkIds: linkIdsTraversed, nodeNames: nodeNamesVisited, error: 'TTL expired in transit', debugLogs };
}
