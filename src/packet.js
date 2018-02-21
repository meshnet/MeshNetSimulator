
var BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

function Packet(packetLength, packetType, transmitterAddress, receiverAddress, sourceAddress, destinationAddress, data) {
/* Required fields */

  // Basic info
  this.packetLength = packetLength;
  this.packetType = packetType;
  
  // One hop transmitter and receiver address
  this.transmitterAddress = transmitterAddress;
  this.receiverAddress = receiverAddress;
  
  // Multi-hop source and destination address
  this.sourceAddress = sourceAddress;
  this.destinationAddress = destinationAddress;
  
  // Data
  this.data = data;
}

// For changing the implementation during simulation
Packet.prototype.copyFromOldImplementation = function (oldPacket) {
  copyExistingFields(oldPacket, this);
};
