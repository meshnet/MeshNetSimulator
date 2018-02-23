/*
* Example Node implementation.
* Every node routes a packet to a random neighbor until it reaches the final destination.
*/

// TODO: Need to find a better place
// getIntNodes()[0].o.mac
function getNodeByMac(intNodes, mac) {
  for (var i=0, iLen=intNodes.length; i<iLen; i++) {
    if (intNodes[i].o.mac == mac) return intNodes[i];
  }
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
  var nodes = [];
  var links = [];
  
  // Send a PEERS message on join network
  this.outgoing.push(
    new Packet("TODO: length", 4, this.mac, BROADCAST_MAC, this.mac, BROADCAST_MAC, new Peers("TODO: length", {}))
  );
}

function updateNetwork(sourceNode, targetNode, value) {
}

/*
* The simple routing algorithm here learns of its neigbhors
* once and sends incoming packets to a random neighbor.
*/
Node.prototype.step = function () {
  var intNodes = getIntNodes();
  var intLinks = getIntLinks();
  
  var dijkstra = createDijkstra(intNodes, intLinks);
  
  for (var i = 0; i < this.incoming.length; i += 1) {
    var packet = this.incoming[i];

    // Packet arrived at the destination
    if (packet.destinationAddress === this.mac) {
      console.log('packet arrived at the destination');
      continue;
    }

    // Catch broadcast packets and record neighbor
    if (packet.receiverAddress === BROADCAST_MAC) {
      this.neighbors[packet.transmitterAddress] = true;
      // {"index":0, "o":new Link(), "source":{"index":0, "o":new Node("mac", null, false)},"target":{"index":1, "o":new Node("mac", null, false)}}
      // {"o":new Node("mac", null, false)}
      continue;
    }

    // The packet needs to be routed
    var currentHop = getNodeByMac(intNodes, this.mac); // TODO: Replace with custom map
    var finalHop = getNodeByMac(intNodes, packet.destinationAddress);// TODO: Replace with custom map
    var nextHop = dijkstra.getShortestPath(finalHop, currentHop)[0];
    
    console.log("Next hop: " + nextHop);

    packet.transmitterAddress = this.mac;
    packet.receiverAddress = nextHop;
    this.outgoing.push(packet);
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
}

// For the transition to new implementations
Node.prototype.copyFromOldImplementation = function (oldNode) {
  copyExistingFields(oldNode, this);
};
