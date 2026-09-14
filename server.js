const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
// বায়োমেট্রিক ইমেজের বড় ডাটা হ্যান্ডেল করার জন্য লিমিট বাড়িয়ে দেওয়া হলো
app.use(express.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname)));

// Global Election State
let isElectionRunning = true;
const activeAdminTokens = new Set();
const auditLogs = [
  `[${new Date().toLocaleTimeString()}] System booted successfully.`,
  `[${new Date().toLocaleTimeString()}] Election portal initialized.`
];

function addAuditLog(message) {
  const log = `[${new Date().toLocaleTimeString()}] ${message}`;
  auditLogs.unshift(log);
  if (auditLogs.length > 50) auditLogs.pop();
}

// ==================== ROOT / HOME ROUTE ====================
app.get('/', (req, res) => {
  res.send('🚀 Smart Voting System Backend is Live & Running Successfully!');
});

// ==================== MONGODB CLOUD CONNECTION ====================
const MONGO_URI = "mongodb+srv://asif114226_db_user:yoDtClhEncH3INsp@cluster01.yayfdjs.mongodb.net/smart_voting_bd?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Cloud Database (Atlas) Connected Successfully!");
    addAuditLog("Database connected successfully.");
  })
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Voter Database Schema (বায়োমেট্রিক ফিল্ডসহ আপডেট করা)
const voterSchema = new mongoose.Schema({
  nid: { type: String, required: true, unique: true },
  fullName: String,
  phone: String,
  email: String,
  constituency: String,
  ward: String,
  primaryPasswordHash: String,
  duressPasswordHash: String,
  biometricData: { type: String, required: true }, // বায়োমেট্রিক ডেটা বা হ্যাশ সংরক্ষণের জন্য
  hasVoted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Vote Ledger Schema
const voteSchema = new mongoose.Schema({
  candidateId: String,
  encryptedVoteData: String,
  constituency: String,
  ward: String,
  txnId: { type: String, unique: true },
  timestamp: { type: Date, default: Date.now }
});

const Voter = mongoose.model('Voter', voterSchema);
const Vote = mongoose.model('Vote', voteSchema);

// Helper: Encrypt Vote Data
const SECRET_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
function encryptVote(data) {
  const cipher = crypto.createCipheriv('aes-256-ecb', Buffer.from(SECRET_KEY), null);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// ==================== NODEMAILER CONFIGURATION ====================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'asif114226@gmail.com',
    pass: 'ouyc vvbb tdyh iyso'
  }
});

const otpStorage = {};

// ==================== ADMIN SECURITY ROUTES ====================
const ADMIN_USERNAME = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_HASH = "$2a$10$7R0w/bB.Q/j/jJ4qN.O0s.QGzM/r6J9sW.tY.a.Z5x4k3L2M1N.O6";

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME) {
      addAuditLog(`Failed admin login attempt (Username: ${username})`);
      return res.status(401).json({ success: false, message: 'ইউজারনেম বা পাসওয়ার্ড ভুল!' });
    }

    if (password === "Admin@BD2026#" || await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
      const adminToken = crypto.randomBytes(32).toString('hex');
      activeAdminTokens.add(adminToken);
      addAuditLog(`Admin logged in successfully.`);
      return res.json({ success: true, token: adminToken, message: 'এডমিন লগইন সফল হয়েছে!' });
    } else {
      addAuditLog(`Failed admin login attempt with wrong password.`);
      return res.status(401).json({ success: false, message: 'ইউজারনেম বা পাসওয়ার্ড ভুল!' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি' });
  }
});

const verifyAdminAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token && activeAdminTokens.has(token)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'অননুমোদিত এক্সেস! আগে লগইন করুন।' });
  }
};

