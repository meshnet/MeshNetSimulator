// TODO: Need to find a better place for this function
function getNodeByMac(nodes, mac) {
  for (var i=0, iLen=nodes.length; i<iLen; i++) {
    if (nodes[i].o.mac == mac) return nodes[i];
  }
  return false;
}

function getLinkByMacs(links, source, target) {
  for (var i=0, iLen=links.length; i<iLen; i++) {
    if (links[i].source.o.mac == source && links[i].target.o.mac == target) return links[i];
    if (links[i].source.o.mac == target && links[i].target.o.mac == source) return links[i];
  }
  return false;
}

function Node(mac, meta = null, active = true) {
/* Required fields */

  // Basic data
  this.mac = mac;

  if(!active) return // Dont init active components if not active
  
  this.meta = meta;
  console.log(this.mac);
  this.incoming = [];
  this.outgoing = [];

/* Additional fields */

  // Record next hop neighbors
  this.neighbors = {};
  
  // Keep a local version of the network
  this.nodes = [];
  this.links = [];
  this.changedLinks = [];
  
  // Send a PEERS message on join network
  this.outgoing.push(
    new Packet(13, 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(0, []))
  );
}

function updateNetwork(links, nodes, changedLinks, sourceNodeMac, targetNodeMac, value) {
  getNodeByMac(nodes, sourceNodeMac) ? true : nodes.push({"o": new Node(sourceNodeMac, null, false), "index": nodes.length});
  getNodeByMac(nodes, targetNodeMac) ? true : nodes.push({"o": new Node(targetNodeMac, null, false), "index": nodes.length});
  
  if(!(link = getLinkByMacs(links, sourceNodeMac, targetNodeMac))) {
    var sourceNode = getNodeByMac(nodes, sourceNodeMac);
    var targetNode = getNodeByMac(nodes, targetNodeMac);
    link = {"index":links.length, "o":new Link(), "source":{"index":sourceNode.index, "o":sourceNode.o},"target":{"index":targetNode.index, "o":targetNode.o}}
    links.push(link);
    changedLinks.push(link);
    return;
  }
  // Link now contains the link
  // Just need to modify the link and put it back
  if (link.o.quality == value) return;
  link.o.quality = value;
  links[link.index] = link;
  changedLinks.push(link);
}

Node.prototype.step = function () {
  var dijkstra = createDijkstra(this.nodes, this.links);
  
  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Update network
    updateNetwork(this.links, this.nodes, this.changedLinks, this.mac, packet.transmitterAddress, 100);
    
    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('packet arrived at the destination');
      if(packet.packetType == 1) { // Ping packet
        packet.destinationAddress = packet.sourceAddress;
        packet.sourceAddress = this.mac;
        packet.packetType = 2;
        this.incoming.push(packet);
      }
      continue;
    }

    // Catch broadcast packets and record neighbor
    if (packet.receiverAddress === BROADCAST_MAC) {
      if(packet.packetType == 4) { // Packet is PEERS packet
        for(var ii = 0; ii < packet.data.dataLength; ii++) {
          var newLink = packet.data.data[ii]
          updateNetwork(this.links, this.nodes, this.changedLinks, newLink.source, newLink.target, newLink.value);
        }
      }
      continue;
    }
    
    // The packet needs to be routed
    var currentHop = getNodeByMac(this.nodes, this.mac);
    var finalHop = getNodeByMac(this.nodes, packet.destinationAddress);
    var nextHop = dijkstra.getShortestPath(finalHop, currentHop)[0];
    
    console.log("Next hop: " + nextHop);

    packet.transmitterAddress = this.mac;
    packet.receiverAddress = nextHop;
    this.outgoing.push(packet);
  }
  
  if(this.changedLinks.length > 0) {
    var packet = new Packet(12 + (1 + this.changedLinks.length * 5), 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(this.changedLinks.length, []));
    for(var i = 0; i < this.changedLinks.length; i++) {
      var changedLink = this.changedLinks[i];
      packet.data.data.push({"source":changedLink.source.o.mac, "target":changedLink.target.o.mac, "value":changedLink.o.quality});
    }
    this.outgoing.push(packet);
    this.changedLinks = [];
  }
}

// Name displayed under the node
Node.prototype.getNodeName = function () {
  // Find hostname in meta data, display MAC address as fallback
  return findValue(this.meta, 'hostname', this.mac);
}

// Label on top of the node body
Node.prototype.getNodeLabel = function () {
  // Count unicast packets
  var count = 0;
  for (var i in this.outgoing) {
    count += 1;
  }
  return count ? count.toString() : '';
}

// Color of the ring around the node body
Node.prototype.getRingColor = function () {
  return isEmpty(this.neighbors) ? '' : '#008000';
}

// Color of the round node body
Node.prototype.getBodyColor = function () {
  return '#fff';
}

// Number of small red circles around the node
// body indicating the number of connected clients
Node.prototype.getClientCount = function () {
  return findValue(this.meta, 'clients', '').toString();
}

Node.prototype.reset = function () {
  this.incoming = [];
  this.outgoing = [];
  this.neighbors = {};

  this.nodes = [];
  this.links = [];
  this.changedLinks = [];

  // Send a PEERS message on join network
  this.outgoing.push(
    new Packet(13, 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers(0, []))
  );
}

// For the transition to new implementations
Node.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
