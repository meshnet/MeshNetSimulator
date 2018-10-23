function Node(mac, meta = null, active = true) {
  /* Required fields */

  // Basic data
  this.mac = mac;

  if (!active)
    return // Dont init active components if not active

  this.meta = meta;
  console.log(this.mac);
  this.incoming = [];
  this.outgoing = [];

  /* Additional fields */
  this.tick = -1;

  // Record next hop neighbors
  this.neighbors = {};

  // Keep a local version of the network
  this.nodes = [];
  this.links = [];
  this.changedLinks = [];

  // Send a PEERS message on join network
  this.outgoing.push(new Packet(13, 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(0, null)));
}

Node.prototype.step = function() {
  this.tick += 1;
  dijkstra = createDijkstra(this.nodes, this.links);

  this.handlePackets();
  this.broadcastChangedLinks();
  this.handleTimeout();
}

// TODO: Need to find a better place for this function
Node.prototype.getNodeByMac = function(nodes, mac) {
  for (var i = 0, iLen = this.nodes.length; i < iLen; i++) {
    if (this.nodes[i].o.mac == mac) {
      return this.nodes[i];
    }
  }
  return false;
}

Node.prototype.getLinkByMacs = function(links, source, target) {
  for (var i = 0, iLen = links.length; i < iLen; i++) {
    if (links[i].source.o.mac == source && links[i].target.o.mac == target)
      return links[i];
    if (links[i].source.o.mac == target && links[i].target.o.mac == source)
      return links[i];
    }
  return false;
}

Node.prototype.sendPacket = function(destinationAddress, packetType, data = []) {
  var currentHop = this.getNodeByMac(this.nodes, this.mac);
  var finalHop = this.getNodeByMac(this.nodes, destinationAddress);
  var nextHop = dijkstra.getShortestPath(finalHop, currentHop)[0];

  this.outgoing.push(new Packet(16 + data.length, packetType, this.mac, nextHop, this.mac, destinationAddress, data));
}

Node.prototype.ping = function(destinationAddress) {
  this.sendPacket(destinationAddress, 1);
}

Node.prototype.pong = function(destinationAddress) {
  this.sendPacket(destinationAddress, 2);
}

Node.prototype.handlePackets = function() {
  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Update network

    this.updateNetwork(this.links, this.nodes, this.changedLinks, this.mac, packet.transmitterAddress, 100, tick = this.tick);
    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('packet arrived at the destination');
      if (packet.packetType == 1) { // Ping packet
        console.log("Ping packet!");
        /*packet.destinationAddress = packet.sourceAddress;
        packet.sourceAddress = this.mac;
        packet.packetType = 2;
        this.outgoing.push(packet);*/
        this.pong(packet.sourceAddress);
      }
      continue;
    }

    // Catch broadcast packets and record neighbor
    if (packet.receiverAddress === BROADCAST_MAC) {
      if (packet.packetType == 4) { // Packet is PEERS packet
        for (var ii = 0; ii < packet.data.dataLength; ii++) {
          var newLink = packet.data.data[ii];
          this.updateNetwork(this.links, this.nodes, this.changedLinks, newLink.source, newLink.target, newLink.value, tick = this.tick);
        }
      }
      continue;
    }

    // The packet needs to be routed
    var currentHop = this.getNodeByMac(this.nodes, this.mac);
    var finalHop = this.getNodeByMac(this.nodes, packet.destinationAddress);
    var nextHop = dijkstra.getShortestPath(finalHop, currentHop)[0];

    console.log("Next hop: " + nextHop);

    packet.transmitterAddress = this.mac;
    packet.receiverAddress = nextHop;
    this.outgoing.push(packet);
  }
}

Node.prototype.broadcastChangedLinks = function() {
  if (this.changedLinks.length > 0) {
    var packet = new Packet(12 + (1 + this.changedLinks.length * 5), 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(this.changedLinks.length, []));
    for (var i = 0; i < this.changedLinks.length; i++) {
      var changedLink = this.changedLinks[i];
      console.log(this.changedLinks, changedLink);
      packet.data.data.push({"source": changedLink.source.o.mac, "target": changedLink.target.o.mac, "value": changedLink.o.quality});
    }
    this.outgoing.push(packet);
    this.changedLinks = [];
  }
}

Node.prototype.handleTimeout = function() {
  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    if (node.o.mac == this.mac)
      continue;
    if ((node.lastSeen + 30) < this.tick && node.timeoutState != 1) {
      node.timeoutState = 1;
      this.ping(node.o.mac);
    } // TODO: Remove node from memory if it doesn't respond in time
    this.nodes[i] = node;
  }
}

Node.prototype.updateNetwork = function(links, nodes, changedLinks, sourceNodeMac, targetNodeMac, value) {
  var sourceNode;
  (sourceNode = this.getNodeByMac(nodes, sourceNodeMac))
    ? true
    : sourceNode = nodes[nodes.push({
        "o": new Node(sourceNodeMac, null, false),
        "index": nodes.length
      }) - 1];
  if (typeof tick !== 'undefined')
    nodes[sourceNode.index].lastSeen = tick;
  var targetNode;
  (targetNode = this.getNodeByMac(nodes, targetNodeMac))
    ? true
    : targetNode = nodes[nodes.push({
        "o": new Node(targetNodeMac, null, false),
        "index": nodes.length
      }) - 1];
  if (typeof tick !== 'undefined')
    nodes[targetNode.index].lastSeen = tick;

  if (!(link = this.getLinkByMacs(links, sourceNodeMac, targetNodeMac))) {
    link = {
      "index": links.length,
      "o": new Link(),
      "source": {
        "index": sourceNode.index,
        "o": sourceNode.o
      },
      "target": {
        "index": targetNode.index,
        "o": targetNode.o
      }
    }
    links.push(link);
    this.changedLinks.push(link);
    return;
  }
  // Link now contains the link
  // Just need to modify the link and put it back
  if (link.o.quality == value)
    return;
  link.o.quality = value;
  links[link.index] = link;
  this.changedLinks.push(link);
}

// Name displayed under the node
Node.prototype.getNodeName = function() {
  // Find hostname in meta data, display MAC address as fallback
  return findValue(this.meta, 'hostname', this.mac);
}

// Label on top of the node body
Node.prototype.getNodeLabel = function() {
  // Count unicast packets
  var count = 0;
  for (var i in this.outgoing) {
    count += 1;
  }
  return count
    ? count.toString()
    : '';
}

// Color of the ring around the node body
Node.prototype.getRingColor = function() {
  return isEmpty(this.neighbors)
    ? ''
    : '#008000';
}

// Color of the round node body
Node.prototype.getBodyColor = function() {
  return '#fff';
}

// Number of small red circles around the node
// body indicating the number of connected clients
Node.prototype.getClientCount = function() {
  return findValue(this.meta, 'clients', '').toString();
}

Node.prototype.reset = function() {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};

  this.nodes = [];
  this.links = [];
  this.changedLinks = [];

  // Send a PEERS message on join network
  this.outgoing.push(new Packet(13, 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(0, null)));
}

// For the transition to new implementations
Node.prototype.copyFromOldImplementation = function(oldNode) {
  copyExistingFields(oldNode, this);
};
