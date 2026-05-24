const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campus_placement_secret_key';

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'placement.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database (placement.db).');
    initializeTables();
  }
});

const dbQuery = {
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

function initializeTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      cgpa REAL,
      branch TEXT,
      status TEXT,
      is_verified INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      company_name TEXT,
      min_cgpa REAL,
      branches TEXT,
      package_lpa REAL,
      description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      student_id INTEGER,
      status TEXT DEFAULT 'Applied',
      interview_slot TEXT,
      FOREIGN KEY(job_id) REFERENCES jobs(id),
      FOREIGN KEY(student_id) REFERENCES students(id)
    )`);

    seedAndMigrateData();
  });
}

async function seedAndMigrateData() {
  try {
    const row = await dbQuery.get('SELECT COUNT(*) AS count FROM users');
    if (row.count === 0) {
      console.log('Seeding dummy data...');

      const hashedTpo = await bcrypt.hash('tpo123', 10);
      const hashedAlice = await bcrypt.hash('alice123', 10);
      const hashedBob = await bcrypt.hash('bob123', 10);
      const hashedCharlie = await bcrypt.hash('charlie123', 10);
      const hashedHr = await bcrypt.hash('hr123', 10);

      const users = [
        ['tpo@college.edu', hashedTpo, 'tpo'],
        ['alice@college.edu', hashedAlice, 'student'],
        ['bob@college.edu', hashedBob, 'student'],
        ['charlie@college.edu', hashedCharlie, 'student'],
        ['hr@google.com', hashedHr, 'hr']
      ];

      const insertUserStmt = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
      users.forEach((user) => {
        insertUserStmt.run(user);
      });
      insertUserStmt.finalize();

      const students = [
        [2, 'Alice Smith', 8.5, 'CS', 'Unplaced', 1],
        [3, 'Bob Jones', 7.2, 'EC', 'Unplaced', 0],
        [4, 'Charlie Brown', 9.1, 'CS', 'Placed', 1]
      ];
      const insertStudentStmt = db.prepare('INSERT INTO students (user_id, name, cgpa, branch, status, is_verified) VALUES (?, ?, ?, ?, ?, ?)');
      students.forEach((student) => {
        insertStudentStmt.run(student);
      });
      insertStudentStmt.finalize();

      const jobs = [
        ['Software Engineer', 'Google', 8.0, 'CS,IT', 25.5, 'Build large scale web applications and services.'],
        ['Hardware Designer', 'Intel', 7.0, 'EC,EE', 15.0, 'Work on cutting edge chip design and validation.'],
        ['Data Analyst', 'Amazon', 7.5, 'CS,IT,EC', 18.0, 'Transform raw data into meaningful business insights.']
      ];
      const insertJobStmt = db.prepare('INSERT INTO jobs (title, company_name, min_cgpa, branches, package_lpa, description) VALUES (?, ?, ?, ?, ?, ?)');
      jobs.forEach((job) => {
        insertJobStmt.run(job);
      });
      insertJobStmt.finalize();

      const applications = [
        [1, 1, 'Applied', null],
        [3, 1, 'Scheduled', '2026-06-01 10:00 AM'],
        [2, 2, 'Rejected', null]
      ];
      const insertAppStmt = db.prepare('INSERT INTO applications (job_id, student_id, status, interview_slot) VALUES (?, ?, ?, ?)');
      applications.forEach((app) => {
        insertAppStmt.run(app);
      });
      insertAppStmt.finalize();

      console.log('Seeding finished successfully.');
    } else {
      const users = await dbQuery.all('SELECT id, password FROM users');
      let migratedCount = 0;
      for (const user of users) {
        const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        if (!isHashed) {
          const hashed = await bcrypt.hash(user.password, 10);
          await dbQuery.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
          migratedCount++;
        }
      }
      if (migratedCount > 0) {
        console.log(`Successfully migrated ${migratedCount} plain text passwords to bcrypt hashes.`);
      }
    }
  } catch (err) {
    console.error('Error seeding/migrating data:', err.message);
  }
}

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

app.post('/api/auth/register', async (req, res) => {
  const { email, password, role, name, cgpa, branch } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Please provide email, password, and role (student, tpo, hr)' });
  }

  const validRoles = ['student', 'tpo', 'hr'];
  const userRole = role.toLowerCase().trim();
  if (!validRoles.includes(userRole)) {
    return res.status(400).json({ error: 'Invalid role. Must be one of: student, tpo, hr' });
  }

  try {
    const existingUser = await dbQuery.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbQuery.run(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, userRole]
    );
    const userId = result.lastID;

    let studentId = null;
    if (userRole === 'student') {
      if (!name || cgpa === undefined || !branch) {
        await dbQuery.run('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ error: 'Student profile requires name, cgpa, and branch' });
      }

      const parsedCgpa = parseFloat(cgpa);
      if (isNaN(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > 10) {
        await dbQuery.run('DELETE FROM users WHERE id = ?', [userId]);
        return res.status(400).json({ error: 'CGPA must be a valid number between 0 and 10' });
      }

      const studentResult = await dbQuery.run(
        'INSERT INTO students (user_id, name, cgpa, branch, status, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, name, parsedCgpa, branch, 'Unplaced', 0]
      );
      studentId = studentResult.lastID;
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: userId,
        email,
        role: userRole,
        student_id: studentId
      }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed due to a database error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    const query = `
      SELECT u.id, u.email, u.password, u.role, s.id as student_id 
      FROM users u 
      LEFT JOIN students s ON u.id = s.user_id 
      WHERE u.email = ?
    `;

    const user = await dbQuery.get(query, [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        student_id: user.student_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        student_id: user.student_id
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.get('/api/jobs', authMiddleware, async (req, res) => {
  try {
    const jobs = await dbQuery.all('SELECT * FROM jobs');
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/jobs/eligible (Student role only)
app.get('/api/jobs/eligible', authMiddleware, authorizeRoles('student'), async (req, res) => {
  let cgpa = req.query.cgpa;
  let branch = req.query.branch;

  try {
    if (!cgpa || !branch) {
      const studentId = req.user.student_id;
      if (!studentId) {
        return res.status(400).json({ error: 'Student profile not found for logged in user' });
      }

      const student = await dbQuery.get('SELECT cgpa, branch FROM students WHERE id = ?', [studentId]);
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      cgpa = student.cgpa;
      branch = student.branch;
    }

    const parsedCgpa = parseFloat(cgpa);
    if (isNaN(parsedCgpa)) {
      return res.status(400).json({ error: 'Invalid CGPA value' });
    }

    const rows = await dbQuery.all('SELECT * FROM jobs WHERE min_cgpa <= ?', [parsedCgpa]);

    const eligibleJobs = rows.filter(job => {
      if (!job.branches) return false;
      const branchList = job.branches.split(',').map(b => b.trim().toLowerCase());
      return branchList.includes(branch.trim().toLowerCase());
    });

    res.json(eligibleJobs);
  } catch (err) {
    console.error('Error fetching eligible jobs:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/hr/post-job (HR role only)
app.post('/api/hr/post-job', authMiddleware, authorizeRoles('hr'), async (req, res) => {
  const { title, company_name, min_cgpa, branches, package_lpa, description } = req.body;

  if (!title || !company_name || !min_cgpa || !branches || !package_lpa) {
    return res.status(400).json({ error: 'Required fields missing for posting job' });
  }

  try {
    const minCgpaParsed = parseFloat(min_cgpa);
    const packageLpaParsed = parseFloat(package_lpa);

    if (isNaN(minCgpaParsed) || isNaN(packageLpaParsed)) {
      return res.status(400).json({ error: 'min_cgpa and package_lpa must be valid numbers' });
    }

    const result = await dbQuery.run(
      `INSERT INTO jobs (title, company_name, min_cgpa, branches, package_lpa, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, company_name, minCgpaParsed, branches, packageLpaParsed, description || '']
    );

    res.json({
      message: 'Job posted successfully',
      jobId: result.lastID
    });
  } catch (err) {
    console.error('Error inserting job:', err.message);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// --- APPLICATIONS ROUTES ---

// GET /api/applications (HR and TPO roles only)
app.get('/api/applications', authMiddleware, authorizeRoles('hr', 'tpo'), async (req, res) => {
  try {
    const query = `
      SELECT a.id as application_id, a.status, a.interview_slot,
             j.id as job_id, j.title, j.company_name, j.package_lpa,
             s.id as student_id, s.name as student_name, s.cgpa, s.branch
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN students s ON a.student_id = s.id
    `;
    const applications = await dbQuery.all(query);
    res.json(applications);
  } catch (err) {
    console.error('Error retrieving applications:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/applications/student/:student_id (Student themselves, HR or TPO)
app.get('/api/applications/student/:student_id', authMiddleware, async (req, res) => {
  const targetStudentId = parseInt(req.params.student_id);

  if (req.user.role === 'student' && req.user.student_id !== targetStudentId) {
    return res.status(403).json({ error: 'Access denied: cannot view another student\'s applications' });
  }

  try {
    const query = `
      SELECT a.id as application_id, a.status, a.interview_slot,
             j.id as job_id, j.title, j.company_name, j.package_lpa, j.description
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.student_id = ?
    `;
    const applications = await dbQuery.all(query, [targetStudentId]);
    res.json(applications);
  } catch (err) {
    console.error('Error retrieving student applications:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/applications/apply (Student role only)
app.post('/api/applications/apply', authMiddleware, authorizeRoles('student'), async (req, res) => {
  const student_id = req.user.student_id;
  const { job_id } = req.body;

  if (!job_id) {
    return res.status(400).json({ error: 'Please provide job_id' });
  }

  if (!student_id) {
    return res.status(400).json({ error: 'Student profile not found for logged in user' });
  }

  try {
    const student = await dbQuery.get('SELECT is_verified, cgpa, branch FROM students WHERE id = ?', [student_id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (student.is_verified !== 1) {
      return res.status(403).json({ error: 'Student is not verified by TPO. Cannot apply!' });
    }

    const job = await dbQuery.get('SELECT min_cgpa, branches FROM jobs WHERE id = ?', [job_id]);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const branchList = job.branches.split(',').map(b => b.trim().toLowerCase());
    if (student.cgpa < job.min_cgpa || !branchList.includes(student.branch.trim().toLowerCase())) {
      return res.status(403).json({ error: 'You do not meet the eligibility requirements (CGPA/Branch) for this job' });
    }

    const app = await dbQuery.get('SELECT id FROM applications WHERE job_id = ? AND student_id = ?', [job_id, student_id]);
    if (app) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const result = await dbQuery.run(
      'INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)',
      [job_id, student_id, 'Applied']
    );

    res.json({
      message: 'Applied successfully',
      application_id: result.lastID
    });
  } catch (err) {
    console.error('Error applying for job:', err.message);
    res.status(500).json({ error: 'Could not apply for job' });
  }
});

app.post('/api/applications/schedule', authMiddleware, authorizeRoles('hr', 'tpo'), async (req, res) => {
  const { application_id, interview_slot } = req.body;
  if (!application_id || !interview_slot) {
    return res.status(400).json({ error: 'Please provide application_id and interview_slot' });
  }

  try {
    const result = await dbQuery.run(
      `UPDATE applications 
       SET interview_slot = ?, status = 'Scheduled' 
       WHERE id = ?`,
      [interview_slot, application_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Interview scheduled successfully' });
  } catch (err) {
    console.error('Error scheduling interview:', err.message);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// PUT /api/applications/:id/status (HR and TPO roles only)
app.put('/api/applications/:id/status', authMiddleware, authorizeRoles('hr', 'tpo'), async (req, res) => {
  const applicationId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Please provide status' });
  }

  const validStatuses = ['Applied', 'Scheduled', 'Placed', 'Rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await dbQuery.run(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, applicationId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (status === 'Placed') {
      const app = await dbQuery.get('SELECT student_id FROM applications WHERE id = ?', [applicationId]);
      if (app) {
        await dbQuery.run("UPDATE students SET status = 'Placed' WHERE id = ?", [app.student_id]);
      }
    }

    res.json({ message: 'Application status updated successfully' });
  } catch (err) {
    console.error('Error updating application status:', err.message);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// --- TPO ROUTES ---

// GET /api/tpo/stats (TPO role only)
app.get('/api/tpo/stats', authMiddleware, authorizeRoles('tpo'), async (req, res) => {
  try {
    const jobsRow = await dbQuery.get('SELECT COUNT(*) as count FROM jobs');
    const placedRow = await dbQuery.get("SELECT COUNT(*) as count FROM students WHERE status = 'Placed'");
    const verificationRow = await dbQuery.get('SELECT COUNT(*) as count FROM students WHERE is_verified = 0');

    res.json({
      totalJobs: jobsRow ? jobsRow.count : 0,
      totalPlaced: placedRow ? placedRow.count : 0,
      verificationQueueCount: verificationRow ? verificationRow.count : 0
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

// GET /api/tpo/unverified (TPO role only)
app.get('/api/tpo/unverified', authMiddleware, authorizeRoles('tpo'), async (req, res) => {
  try {
    const students = await dbQuery.all('SELECT * FROM students WHERE is_verified = 0');
    res.json(students);
  } catch (err) {
    console.error('Error retrieving unverified students:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/tpo/verify (TPO role only)
app.post('/api/tpo/verify', authMiddleware, authorizeRoles('tpo'), async (req, res) => {
  const { student_id, is_verified } = req.body;

  if (student_id === undefined || is_verified === undefined) {
    return res.status(400).json({ error: 'Please provide student_id and is_verified' });
  }

  const verifiedStatus = is_verified ? 1 : 0;

  try {
    const result = await dbQuery.run(
      'UPDATE students SET is_verified = ? WHERE id = ?',
      [verifiedStatus, student_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student verification status updated successfully' });
  } catch (err) {
    console.error('Error verifying student:', err.message);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// GET /api/students/profile (Student role only)
app.get('/api/students/profile', authMiddleware, authorizeRoles('student'), async (req, res) => {
  const studentId = req.user.student_id;
  if (!studentId) {
    return res.status(400).json({ error: 'Student profile not found for logged in user' });
  }

  try {
    const student = await dbQuery.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }
    res.json(student);
  } catch (err) {
    console.error('Error fetching student profile:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

