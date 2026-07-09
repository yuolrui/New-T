/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NetworkNode, NetworkLink, NetworkInterface, RouteEntry, CLIState } from '../types';
import { traceRoute, ipInSubnet, cidrToMaskInt, maskToCidr, ipToInt, intToIp } from './networkSimulator';

export interface CommandResponse {
  updatedNode: NetworkNode;
  outputLogs: { type: 'input' | 'output' | 'system'; text: string }[];
  triggerPing?: {
    destIp: string;
    success: boolean;
    linkIds: string[];
    nodeNames: string[];
    error?: string;
  };
}

export function parseCommand(
  node: NetworkNode,
  nodes: NetworkNode[],
  links: NetworkLink[],
  cmdStr: string
): CommandResponse {
  const trimmed = cmdStr.trim();
  const logs: { type: 'input' | 'output' | 'system'; text: string }[] = [];
  
  // Create deep copy of node to prevent mutation issues
  const updatedNode = JSON.parse(JSON.stringify(node)) as NetworkNode;
  
  // Record the typed command first
  const prompt = getPrompt(updatedNode);
  logs.push({ type: 'input', text: `${prompt}${trimmed}` });

  if (trimmed === '') {
    return { updatedNode, outputLogs: logs };
  }

  const args = trimmed.split(/\s+/);
  const baseCmd = args[0].toLowerCase();

  // Handle 'clear' command for all devices
  if (baseCmd === 'clear' || baseCmd === 'cls') {
    updatedNode.terminalLogs = [];
    return { updatedNode, outputLogs: [] };
  }

  const mode = updatedNode.cliState.currentMode;

  // Route based on device type
  if (updatedNode.type === 'pc') {
    return handlePCCommand(updatedNode, nodes, links, baseCmd, args, logs);
  } else if (updatedNode.type === 'server') {
    return handleServerCommand(updatedNode, nodes, links, baseCmd, args, logs);
  } else {
    // Router / Switch / Firewall (Cisco-style IOS)
    return handleCiscoCommand(updatedNode, nodes, links, baseCmd, args, logs);
  }
}

/**
 * Get prompt prefix based on node type, name and CLI mode
 */
export function getPrompt(node: NetworkNode): string {
  const name = node.cliState.savedConfig.match(/hostname\s+(\S+)/)?.[1] || node.name;
  
  if (node.type === 'pc') {
    return `${name}> `;
  }
  if (node.type === 'server') {
    return `root@${name}:~# `;
  }

  // Cisco IOS
  const mode = node.cliState.currentMode;
  if (mode === 'user') return `${name}>`;
  if (mode === 'priv') return `${name}#`;
  if (mode === 'config') return `${name}(config)#`;
  if (mode === 'config-if') {
    const infName = node.cliState.activeInterface || 'interface';
    return `${name}(config-if)#`;
  }
  return `${name}>`;
}

/**
 * Handle PC (VPCS) commands
 */