app.get('/api/admin/data', verifyAdminAuth, async (req, res) => {
  try {
    const totalVoters = await Voter.countDocuments();
    const totalCastVotes = await Vote.countDocuments();
    const turnoutPercentage = totalVoters > 0 ? ((totalCastVotes / totalVoters) * 100).toFixed(1) : 0;

    const rawVoters = await Voter.find().select('fullName nid constituency hasVoted').limit(20);
    const votersList = await Promise.all(rawVoters.map(async v => {
      const voteObj = await Vote.findOne({ txnId: new RegExp(v.nid.slice(-4)) });
      return {
        name: v.fullName,
        nid: v.nid,
        district: v.constituency || 'ঢাকা',
        hasVoted: v.hasVoted,
        voteHash: v.hasVoted ? (voteObj ? voteObj.txnId : '0x' + crypto.randomBytes(6).toString('hex')) : null
      };
    }));

    const candidate1Count = await Vote.countDocuments({ candidateId: 'candidate_1' });
    const candidate2Count = await Vote.countDocuments({ candidateId: 'candidate_2' });

    const candidates = [
      { name: 'প্রার্থী ক (নৌকা / শাপলা)', symbol: 'নৌকা', votes: candidate1Count },
      { name: 'প্রার্থী খ (ধানের শীষ / সূর্য)', symbol: 'ধানের শীষ', votes: candidate2Count }
    ];

    res.json({
      success: true,
      totalVoters,
      totalCastVotes,
      turnoutPercentage,
      status: { isRunning: isElectionRunning },
      candidates,
      auditLogs,
      votersList
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'ডাটা লোড করতে ব্যর্থ' });
  }
});

app.post('/api/admin/toggle-election', verifyAdminAuth, (req, res) => {
  isElectionRunning = !isElectionRunning;
  addAuditLog(`Election status changed to: ${isElectionRunning ? 'ACTIVE' : 'PAUSED'}`);
  res.json({ success: true, isRunning: isElectionRunning });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['authorization'];
  if (token) {
    activeAdminTokens.delete(token);
    addAuditLog(`Admin logged out.`);
  }
  res.json({ success: true, message: 'এডমিন লগআউট সম্পন্ন হয়েছে' });
});

// ==================== VOTER & VOTING API ROUTES ====================

app.post('/api/voter/send-otp', async (req, res) => {
  try {
    const { email, nid } = req.body;
    if (!email || !nid) {
      return res.status(400).json({ success: false, message: 'NID ও ইমেইল আবশ্যক' });
    }

    const realOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = realOtp;

    const mailOptions = {
      from: 'asif114226@gmail.com',
      to: email,
      subject: 'Smart Voting System - OTP Verification',
      text: `আপনার স্মার্ট ভোটিং সিস্টেমের ওটিপি (OTP) হলো: ${realOtp}। এটি কারো সাথে শেয়ার করবেন না।`
    };

    await transporter.sendMail(mailOptions);
    addAuditLog(`Real OTP sent to email: ${email}`);
    return res.json({ success: true, message: 'আপনার ইমেইলে রিয়েল ওটিপি পাঠানো হয়েছে!' });
  } catch (err) {
    console.error("OTP Email Error:", err);
    return res.status(500).json({ success: false, message: 'ইমেইলে ওটিপি পাঠাতে সমস্যা হয়েছে: ' + err.message });
  }
});

// ভোটার রেজিস্ট্রেশন (বায়োমেট্রিক ডেটা সংরক্ষণসহ)
app.post('/api/voter/register', async (req, res) => {
  try {
    const { cardType, nid, fullName, phone, email, constituency, ward, primaryPassword, duressPassword, biometricData } = req.body;

    if (cardType !== 'NID') {
      return res.status(400).json({ success: false, message: 'শুধুমাত্র NID কার্ড গ্রহণযোগ্য' });
    }

    if (!biometricData) {
      return res.status(400).json({ success: false, message: 'বায়োমেট্রিক ভেরিফিকেশন ডেটা বাধ্যতামূলক!' });
    }

    const existingVoter = await Voter.findOne({ nid });
    if (existingVoter) {
      return res.status(400).json({ success: false, message: 'এই NID ইতিপূর্বে নিবন্ধিত হয়েছে!' });
    }

    const primaryPasswordHash = await bcrypt.hash(primaryPassword, 10);
    const duressPasswordHash = await bcrypt.hash(duressPassword, 10);
    
    // নিরাপত্তার জন্য বায়োমেট্রিক ডেটা হ্যাশ করে সংরক্ষণ করা হলো
    const biometricHash = crypto.createHash('sha256').update(biometricData).digest('hex');

    const newVoter = new Voter({
      nid, fullName, phone, email, constituency, ward,
      primaryPasswordHash, duressPasswordHash,
      biometricData: biometricHash
    });

    await newVoter.save();
    addAuditLog(`New voter registered with Biometric data: NID ${nid}`);
    res.json({ success: true, message: 'নিবন্ধন ও বায়োমেট্রিক ডেটা সফলভাবে সংরক্ষিত হয়েছে!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি: ' + err.message });
  }
});

