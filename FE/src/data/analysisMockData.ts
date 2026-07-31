import type { AnalysisResult } from '../types/analysis';

/** Fixed mock data matching contracts/analysis1-result-schema.json */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  profileAnalysis: {
    profile: {
      fullName: 'Faris Mohamed',
      headline: 'Software Engineer at Incorta, B.E. in Computer & Systems, FOE AU | 2x ACPC Finalist',
      location: 'Alexandria, Egypt',
      seniorityLevel: 'Junior',
      yearsOfExperience: 2,
      about:
        'Software engineer with strong competitive programming background (2x ACPC finalist). Currently working at Incorta on full-stack development with Java, Spring Boot, and cloud infrastructure. Pursuing a 9-month diploma at ITI in BI-Infused CRM while completing a B.E. in Computer Engineering at Alexandria University.',
      education: [
        {
          institution: 'Alexandria University',
          degree: "Bachelor's degree",
          fieldOfStudy: 'Computer Engineering',
          startYear: 2020,
          endYear: 2025,
        },
        {
          institution: 'Information Technology Institute (ITI)',
          degree: 'Diploma',
          fieldOfStudy: 'Professional Development & BI-Infused CRM',
        },
      ],
      skills: {
        programmingLanguages: ['Java', 'Python', 'C/C++', 'C#', 'TypeScript', 'JavaScript'],
        frameworks: ['Spring Boot', 'Spring Security', '.Net', 'Angular', 'React JS', 'React Native', 'Apache Spark'],
        cloudAndInfra: ['Google Cloud Platform (GCP)', 'Google Kubernetes Engine (GKE)', 'Docker'],
        databases: ['SQL', 'MySQL', 'PostgreSQL', 'Oracle SQL Developer'],
        tools: ['Git', 'Linux', 'Jira', 'NiFi', 'JMeter'],
        other: ['Full-Stack Development', 'Software Design'],
      },
      softSkills: ['Team working', 'Leadership', 'Time management', 'Problem solving'],
      openToWork: false,
      languages: [],
    },
    experience: [
      {
        company: 'Incorta',
        position: 'Software Engineer',
        employmentType: 'Full-time',
        location: 'Alexandria, Egypt',
        workplaceType: 'On-site',
        startDate: '2024-10',
        endDate: null,
        description: null,
      },
      {
        company: 'Incorta',
        position: 'Software Engineer',
        employmentType: 'Internship',
        location: 'Alexandria, Egypt',
        workplaceType: 'On-site',
        startDate: '2024-07',
        endDate: '2024-10',
        description: null,
      },
      {
        company: 'EJADA',
        position: 'Software Engineer',
        employmentType: 'Internship',
        location: 'Alexandria, Egypt',
        workplaceType: 'Remote',
        startDate: '2024-05',
        endDate: '2024-06',
        description: null,
      },
      {
        company: 'Faculty of Engineering',
        position: 'Deep Learning Intern',
        employmentType: 'Internship',
        location: null,
        workplaceType: null,
        startDate: null,
        endDate: null,
        durationMonths: 3,
        description:
          'Completed the Deep Learning Specialization on Coursera; developed multiple NLP models for sentiment extraction.',
      },
      {
        company: 'File System Database with Driver',
        position: 'SWE Intern',
        employmentType: 'Internship',
        location: null,
        workplaceType: null,
        startDate: null,
        endDate: null,
        durationMonths: 3,
        description:
          'Implemented a Python file system database and developed a Java library for accessing the database.',
      },
      {
        company: 'ICPC – International Collegiate Programming Contest',
        position: 'Chief Judge at QCPC',
        employmentType: 'Volunteer',
        location: null,
        workplaceType: 'Remote',
        startDate: '2023-09',
        endDate: '2023-09',
        description: 'Led problem-setting and judging for QCPC contest in collaboration with ICPC community.',
      },
    ],
    projects: [
      { name: '3alSekka', description: 'Carpooling Mobile App', source: 'resume' },
      { name: 'Weather Station System', description: null, source: 'resume' },
      { name: 'Reservista', description: 'Hotel Reservation System', source: 'resume' },
      { name: 'Daily-and-Sports-Activity-Detection', description: null, language: 'Python', source: 'github' },
      { name: 'ITI_ANG_PROJECT', description: null, language: 'TypeScript', source: 'github' },
      {
        name: 'Competitive.Programming',
        description: 'Algorithms, data structures and techniques used in problem solving',
        language: 'C++',
        source: 'github',
      },
    ],
    certifications: [
      {
        title: 'ACPC Qualifications 2023',
        issuedBy: 'ICPC – International Collegiate Programming Contest',
        issuedAt: '2023-08',
        expiredAt: '2023-08',
      },
    ],
    competitiveProgramming: {
      platforms: [
        {
          platform: 'Codeforces',
          handle: 'faris007',
          url: 'https://codeforces.com/profile/faris007',
        },
      ],
      achievements: ['2x ACPC Finalist', 'ACM Contestant 2022, 2023', 'ICPC Chief Judge – QCPC 2023'],
    },
    socialMetadata: {
      github: {
        username: 'faris0007',
        url: 'https://github.com/faris0007',
        publicRepos: 18,
        followers: 54,
        following: 57,
        accountCreatedAt: '2022-09-17',
        topLanguages: ['TypeScript', 'Python', 'C++'],
      },
      linkedin: {
        url: 'https://www.linkedin.com/in/faris-mohamed-308577245',
        publicIdentifier: 'faris-mohamed-308577245',
        connectionsCount: 1978,
        followerCount: 1989,
      },
    },
  },
  scoreBreakdown: {
    overall: {
      overallShowoff: { label: 'Overall Showoff', value: 78, trend: 5, lastUpdated: '2026-07-31T00:00:00Z' },
      resume:         { label: 'Resume Score',    value: 72, trend: 3, lastUpdated: '2026-07-31T00:00:00Z' },
      github:         { label: 'GitHub Score',    value: 65, trend: 0, lastUpdated: '2026-07-31T00:00:00Z' },
    },
    dev: {
      overallShowoff: { label: 'Overall Showoff', value: 82, trend: 6, lastUpdated: '2026-07-31T00:00:00Z' },
      resume:         { label: 'Resume Score',    value: 78, trend: 5, lastUpdated: '2026-07-31T00:00:00Z' },
      github:         { label: 'GitHub Score',    value: 68, trend: 2, lastUpdated: '2026-07-31T00:00:00Z' },
    },
    aiml: {
      overallShowoff: { label: 'Overall Showoff', value: 55, trend: 0, lastUpdated: '2026-07-31T00:00:00Z' },
      resume:         { label: 'Resume Score',    value: 50, trend: 0, lastUpdated: '2026-07-31T00:00:00Z' },
      github:         { label: 'GitHub Score',    value: 45, trend: 0, lastUpdated: '2026-07-31T00:00:00Z' },
    },
  },
};