function handlePCCommand(
  node: NetworkNode,
  nodes: NetworkNode[],
  links: NetworkLink[],
  baseCmd: string,
  args: string[],
  logs: { type: 'input' | 'output' | 'system'; text: string }[]
): CommandResponse {
  let responsePing: any = undefined;

  switch (baseCmd) {
    case 'help':
    case '?':
      logs.push({
        type: 'output',
        text: `VPCS (Virtual PC Simulator) Commands:
  ip <ip>/<cidr> [<gateway>]  Configure IP address, subnet CIDR prefix and optional gateway
  show ip                     Display IP configuration, MAC and gateway
  clear ip                    Clear IP configuration
  ping <ip_address>           Ping a destination IP
  clear                       Clear terminal screen
  help                        Show this help menu`
      });
      break;

    case 'show':
      if (args[1] === 'ip') {
        showPcIp(node, logs);
      } else {
        logs.push({ type: 'output', text: "Usage: show ip" });
      }
      break;

    case 'ip':
      if (args[1] === 'dhcp') {
        logs.push({ type: 'output', text: 'DHCP DISCOVER sent on eth0...' });
        // Find if connected to a router/server/cloud with no shutdown and some DHCP pool
        logs.push({ type: 'output', text: 'DHCP Request timed out. No DHCP server active.' });
        logs.push({ type: 'output', text: 'Please configure static IP. Format: ip <ip>/<cidr> <gateway>' });
      } else if (args[1]) {
        // Parse IP/CIDR
        const ipPart = args[1];
        const gwPart = args[2];
        const slashIdx = ipPart.indexOf('/');
        if (slashIdx === -1) {
          logs.push({ type: 'output', text: 'Error: Subnet mask CIDR prefix required (e.g. 192.168.1.10/24)' });
          break;
        }
        const ipStr = ipPart.substring(0, slashIdx);
        const cidrStr = ipPart.substring(slashIdx + 1);
        const cidr = parseInt(cidrStr, 10);

        if (isNaN(cidr) || cidr < 1 || cidr > 32) {
          logs.push({ type: 'output', text: `Error: Invalid CIDR prefix length: ${cidrStr}` });
          break;
        }

        node.cliState.vpcsIp = ipStr;
        node.cliState.vpcsMask = cidr;
        node.cliState.vpcsGw = gwPart || undefined;

        // Sync with standard interfaces so network solver can read it easily
        node.interfaces['eth0'] = {
          name: 'eth0',
          ip: ipStr,
          subnet: intToIp(cidrToMaskInt(cidr)),
          configStatus: 'no-shutdown'
        };

        logs.push({
          type: 'output',
          text: `Configured IP: ${ipStr}, Mask: ${intToIp(cidrToMaskInt(cidr))} (/${cidr})${gwPart ? `, Gateway: ${gwPart}` : ''}`
        });
      } else {
        logs.push({ type: 'output', text: 'Usage: ip <ip>/<cidr> [<gateway>]  (e.g., ip 192.168.1.10/24 192.168.1.1)' });
      }
      break;

    case 'clear':
      if (args[1] === 'ip') {
        node.cliState.vpcsIp = undefined;
        node.cliState.vpcsMask = undefined;
        node.cliState.vpcsGw = undefined;
        node.interfaces['eth0'] = {
          name: 'eth0',
          ip: '',
          subnet: '',
          configStatus: 'no-shutdown'
        };
        logs.push({ type: 'output', text: 'IP configurations cleared on eth0.' });
      } else {
        node.terminalLogs = [];
        return { updatedNode: node, outputLogs: [] };
      }
      break;

    case 'ping':
      if (!args[1]) {
        logs.push({ type: 'output', text: 'Usage: ping <ip_address>' });
      } else {
        const targetIp = args[1];
        if (!node.cliState.vpcsIp) {
          logs.push({ type: 'output', text: 'Error: Local IP address not configured. Run "ip <ip>/<cidr>" first.' });
          break;
        }
        
        logs.push({ type: 'output', text: `Pinging ${targetIp} with 64 bytes of data:` });
        
        const trace = traceRoute(nodes, links, node.id, targetIp);
        responsePing = {
          destIp: targetIp,
          success: trace.success,
          linkIds: trace.linkIds,
          nodeNames: trace.nodeNames,
          error: trace.error
        };

        if (trace.success) {
          logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=1 ttl=64 time=1.42 ms` });
          logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=2 ttl=64 time=1.18 ms` });
          logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=3 ttl=64 time=1.05 ms` });
          logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=4 ttl=64 time=1.12 ms` });
          logs.push({ type: 'output', text: `\n--- ${targetIp} ping statistics ---` });
          logs.push({ type: 'output', text: `4 packets transmitted, 4 received, 0% packet loss` });
        } else {
          logs.push({ type: 'output', text: `From ${node.cliState.vpcsIp} icmp_seq=1: ${trace.error || 'Destination Host Unreachable'}` });
          logs.push({ type: 'output', text: `From ${node.cliState.vpcsIp} icmp_seq=2: ${trace.error || 'Destination Host Unreachable'}` });
          logs.push({ type: 'output', text: `From ${node.cliState.vpcsIp} icmp_seq=3: ${trace.error || 'Destination Host Unreachable'}` });
          logs.push({ type: 'output', text: `From ${node.cliState.vpcsIp} icmp_seq=4: ${trace.error || 'Destination Host Unreachable'}` });
          logs.push({ type: 'output', text: `\n--- ${targetIp} ping statistics ---` });
          logs.push({ type: 'output', text: `4 packets transmitted, 0 received, 100% packet loss` });
        }
      }
      break;

    default:
      logs.push({ type: 'output', text: `Error: Command not found: "${baseCmd}". Type "help" for instructions.` });
  }

  return { updatedNode: node, outputLogs: logs, triggerPing: responsePing };
}

