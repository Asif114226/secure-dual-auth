const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  nidHash: { type: String, required: true },
  candidateId: { type: String, required: true },
  constituency: { type: String, required: true },
  ward: { type: String, required: true },
  status: { type: String, enum: ['VALID', 'DUESS_CANCELLED'], default: 'VALID' },
  isDuress: { type: Boolean, default: false },
  txnId: { type: String, required: true, unique: true },
  votedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vote', voteSchema);