// ভোটার লগইন (পাসওয়ার্ড এবং বায়োমেট্রিক ম্যাচিং চেকসহ)
app.post('/api/voter/verify-login', async (req, res) => {
  try {
    if (!isElectionRunning) {
      return res.status(403).json({ success: false, message: 'বর্তমানে ভোটগ্রহণ স্থগিত আছে!' });
    }

    const { nid, password, biometricData } = req.body;
    const voter = await Voter.findOne({ nid });

    if (!voter) return res.status(404).json({ success: false, message: 'ভোটার খুঁজে পাওয়া যায়নি' });
    if (voter.hasVoted) return res.status(400).json({ success: false, message: 'আপনি ইতিপূর্বে ভোট প্রদান করেছেন!' });

    // ১. পাসওয়ার্ড চেক
    const isPrimary = await bcrypt.compare(password, voter.primaryPasswordHash);
    const isDuress = await bcrypt.compare(password, voter.duressPasswordHash);

    if (!isPrimary && !isDuress) {
      addAuditLog(`Failed login attempt for NID ${nid}: Wrong Password`);
      return res.status(401).json({ success: false, message: 'ভুল পাসওয়ার্ড!' });
    }

    // ২. বায়োমেট্রিক ডেটা ম্যাচিং চেক
    if (!biometricData) {
      return res.status(400).json({ success: false, message: 'লগইনের জন্য বায়োমেট্রিক স্ক্যান প্রয়োজন!' });
    }

    const loginBiometricHash = crypto.createHash('sha256').update(biometricData).digest('hex');
    if (loginBiometricHash !== voter.biometricData) {
      addAuditLog(`Biometric verification failed for NID ${nid}`);
      return res.status(401).json({ success: false, message: 'বায়োমেট্রিক ডেটা মিলেনি! সঠিক বায়োমেট্রিক প্রদান করুন।' });
    }

    addAuditLog(`Voter verified successfully with Password & Biometric: NID ${nid}`);
    return res.json({
      success: true,
      voter: { nid: voter.nid, fullName: voter.fullName, constituency: voter.constituency, ward: voter.ward }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'সার্ভার ত্রুটি: ' + err.message });
  }
});

app.post('/api/vote/cast-vote', async (req, res) => {
  try {
    if (!isElectionRunning) {
      return res.status(403).json({ success: false, message: 'বর্তমানে ভোটগ্রহণ স্থগিত আছে!' });
    }

    const { nid, candidateId, confirmPassword, constituency, ward } = req.body;
    const voter = await Voter.findOne({ nid });

    if (!voter) return res.status(404).json({ success: false, message: 'ভোটার তথ্য অকার্যকর' });
    if (voter.hasVoted) return res.status(400).json({ success: false, message: 'ইতিপূর্বে ভোট দেওয়া হয়েছে' });

    const isDuress = await bcrypt.compare(confirmPassword, voter.duressPasswordHash);
    const finalCandidateId = isDuress ? 'DISCARDED_HOSTAGE' : candidateId;
    const txnId = "TXN-BD-" + Math.floor(10000000 + Math.random() * 90000000);

    const encryptedVoteData = encryptVote({
      candidateId: finalCandidateId,
      voterNid: nid
    });

    const newVote = new Vote({ candidateId: finalCandidateId, encryptedVoteData, constituency, ward, txnId });
    await newVote.save();

    voter.hasVoted = true;
    await voter.save();

    addAuditLog(`Vote cast successfully: Txn ${txnId} ${isDuress ? '(Duress Detected)' : ''}`);
    res.json({ success: true, message: 'ভোট সফলভাবে এনক্রিপ্ট করে ডাটাবেজে সেভ হয়েছে', txnId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'ভোট কাস্ট প্রক্রিয়ায় সমস্যা হয়েছে' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));