function showPcIp(node: NetworkNode, logs: any[]) {
  if (node.cliState.vpcsIp) {
    logs.push({
      type: 'output',
      text: `NAME         : ${node.name}
IP ADDRESS   : ${node.cliState.vpcsIp}/${node.cliState.vpcsMask}
SUBNET MASK  : ${intToIp(cidrToMaskInt(node.cliState.vpcsMask || 24))}
GATEWAY      : ${node.cliState.vpcsGw || '0.0.0.0'}
MAC ADDRESS  : 52:54:00:12:ef:${node.name.replace(/[^0-9]/g, '').padStart(2, '0') || '01'}
INTERFACE    : eth0`
    });
  } else {
    logs.push({
      type: 'output',
      text: `NAME         : ${node.name}
IP ADDRESS   : Unconfigured
GATEWAY      : 0.0.0.0
MAC ADDRESS  : 52:54:00:12:ef:${node.name.replace(/[^0-9]/g, '').padStart(2, '0') || '01'}
INTERFACE    : eth0`
    });
  }
}

/**
 * Handle Linux Server commands
 */
function handleServerCommand(
  node: NetworkNode,
  nodes: NetworkNode[],
  links: NetworkLink[],
  baseCmd: string,
  args: string[],
  logs: { type: 'input' | 'output' | 'system'; text: string }[]
): CommandResponse {
  let responsePing: any = undefined;

  switch (baseCmd) {
    case 'help':
      logs.push({
        type: 'output',
        text: `Available commands (Simulated Linux environment):
  ifconfig                            Display active interfaces and configuration
  ifconfig eth0 <ip> netmask <mask>  Configure static IP on eth0 and bring it UP
  route add default gw <gw_ip>        Configure default gateway
  route -n                            Display IP routing table
  ping -c 4 <ip_address>              Ping a destination IP
  cat /etc/resolv.conf                Display nameserver configurations
  uname -a                            Display kernel version
  whoami                              Display current username
  clear                               Clear terminal screen`
      });
      break;

    case 'whoami':
      logs.push({ type: 'output', text: 'root' });
      break;

    case 'uname':
      if (args[1] === '-a') {
        logs.push({ type: 'output', text: 'Linux Server1 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 (2026-05-10) x86_64 GNU/Linux' });
      } else {
        logs.push({ type: 'output', text: 'Linux' });
      }
      break;

    case 'cat':
      if (args[1] === '/etc/resolv.conf') {
        logs.push({ type: 'output', text: `# Generated by NetworkManager\nnameserver 8.8.8.8\nnameserver 1.1.1.1` });
      } else {
        logs.push({ type: 'output', text: `cat: ${args[1] || 'no file specified'}: No such file or directory` });
      }
      break;

    case 'ifconfig':
      if (args[1] === 'eth0' && args[2]) {
        // e.g., ifconfig eth0 192.168.1.10 netmask 255.255.255.0 up
        const ip = args[2];
        const netmaskIdx = args.indexOf('netmask');
        let subnet = '255.255.255.0';
        if (netmaskIdx !== -1 && args[netmaskIdx + 1]) {
          subnet = args[netmaskIdx + 1];
        }

        node.interfaces['eth0'] = {
          name: 'eth0',
          ip,
          subnet,
          configStatus: 'no-shutdown'
        };
        logs.push({ type: 'output', text: `eth0: configured static IP ${ip} netmask ${subnet}` });
      } else {
        // Display interface list
        const inf = node.interfaces['eth0'] || { ip: '', subnet: '', configStatus: 'shutdown' };
        if (inf.ip) {
          logs.push({
            type: 'output',
            text: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${inf.ip}  netmask ${inf.subnet}  broadcast ${intToIp((ipToInt(inf.ip) & ipToInt(inf.subnet)) | ~ipToInt(inf.subnet))}
        ether 02:42:ac:11:00:03  txqueuelen 1000  (Ethernet)
        RX packets 24  bytes 1944 (1.9 KB)
        TX packets 12  bytes 972 (972.0 B)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)`
          });
        } else {
          logs.push({
            type: 'output',
            text: `eth0: flags=4098<BROADCAST,MULTICAST>  mtu 1500
        ether 02:42:ac:11:00:03  txqueuelen 1000  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        TX packets 0  bytes 0 (0.0 B)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loop  txqueuelen 1000  (Local Loopback)`
          });
        }
      }
      break;

    case 'route':
      if (args[1] === 'add' && args[2] === 'default' && args[3] === 'gw' && args[4]) {
        node.cliState.vpcsGw = args[4];
        logs.push({ type: 'output', text: `Route successfully added. Default gateway: ${args[4]}` });
      } else if (args[1] === '-n') {
        const inf = node.interfaces['eth0'] || { ip: '', subnet: '' };
        logs.push({
          type: 'output',
          text: `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         ${node.cliState.vpcsGw || '0.0.0.0'}     0.0.0.0         UG    0      0        0 eth0
${inf.ip ? intToIp(ipToInt(inf.ip) & ipToInt(inf.subnet)) : '0.0.0.0'}     0.0.0.0         ${inf.subnet || '0.0.0.0'}   U     0      0        0 eth0`
        });
      } else {
        logs.push({ type: 'output', text: 'Usage:\n  route -n\n  route add default gw <gateway_ip>' });
      }
      break;

    case 'ping':
      const pingTargetIdx = args.indexOf('-c') !== -1 ? args.indexOf('-c') + 2 : 1;
      const targetIp = args[pingTargetIdx];
      const eth0 = node.interfaces['eth0'];

      if (!targetIp) {
        logs.push({ type: 'output', text: 'Usage: ping -c 4 <ip_address>' });
        break;
      }
      if (!eth0 || !eth0.ip) {
        logs.push({ type: 'output', text: 'ping: eth0 has no IP address configured.' });
        break;
      }

      logs.push({ type: 'output', text: `PING ${targetIp} (${targetIp}) 56(84) bytes of data.` });
      
      const trace = traceRoute(nodes, links, node.id, targetIp);
      responsePing = {
        destIp: targetIp,
        success: trace.success,
        linkIds: trace.linkIds,
        nodeNames: trace.nodeNames,
        error: trace.error
      };

      if (trace.success) {
        logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=1 ttl=64 time=1.04 ms` });
        logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=2 ttl=64 time=0.98 ms` });
        logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=3 ttl=64 time=1.02 ms` });
        logs.push({ type: 'output', text: `64 bytes from ${targetIp}: icmp_seq=4 ttl=64 time=1.05 ms` });
        logs.push({ type: 'output', text: `\n--- ${targetIp} ping statistics ---` });
        logs.push({ type: 'output', text: `4 packets transmitted, 4 received, 0% packet loss, time 3004ms` });
      } else {
        logs.push({ type: 'output', text: `From ${eth0.ip} icmp_seq=1: ${trace.error || 'Destination Host Unreachable'}` });
        logs.push({ type: 'output', text: `From ${eth0.ip} icmp_seq=2: ${trace.error || 'Destination Host Unreachable'}` });
        logs.push({ type: 'output', text: `\n--- ${targetIp} ping statistics ---` });
        logs.push({ type: 'output', text: `4 packets transmitted, 0 received, 100% packet loss, time 4010ms` });
      }
      break;

    default:
      logs.push({ type: 'output', text: `bash: ${baseCmd}: command not found. Type "help" for a list of commands.` });
  }

  return { updatedNode: node, outputLogs: logs, triggerPing: responsePing };
}

