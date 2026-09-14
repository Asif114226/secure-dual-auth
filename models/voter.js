const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  nid: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  division: { type: String, required: true },
  district: { type: String, required: true },
  constituency: { type: String, required: true },
  ward: { type: String, required: true },
  nidFrontPhoto: { type: String, required: true },
  nidBackPhoto: { type: String, required: true },
  userPhoto: { type: String, required: true },
  primaryPasswordHash: { type: String, required: true },
  duressPasswordHash: { type: String, required: true },
  hasVoted: { type: Boolean, default: false },
  registrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voter', voterSchema);