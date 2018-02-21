function Service(serviceType, dataLength, data) {
/* Required fields */

  // Basic info
  this.serviceType = serviceType;
  this.dataLength = dataLength;

  // Data
  this.data = data;
}

// For changing the implementation during simulation
Packet.prototype.copyFromOldImplementation = function (oldPacket) {
  copyExistingFields(oldPacket, this);
};