/**
 * Handle Cisco IOS Router / Switch commands
 */
function handleCiscoCommand(
  node: NetworkNode,
  nodes: NetworkNode[],
  links: NetworkLink[],
  baseCmd: string,
  args: string[],
  logs: { type: 'input' | 'output' | 'system'; text: string }[]
): CommandResponse {
  let responsePing: any = undefined;
  const mode = node.cliState.currentMode;

  // Handle global Cisco exit
  if (baseCmd === 'exit') {
    if (mode === 'config-if') {
      node.cliState.currentMode = 'config';
      node.cliState.activeInterface = undefined;
      logs.push({ type: 'output', text: 'Leaving interface configuration mode.' });
    } else if (mode === 'config') {
      node.cliState.currentMode = 'priv';
      logs.push({ type: 'output', text: 'Leaving configuration mode.' });
    } else if (mode === 'priv') {
      node.cliState.currentMode = 'user';
      logs.push({ type: 'output', text: 'Console session closed.' });
    } else {
      logs.push({ type: 'output', text: 'Console closed. Press enter or click console to reconnect.' });
    }
    return { updatedNode: node, outputLogs: logs };
  }

  // Cisco CLI execution based on mode
  if (mode === 'user') {
    switch (baseCmd) {
      case 'enable':
      case 'en':
        node.cliState.currentMode = 'priv';
        logs.push({ type: 'output', text: '' });
        break;
      case 'help':
      case '?':
        logs.push({ type: 'output', text: 'Available commands: enable, exit, help' });
        break;
      default:
        logs.push({ type: 'output', text: '% Unrecognized command in User EXEC mode.' });
    }
  } else if (mode === 'priv') {
    switch (baseCmd) {
      case 'disable':
        node.cliState.currentMode = 'user';
        break;
      case 'configure':
        if (args[1] === 'terminal' || args[1] === 't') {
          node.cliState.currentMode = 'config';
          logs.push({ type: 'output', text: 'Enter configuration commands, one per line. End with CNTL/Z or "exit".' });
        } else {
          logs.push({ type: 'output', text: '% Usage: configure terminal' });
        }
        break;
      case 'sh':
      case 'show':
        handleCiscoShow(node, args, logs);
        break;
      case 'ping':
        if (args[1]) {
          const targetIp = args[1];
          logs.push({ type: 'output', text: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:` });
          
          const trace = traceRoute(nodes, links, node.id, targetIp);
          responsePing = {
            destIp: targetIp,
            success: trace.success,
            linkIds: trace.linkIds,
            nodeNames: trace.nodeNames,
            error: trace.error
          };

          if (trace.success) {
            logs.push({ type: 'output', text: '!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/3/8 ms' });
          } else {
            logs.push({ type: 'output', text: '.....\nSuccess rate is 0 percent (0/5)' });
          }
        } else {
          logs.push({ type: 'output', text: '% Usage: ping <ip_address>' });
        }
        break;
      case 'write':
      case 'wr':
        // Save current configurations
        let configOutput = `! Startup Configuration for ${node.name}\nversion 15.4\n!\nhostname ${node.name}\n!\n`;
        Object.entries(node.interfaces).forEach(([name, inf]) => {
          configOutput += `interface ${name}\n`;
          if (inf.ip) {
            configOutput += `  ip address ${inf.ip} ${inf.subnet}\n`;
          }
          if (inf.configStatus === 'shutdown') {
            configOutput += `  shutdown\n`;
          } else {
            configOutput += `  no shutdown\n`;
          }
          configOutput += `!\n`;
        });
        node.cliState.routingTable.forEach(route => {
          configOutput += `ip route ${route.destination} ${route.mask} ${route.nextHop || route.interfaceName}\n`;
        });
        node.cliState.savedConfig = configOutput;
        logs.push({ type: 'output', text: 'Building configuration...\n[OK]' });
        break;
      case 'help':
      case '?':
        logs.push({
          type: 'output',
          text: `Privileged EXEC commands:
  configure terminal              Enter global configuration mode
  show ip interface brief         Display summary of interfaces
  show ip route                   Display local IP routing table
  show running-config             Display active configurations
  ping <ip_address>               Send ICMP echos
  write                           Save active configuration
  disable                         Return to User EXEC mode
  exit                            Exit CLI session`
        });
        break;
      default:
        logs.push({ type: 'output', text: '% Unrecognized command in Privileged EXEC mode. Type "?" for help.' });
    }
  } else if (mode === 'config') {
    switch (baseCmd) {
      case 'hostname':
        if (args[1]) {
          node.name = args[1]; // Update visual label
          // Add/update hostname in config string
          if (!node.cliState.savedConfig.includes('hostname')) {
            node.cliState.savedConfig += `\nhostname ${args[1]}`;
          } else {
            node.cliState.savedConfig = node.cliState.savedConfig.replace(/hostname\s+\S+/, `hostname ${args[1]}`);
          }
          logs.push({ type: 'output', text: '' });
        } else {
          logs.push({ type: 'output', text: '% Usage: hostname <new_name>' });
        }
        break;

      case 'interface':
      case 'int':
        if (args[1]) {
          const matchedInt = Object.keys(node.interfaces).find(name => 
            name.toLowerCase() === args[1].toLowerCase() || 
            (name.toLowerCase().substring(0, 1) + name.toLowerCase().substring(1)) === args[1].toLowerCase()
          );

          if (matchedInt) {
            node.cliState.currentMode = 'config-if';
            node.cliState.activeInterface = matchedInt;
            logs.push({ type: 'output', text: '' });
          } else {
            logs.push({ type: 'output', text: `% Invalid interface. Available ports: ${Object.keys(node.interfaces).join(', ')}` });
          }
        } else {
          logs.push({ type: 'output', text: '% Usage: interface <port_name>' });
        }
        break;

      case 'ip':
        if (args[1] === 'route') {
          // e.g. ip route 10.0.0.0 255.255.255.0 192.168.1.2
          const dest = args[2];
          const mask = args[3];
          const nextHop = args[4];
          
          if (dest && mask && nextHop) {
            // Check if nextHop or outgoing interface is valid
            const newRoute: RouteEntry = {
              destination: dest,
              mask,
              nextHop,
              interfaceName: node.cliState.routingTable[0]?.interfaceName || Object.keys(node.interfaces)[0]
            };
            node.cliState.routingTable.push(newRoute);
            logs.push({ type: 'output', text: '' });
          } else {
            logs.push({ type: 'output', text: '% Usage: ip route <dest_network> <subnet_mask> <next_hop_ip>' });
          }
        } else {
          logs.push({ type: 'output', text: '% Unrecognized ip configuration command. Use: ip route' });
        }
        break;

      case 'no':
        if (args[1] === 'ip' && args[2] === 'route') {
          const dest = args[3];
          const mask = args[4];
          const nextHop = args[5];
          if (dest && mask) {
            node.cliState.routingTable = node.cliState.routingTable.filter(route => 
              !(route.destination === dest && route.mask === mask && (!nextHop || route.nextHop === nextHop))
            );
            logs.push({ type: 'output', text: `Removed ip route to ${dest}` });
          } else {
            logs.push({ type: 'output', text: '% Usage: no ip route <dest_network> <subnet_mask>' });
          }
        }
        break;

      default:
        logs.push({ type: 'output', text: '% Unrecognized configuration command. Options: hostname, interface, ip route, exit' });
    }
  } else if (mode === 'config-if') {
    const activePort = node.cliState.activeInterface!;
    const inf = node.interfaces[activePort];

    switch (baseCmd) {
      case 'ip':
        if (args[1] === 'address' || args[1] === 'add') {
          const ip = args[2];
          const mask = args[3];
          if (ip && mask) {
            inf.ip = ip;
            inf.subnet = mask;
            logs.push({ type: 'output', text: '' });
          } else {
            logs.push({ type: 'output', text: '% Usage: ip address <ip> <subnet_mask> (e.g. ip address 192.168.1.1 255.255.255.0)' });
          }
        }
        break;

      case 'shutdown':
      case 'shut':
        inf.configStatus = 'shutdown';
        logs.push({ type: 'output', text: `*Mar 1 00:03:12.435: %LINK-5-CHANGED: Interface ${activePort}, changed state to administratively down` });
        break;

      case 'no':
        if (args[1] === 'shutdown' || args[1] === 'shut') {
          inf.configStatus = 'no-shutdown';
          logs.push({ type: 'output', text: `*Mar 1 00:03:14.212: %LINK-3-UPDOWN: Interface ${activePort}, changed state to up` });
          logs.push({ type: 'output', text: `*Mar 1 00:03:15.212: %LINEPROTO-5-UPDOWN: Line protocol on Interface ${activePort}, changed state to up` });
        } else if (args[1] === 'ip' && args[2] === 'address') {
          inf.ip = '';
          inf.subnet = '';
          logs.push({ type: 'output', text: `Removed IP configuration on ${activePort}` });
        }
        break;

      default:
        logs.push({ type: 'output', text: '% Unrecognized interface subcommand. Options: ip address, shutdown, no shutdown, exit' });
    }
  }

  return { updatedNode: node, outputLogs: logs, triggerPing: responsePing };
}

/**
 * Handle Cisco Show Commands
 */
function handleCiscoShow(node: NetworkNode, args: string[], logs: any[]) {
  const showArg = args.slice(1).join(' ').toLowerCase();

  if (showArg.includes('ip int') || showArg.includes('ip interface brief') || showArg === 'ip brief') {
    // Show IP Interface Brief
    let out = 'Interface              IP-Address      OK? Method Status                Protocol\n';
    Object.entries(node.interfaces).forEach(([name, inf]) => {
      const paddedName = name.padEnd(22, ' ');
      const paddedIp = (inf.ip || 'unassigned').padEnd(16, ' ');
      const status = inf.configStatus === 'shutdown' ? 'administratively down' : 'up';
      const protocol = inf.configStatus === 'shutdown' ? 'down' : 'up';
      out += `${paddedName}${paddedIp}YES manual ${status.padEnd(22, ' ')}${protocol}\n`;
    });
    logs.push({ type: 'output', text: out });
  } else if (showArg.includes('ip route') || showArg === 'ip ro') {
    // Show IP Route
    let out = 'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP\n';
    out += '       Gateway of last resort is not set\n\n';
    
    // Add connected routes
    Object.entries(node.interfaces).forEach(([name, inf]) => {
      if (inf.ip && inf.configStatus === 'no-shutdown') {
        const netInt = ipToInt(inf.ip) & ipToInt(inf.subnet);
        out += `C     ${intToIp(netInt)}/24 is directly connected, ${name}\n`;
        out += `L     ${inf.ip}/32 is directly connected, ${name}\n`;
      }
    });

    // Add static routes
    node.cliState.routingTable.forEach(route => {
      out += `S     ${route.destination}/24 [1/0] via ${route.nextHop}, ${route.interfaceName}\n`;
    });

    logs.push({ type: 'output', text: out });
  } else if (showArg.includes('run') || showArg.includes('running-config')) {
    // Show Running-Config
    let out = `Building configuration...\n\nCurrent configuration : 1245 bytes\n!\nversion 15.4\nservice timestamps debug datetime msec\nservice timestamps log datetime msec\nno service password-encryption\n!\nhostname ${node.name}\n!\nboot-start-marker\nboot-end-marker\n!\nno aaa new-model\n!\n`;
    
    Object.entries(node.interfaces).forEach(([name, inf]) => {
      out += `interface ${name}\n`;
      if (inf.ip) {
        out += ` ip address ${inf.ip} ${inf.subnet}\n`;
      } else {
        out += ` no ip address\n`;
      }
      out += ` duplex auto\n speed auto\n`;
      if (inf.configStatus === 'shutdown') {
        out += ` shutdown\n`;
      }
      out += `!\n`;
    });
    
    node.cliState.routingTable.forEach(route => {
      out += `ip route ${route.destination} ${route.mask} ${route.nextHop}\n`;
    });
    
    out += `!\nline con 0\n stopbits 1\nline aux 0\nline vty 0 4\n login\n!\nend`;
    logs.push({ type: 'output', text: out });
  } else {
    logs.push({ type: 'output', text: '% Invalid show command parameters. Options: ip interface brief, ip route, running-config' });
  }
}
