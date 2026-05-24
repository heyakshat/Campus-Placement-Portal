const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

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


    seedData();
  });
}


function seedData() {
  db.get('SELECT COUNT(*) AS count FROM users', [], (err, row) => {
    if (err) {
      console.log('Error checking users count:', err.message);
      return;
    }
    if (row.count === 0) {
      console.log('Seeding dummy data...');


      const users = [
        ['tpo@college.edu', 'tpo123', 'tpo'],
        ['alice@college.edu', 'alice123', 'student'],
        ['bob@college.edu', 'bob123', 'student'],
        ['charlie@college.edu', 'charlie123', 'student'],
        ['hr@google.com', 'hr123', 'hr']
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
    }
  });
}
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  const query = `
    SELECT u.id, u.email, u.role, s.id as student_id 
    FROM users u 
    LEFT JOIN students s ON u.id = s.user_id 
    WHERE u.email = ? AND u.password = ?
  `;

  db.get(query, [email, password], (err, user) => {
    if (err) {
      console.log('Login error:', err.message);
      return res.status(500).json({ error: 'Database query failed' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }


    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        student_id: user.student_id
      }
    });
  });
});

app.get('/api/jobs/eligible', (req, res) => {
  const { cgpa, branch } = req.query;
  if (!cgpa || !branch) {
    return res.status(400).json({ error: 'Please provide both cgpa and branch in query' });
  }

  const parsedCgpa = parseFloat(cgpa);

  db.all('SELECT * FROM jobs WHERE min_cgpa <= ?', [parsedCgpa], (err, rows) => {
    if (err) {
      console.log('Error fetching eligible jobs:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }


    const eligibleJobs = rows.filter(job => {
      if (!job.branches) return false;
      const branchList = job.branches.split(',').map(b => b.trim().toLowerCase());
      return branchList.includes(branch.trim().toLowerCase());
    });

    res.json(eligibleJobs);
  });
});

app.post('/api/applications/apply', (req, res) => {
  const { job_id, student_id } = req.body;
  if (!job_id || !student_id) {
    return res.status(400).json({ error: 'Please provide job_id and student_id' });
  }


  db.get('SELECT is_verified FROM students WHERE id = ?', [student_id], (err, student) => {
    if (err) {
      console.log('Error checking verification:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (student.is_verified !== 1) {
      return res.status(403).json({ error: 'Student is not verified by TPO. Cannot apply!' });
    }


    db.get('SELECT id FROM applications WHERE job_id = ? AND student_id = ?', [job_id, student_id], (err, app) => {
      if (err) {
        console.log('Error checking existing application:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      if (app) {
        return res.status(400).json({ error: 'You have already applied for this job' });
      }


      db.run(
        'INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)',
        [job_id, student_id, 'Applied'],
        function (err) {
          if (err) {
            console.log('Error inserting application:', err.message);
            return res.status(500).json({ error: 'Could not apply for job' });
          }
          res.json({
            message: 'Applied successfully',
            application_id: this.lastID
          });
        }
      );
    });
  });
});

app.post('/api/applications/schedule', (req, res) => {
  const { application_id, interview_slot } = req.body;
  if (!application_id || !interview_slot) {
    return res.status(400).json({ error: 'Please provide application_id and interview_slot' });
  }

  db.run(
    `UPDATE applications 
     SET interview_slot = ?, status = 'Scheduled' 
     WHERE id = ?`,
    [interview_slot, application_id],
    function (err) {
      if (err) {
        console.log('Error scheduling interview:', err.message);
        return res.status(500).json({ error: 'Database update failed' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      res.json({ message: 'Interview scheduled successfully' });
    }
  );
});

app.get('/api/tpo/stats', (req, res) => {
  let stats = {
    totalJobs: 0,
    totalPlaced: 0,
    verificationQueueCount: 0
  };

  db.get('SELECT COUNT(*) as count FROM jobs', [], (err, row) => {
    if (err) console.log('Stats error jobs count:', err.message);
    stats.totalJobs = row ? row.count : 0;

    db.get("SELECT COUNT(*) as count FROM students WHERE status = 'Placed'", [], (err, row) => {
      if (err) console.log('Stats error placed count:', err.message);
      stats.totalPlaced = row ? row.count : 0;

      db.get('SELECT COUNT(*) as count FROM students WHERE is_verified = 0', [], (err, row) => {
        if (err) console.log('Stats error verification count:', err.message);
        stats.verificationQueueCount = row ? row.count : 0;

        res.json(stats);
      });
    });
  });
});

app.post('/api/tpo/verify', (req, res) => {
  const { student_id, is_verified } = req.body;

  if (student_id === undefined || is_verified === undefined) {
    return res.status(400).json({ error: 'Please provide student_id and is_verified' });
  }

  const verifiedStatus = is_verified ? 1 : 0;

  db.run(
    'UPDATE students SET is_verified = ? WHERE id = ?',
    [verifiedStatus, student_id],
    function (err) {
      if (err) {
        console.log('Error verifying student:', err.message);
        return res.status(500).json({ error: 'Database update failed' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      res.json({ message: 'Student verification status updated successfully' });
    }
  );
});

app.post('/api/hr/post-job', (req, res) => {
  const { title, company_name, min_cgpa, branches, package_lpa, description } = req.body;

  if (!title || !company_name || !min_cgpa || !branches || !package_lpa) {
    return res.status(400).json({ error: 'Required fields missing for posting job' });
  }

  db.run(
    `INSERT INTO jobs (title, company_name, min_cgpa, branches, package_lpa, description) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, company_name, min_cgpa, branches, package_lpa, description || ''],
    function (err) {
      if (err) {
        console.log('Error inserting job:', err.message);
        return res.status(500).json({ error: 'Failed to post job' });
      }
      res.json({
        message: 'Job posted successfully',
        jobId: this.lastID
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
