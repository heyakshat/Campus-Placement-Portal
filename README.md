# 🎓 Campus Placement Portal — Animated GitHub README

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=600&size=28&duration=2500&pause=1000&color=00C2FF&center=true&vCenter=true&width=900&lines=AI-Powered+Campus+Placement+Portal;Full-Stack+Recruitment+Management+System;Power+BI+Analytics+%7C+Resume+Screening+%7C+Automation;Built+with+MERN+%2B+GenAI+%2B+Cloud+Architecture" />

<br/>

<img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js"/>
<img src="https://img.shields.io/badge/Frontend-React-blue?style=for-the-badge&logo=react"/>
<img src="https://img.shields.io/badge/Database-MySQL-orange?style=for-the-badge&logo=mysql"/>
<img src="https://img.shields.io/badge/AI-Resume%20Screening-purple?style=for-the-badge&logo=openai"/>
<img src="https://img.shields.io/badge/Analytics-PowerBI-yellow?style=for-the-badge&logo=powerbi"/>
<img src="https://img.shields.io/badge/Cloud-AWS-black?style=for-the-badge&logo=amazonaws"/>

</div>

---

# 🚀 Overview

The **Campus Placement Portal** is a full-scale intelligent recruitment ecosystem designed for colleges and universities.

It streamlines:

* 🎯 Student Placement Management
* 🏢 Company Recruitment Drives
* 📄 AI Resume Screening
* 📊 Real-Time Placement Analytics
* 🔔 Automated Notifications
* 📈 Power BI Reporting
* 🔐 Role-Based Secure Access

---

# ✨ Animated Workflow

```mermaid
flowchart LR

A[🎓 Student Registration] --> B[📄 Resume Upload]
B --> C[🤖 AI Resume Screening]
C --> D[📊 Skill Match Score]
D --> E[🏢 Company Eligibility]
E --> F[📝 Placement Application]
F --> G[📅 Interview Scheduling]
G --> H[📈 Analytics Dashboard]
```

---

# 🧠 System Architecture

```mermaid
graph TD

U[👨‍🎓 Students]
A[👩‍💼 Admin]
R[🏢 Recruiters]

U --> FE[🌐 React Frontend]
A --> FE
R --> FE

FE --> API[⚡ Node.js API Gateway]

API --> DB[(🗄️ MySQL Database)]
API --> AI[🤖 AI Resume Engine]
API --> BI[📊 Power BI Service]

AI --> NLP[🧠 NLP + ML Models]
BI --> DASH[📈 Interactive Dashboards]

DB --> ERD[🧩 Relational ERD Model]
```

---

# 🗂️ ER Diagram

```mermaid
erDiagram

STUDENTS ||--o{ APPLICATIONS : applies
COMPANIES ||--o{ JOBS : posts
JOBS ||--o{ APPLICATIONS : receives
STUDENTS ||--o{ RESUMES : uploads
ADMINS ||--o{ REPORTS : generates

STUDENTS {
    int student_id
    string name
    string email
    string department
    float cgpa
}

COMPANIES {
    int company_id
    string company_name
    string package
}

JOBS {
    int job_id
    string role
    string eligibility
}

APPLICATIONS {
    int application_id
    string status
}

RESUMES {
    int resume_id
    string skills
    float ai_score
}
```

---

# ⚙️ Core Features

<table>
<tr>
<td width="50%">

## 🎓 Student Module

* Resume Upload
* Profile Builder
* Job Applications
* Placement Tracking
* Skill Analysis
* AI Suggestions

</td>

<td width="50%">

## 🏢 Recruiter Module

* Job Posting
* Candidate Filtering
* AI Screening
* Interview Scheduling
* Hiring Pipeline

</td>
</tr>
</table>

---

<table>
<tr>
<td width="50%">

## 👨‍💼 Admin Module

* User Management
* Placement Statistics
* Department Reports
* Access Control
* Notifications

</td>

<td width="50%">

## 🤖 AI Engine

* Resume Parsing
* Skill Extraction
* ATS Scoring
* NLP Matching
* Candidate Ranking

</td>
</tr>
</table>

---

# 🛠️ Tech Stack

<div align="center">

| Layer           | Technology                  |
| --------------- | --------------------------- |
| Frontend        | React.js + Tailwind CSS     |
| Backend         | Node.js + Express.js        |
| Database        | MySQL / PostgreSQL          |
| AI Engine       | Python + NLP + Transformers |
| Dashboard       | Power BI                    |
| Authentication  | JWT + OAuth                 |
| Cloud           | AWS / Azure                 |
| Version Control | Git + GitHub                |

</div>

---

# 📊 Power BI Analytics

```mermaid
pie
    title Placement Statistics
    "Placed Students" : 65
    "Eligible Students" : 20
    "Pending Applications" : 10
    "Rejected" : 5
```

### Dashboard Insights

* 📈 Highest Hiring Companies
* 🧠 Skill Gap Analysis
* 🎯 Placement Ratio
* 🏫 Department-wise Performance
* 💼 Average Salary Trends

---

# 🤖 AI Resume Screening Engine

```mermaid
sequenceDiagram

participant S as Student
participant P as Portal
participant AI as AI Engine
participant DB as Database

S->>P: Upload Resume
P->>AI: Parse Resume
AI->>AI: Extract Skills & Keywords
AI->>DB: Store AI Score
DB-->>P: Return Ranked Candidate
P-->>S: Eligibility Result
```

---

# 🔐 Authentication & Security

* ✅ JWT Authentication
* 🔒 Password Encryption
* 🛡️ Role-Based Access Control
* ☁️ Secure Cloud Storage
* 🔍 Audit Logging

---

# 📁 Project Structure

```bash
Campus-Placement-Portal/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── assets/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── services/
│
├── ai-engine/
│   ├── resume-parser/
│   ├── nlp-models/
│   └── ranking-engine/
│
├── database/
│   ├── schema.sql
│   └── erd/
│
├── powerbi-dashboard/
│
└── README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/your-username/campus-placement-portal.git
cd campus-placement-portal
```

## Install Frontend

```bash
cd frontend
npm install
npm start
```

## Install Backend

```bash
cd backend
npm install
npm run dev
```

## Run AI Engine

```bash
cd ai-engine
pip install -r requirements.txt
python app.py
```

---

# 🌟 Future Enhancements

* 🎥 AI Mock Interviews
* 📱 Mobile Application
* 🌐 Multi-College Integration
* 🧠 Recommendation Engine
* 🔔 Real-Time Chat System
* 📡 Blockchain Verification

---

# 📸 Preview Section

```md
Add screenshots/gifs here
```

Example:

<p align="center">
  <img src="assets/dashboard.gif" width="800"/>
</p>

---

# 📈 GitHub Stats

<div align="center">

![GitHub stars](https://img.shields.io/github/stars/your-username/campus-placement-portal?style=social)

![GitHub forks](https://img.shields.io/github/forks/your-username/campus-placement-portal?style=social)

![GitHub issues](https://img.shields.io/github/issues/your-username/campus-placement-portal)

</div>

---

# 🤝 Contributors

<table>
<tr>
<td align="center">
<img src="https://avatars.githubusercontent.com/u/1?v=4" width="100px;" alt=""/>
<br />
<b>Your Name</b>
</td>
</tr>
</table>

---

# 💡 Vision

> “Transforming traditional campus recruitment into an AI-driven intelligent hiring ecosystem.”

---

# 📜 License

This project is licensed under the MIT License.

---

<div align="center">

# ⭐ Star This Repository If You Like It!

<img src="https://readme-typing-svg.demolab.com?font=Poppins&size=24&pause=1000&color=36BCF7&center=true&vCenter=true&width=700&lines=Thank+You+For+Visiting!;Happy+Coding+🚀;Build+The+Future+With+AI+🤖" />

</div>

