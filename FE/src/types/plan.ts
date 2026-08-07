export interface Resource {
  title: string;
  platform: string;
  type: 'course' | 'article' | 'video' | 'docs';
  cost: 'free' | 'paid';
  reason: string;
  url: null;
  verified: false;
}

export interface Project {
  title: string;
  description: string;
}

export interface WeekPlan {
  week: number;
  focus_skills: string[];
  goals: string;
  tasks: string[];
  project: Project | null;
  resources: Resource[];
}

export interface StudyPlan {
  id: string;
  title: string;
  created_at: string;
  total_weeks: number;
  weeks: WeekPlan[];
}

export const DUMMY_PLANS: StudyPlan[] = [
  {
    id: 'plan-1',
    title: 'System Design Mastery',
    created_at: '2026-08-01T10:00:00Z',
    total_weeks: 10,
    weeks: [
      {
        week: 1,
        focus_skills: ['System Design Fundamentals', 'Scalability Concepts'],
        goals: 'Understand core system design principles and how to approach design interviews.',
        tasks: [
          'Study CAP theorem and trade-offs',
          'Learn load balancing strategies',
          'Practice designing a URL shortener',
          'Review database sharding techniques',
        ],
        project: null,
        resources: [
          {
            title: 'System Design Interview — An Insider\'s Guide',
            platform: 'Amazon',
            type: 'article',
            cost: 'paid',
            reason: 'Most comprehensive book on system design interviews',
            url: null,
            verified: false,
          },
          {
            title: 'Grokking the System Design Interview',
            platform: 'Educative',
            type: 'course',
            cost: 'paid',
            reason: 'Interactive course with real interview question walkthroughs',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 2,
        focus_skills: ['Microservices Architecture', 'API Design'],
        goals: 'Master microservices patterns and RESTful API design principles.',
        tasks: [
          'Learn microservices communication patterns',
          'Design a rate limiter from scratch',
          'Study event-driven architecture',
          'Build a simple API gateway',
        ],
        project: null,
        resources: [
          {
            title: 'Building Microservices — Sam Newman',
            platform: 'O\'Reilly',
            type: 'article',
            cost: 'paid',
            reason: 'The definitive guide to microservices architecture',
            url: null,
            verified: false,
          },
          {
            title: 'REST API Design Best Practices',
            platform: 'YouTube',
            type: 'video',
            cost: 'free',
            reason: 'Concise overview of REST conventions and pitfalls',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 3,
        focus_skills: ['Distributed Systems', 'Caching Strategies'],
        goals: 'Deep dive into distributed systems challenges and caching solutions.',
        tasks: [
          'Implement a distributed cache with Redis',
          'Study consensus algorithms (Paxos, Raft)',
          'Design a chat system like WhatsApp',
          'Learn CDN and edge caching strategies',
        ],
        project: {
          title: 'Distributed Key-Value Store',
          description: 'Build a simple distributed key-value store with consistent hashing, replication, and a basic gossip protocol for node discovery.',
        },
        resources: [
          {
            title: 'Designing Data-Intensive Applications',
            platform: 'O\'Reilly',
            type: 'article',
            cost: 'paid',
            reason: 'Essential reading for understanding distributed data systems',
            url: null,
            verified: false,
          },
          {
            title: 'Redis University — Caching',
            platform: 'Redis',
            type: 'course',
            cost: 'free',
            reason: 'Official Redis course on caching patterns and best practices',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 4,
        focus_skills: ['System Design Interview Practice', 'Real-World Architectures'],
        goals: 'Synthesize all knowledge and practice real system design interviews end-to-end.',
        tasks: [
          'Design Twitter\'s newsfeed system',
          'Design a video streaming platform like YouTube',
          'Mock interview: Design Uber backend',
          'Review and document all designs from weeks 1-3',
        ],
        project: {
          title: 'Capstone: Social Media Platform Architecture',
          description: 'Design the complete backend architecture for a Twitter-like platform. Include feed generation, user graph, notification system, search, and analytics pipeline. Document trade-offs and scale estimates.',
        },
        resources: [
          {
            title: 'System Design Mock Interviews',
            platform: 'YouTube',
            type: 'video',
            cost: 'free',
            reason: 'Watch real system design interviews with feedback',
            url: null,
            verified: false,
          },
          {
            title: 'High Scalability Blog',
            platform: 'High Scalability',
            type: 'article',
            cost: 'free',
            reason: 'Real-world architecture case studies from top tech companies',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 5,
        focus_skills: ['Database Scaling', 'Data Modeling'],
        goals: 'Master database scaling techniques and advanced data modeling for distributed systems.',
        tasks: [
          'Study SQL vs NoSQL trade-offs at scale',
          'Learn database replication and partitioning',
          'Design a multi-tenant database schema',
          'Implement read replicas and write sharding',
        ],
        project: null,
        resources: [
          {
            title: 'Database Internals — Alex Petrov',
            platform: 'O\'Reilly',
            type: 'article',
            cost: 'paid',
            reason: 'Deep dive into how databases work under the hood',
            url: null,
            verified: false,
          },
          {
            title: 'MongoDB Distributed Systems',
            platform: 'MongoDB University',
            type: 'course',
            cost: 'free',
            reason: 'Learn sharding, replication, and distributed queries',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 6,
        focus_skills: ['Message Queues', 'Stream Processing'],
        goals: 'Understand asynchronous messaging patterns and real-time data processing.',
        tasks: [
          'Compare Kafka, RabbitMQ, and SQS architectures',
          'Build a pub/sub system with Kafka',
          'Design an event-sourcing architecture',
          'Implement a dead-letter queue and retry logic',
        ],
        project: {
          title: 'Event-Driven Order Processing System',
          description: 'Build a system that processes orders asynchronously using Kafka, with idempotency, ordering guarantees, and exactly-once semantics.',
        },
        resources: [
          {
            title: 'Kafka: The Definitive Guide',
            platform: 'O\'Reilly',
            type: 'article',
            cost: 'paid',
            reason: 'Comprehensive coverage of Kafka internals and patterns',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 7,
        focus_skills: ['Load Balancers & Proxies', 'CDN & Edge'],
        goals: 'Master traffic management, global distribution, and edge computing strategies.',
        tasks: [
          'Study Layer 4 vs Layer 7 load balancing',
          'Design a global CDN architecture',
          'Learn consistent hashing for distributed caches',
          'Configure rate limiting at the edge',
        ],
        project: null,
        resources: [
          {
            title: 'Nginx Performance Tuning',
            platform: 'Nginx Docs',
            type: 'docs',
            cost: 'free',
            reason: 'Official guide to optimizing Nginx as a reverse proxy',
            url: null,
            verified: false,
          },
          {
            title: 'Cloudflare Workers Guide',
            platform: 'Cloudflare',
            type: 'docs',
            cost: 'free',
            reason: 'Edge computing with serverless functions',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 8,
        focus_skills: ['Monitoring & Observability', 'SRE Practices'],
        goals: 'Build comprehensive monitoring, alerting, and reliability systems for production services.',
        tasks: [
          'Set up metrics collection with Prometheus + Grafana',
          'Implement distributed tracing with OpenTelemetry',
          'Design an on-call alerting and incident response plan',
          'Build a service health dashboard for SLOs/SLIs',
        ],
        project: {
          title: 'Observability Platform',
          description: 'Instrument a microservice with metrics, traces, and logs. Create dashboards showing P99 latency, error rates, and throughput. Set up intelligent alerting.',
        },
        resources: [
          {
            title: 'Site Reliability Engineering Book',
            platform: 'Google',
            type: 'article',
            cost: 'free',
            reason: 'Google\'s SRE handbook — essential reading',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 9,
        focus_skills: ['Security & Auth', 'Compliance'],
        goals: 'Design secure systems with authentication, authorization, and data protection from the ground up.',
        tasks: [
          'Design OAuth2 + OIDC auth flow for microservices',
          'Learn encryption at rest and in transit',
          'Study common attack vectors (SQLi, XSS, CSRF, SSRF)',
          'Implement API key rotation and secret management',
        ],
        project: null,
        resources: [
          {
            title: 'Web Security Academy',
            platform: 'PortSwigger',
            type: 'course',
            cost: 'free',
            reason: 'Hands-on labs covering every major web vulnerability',
            url: null,
            verified: false,
          },
          {
            title: 'OWASP Top 10 — 2025',
            platform: 'OWASP',
            type: 'docs',
            cost: 'free',
            reason: 'Latest security risk ranking and mitigation guide',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 10,
        focus_skills: ['Mock Interviews', 'System Design Presentations'],
        goals: 'Synthesize all 9 weeks of knowledge and ace real system design interviews with confidence.',
        tasks: [
          'Complete 5 mock system design interviews',
          'Record and self-review your design explanations',
          'Build a personal design reference document',
          'Peer review designs and give feedback',
        ],
        project: {
          title: 'Capstone: Design Portfolio',
          description: 'Compile designs from all 10 weeks into a polished portfolio. Include architecture diagrams, trade-off analyses, capacity estimates, and a 5-minute video walkthrough of your best design.',
        },
        resources: [
          {
            title: 'System Design Interview Checklist',
            platform: 'GitHub',
            type: 'article',
            cost: 'free',
            reason: 'Step-by-step framework for nailing any design question',
            url: null,
            verified: false,
          },
          {
            title: 'Hello Interview — Mock Platform',
            platform: 'Hello Interview',
            type: 'course',
            cost: 'paid',
            reason: 'AI-powered mock interviews with real-time feedback',
            url: null,
            verified: false,
          },
        ],
      },
    ],
  },
  {
    id: 'plan-2',
    title: 'Frontend Engineering',
    created_at: '2026-08-03T14:30:00Z',
    total_weeks: 2,
    weeks: [
      {
        week: 1,
        focus_skills: ['Advanced JavaScript', 'TypeScript Mastery'],
        goals: 'Solidify JS fundamentals and achieve TypeScript proficiency for large-scale apps.',
        tasks: [
          'Master closures, prototypes, and the event loop',
          'Learn TypeScript generics and utility types',
          'Build a type-safe utility library',
          'Study V8 engine optimizations',
        ],
        project: null,
        resources: [
          {
            title: 'You Don\'t Know JS Yet',
            platform: 'GitHub',
            type: 'article',
            cost: 'free',
            reason: 'Deep dive into JavaScript internals',
            url: null,
            verified: false,
          },
          {
            title: 'TypeScript Deep Dive',
            platform: 'TypeScript Website',
            type: 'docs',
            cost: 'free',
            reason: 'Comprehensive TypeScript reference by the community',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 2,
        focus_skills: ['React Deep Dive', 'State Management'],
        goals: 'Understand React internals and master modern state management approaches.',
        tasks: [
          'Study React reconciliation and fiber architecture',
          'Build a custom state management library',
          'Learn React Server Components patterns',
          'Implement advanced hooks (useDeferredValue, useTransition)',
        ],
        project: null,
        resources: [
          {
            title: 'React — The Documentary',
            platform: 'YouTube',
            type: 'video',
            cost: 'free',
            reason: 'History and philosophy behind React\'s design decisions',
            url: null,
            verified: false,
          },
          {
            title: 'Zustand vs Redux vs Jotai',
            platform: 'Blog',
            type: 'article',
            cost: 'free',
            reason: 'Comparative analysis of modern state managers',
            url: null,
            verified: false,
          },
        ],
      },
    ],
  },
  {
    id: 'plan-3',
    title: 'Full-Stack Developer',
    created_at: '2026-08-05T09:00:00Z',
    total_weeks: 5,
    weeks: [
      {
        week: 1,
        focus_skills: ['Backend Fundamentals', 'Node.js Ecosystem'],
        goals: 'Master server-side JavaScript, understand the Node.js runtime, and build REST APIs.',
        tasks: [
          'Understand event loop, streams, and buffers',
          'Build a REST API with Express.js',
          'Learn middleware patterns and error handling',
          'Set up ESLint, Prettier, and a CI pipeline',
        ],
        project: null,
        resources: [
          {
            title: 'Node.js — The Complete Guide',
            platform: 'Udemy',
            type: 'course',
            cost: 'paid',
            reason: 'Comprehensive Node.js course covering all fundamentals',
            url: null,
            verified: false,
          },
          {
            title: 'Express.js Documentation',
            platform: 'Express.js',
            type: 'docs',
            cost: 'free',
            reason: 'Official reference for all Express patterns and APIs',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 2,
        focus_skills: ['Database Design', 'SQL & NoSQL'],
        goals: 'Design relational and non-relational databases, write efficient queries.',
        tasks: [
          'Design a normalized PostgreSQL schema for an e-commerce app',
          'Learn indexing strategies and query optimization',
          'Model data for MongoDB with embedding vs referencing',
          'Write complex joins, subqueries, and aggregations',
        ],
        project: null,
        resources: [
          {
            title: 'PostgreSQL: The Complete Developer\'s Guide',
            platform: 'Udemy',
            type: 'course',
            cost: 'paid',
            reason: 'Deep dive into PostgreSQL with real-world examples',
            url: null,
            verified: false,
          },
          {
            title: 'MongoDB University',
            platform: 'MongoDB',
            type: 'course',
            cost: 'free',
            reason: 'Official free courses on MongoDB data modeling',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 3,
        focus_skills: ['API Development', 'Authentication'],
        goals: 'Build production-ready APIs with auth, validation, and documentation.',
        tasks: [
          'Implement JWT and OAuth2 authentication',
          'Add request validation with Zod or Joi',
          'Auto-generate Swagger/OpenAPI docs',
          'Write integration tests with Supertest',
        ],
        project: {
          title: 'Task Manager API',
          description: 'Build a production-ready REST API for a task management system with user auth, role-based access control, pagination, filtering, and full test coverage.',
        },
        resources: [
          {
            title: 'JWT Best Practices',
            platform: 'Auth0',
            type: 'article',
            cost: 'free',
            reason: 'Essential reading for secure token-based auth',
            url: null,
            verified: false,
          },
          {
            title: 'REST API Design Rulebook',
            platform: 'O\'Reilly',
            type: 'article',
            cost: 'paid',
            reason: 'Concise reference for designing consistent APIs',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 4,
        focus_skills: ['Frontend Integration', 'React + TypeScript'],
        goals: 'Connect backend APIs to a modern React frontend with proper state management.',
        tasks: [
          'Set up React + Vite + TypeScript project',
          'Implement React Query for server state',
          'Build forms with react-hook-form + Zod',
          'Add optimistic updates and error handling',
        ],
        project: {
          title: 'Full-Stack Dashboard',
          description: 'Create a responsive dashboard consuming the Task Manager API. Include real-time updates via WebSockets, drag-and-drop task boards, and analytics charts.',
        },
        resources: [
          {
            title: 'React Query — The Complete Guide',
            platform: 'TkDodo\'s Blog',
            type: 'article',
            cost: 'free',
            reason: 'Practical patterns from the React Query maintainer',
            url: null,
            verified: false,
          },
          {
            title: 'React Hook Form Tutorial',
            platform: 'YouTube',
            type: 'video',
            cost: 'free',
            reason: 'Step-by-step guide to building performant forms',
            url: null,
            verified: false,
          },
        ],
      },
      {
        week: 5,
        focus_skills: ['Deployment & DevOps', 'System Architecture'],
        goals: 'Deploy the full-stack app to production with CI/CD, monitoring, and scaling.',
        tasks: [
          'Containerize app with Docker and Docker Compose',
          'Set up GitHub Actions CI/CD pipeline',
          'Deploy to a cloud provider (AWS/Railway/Render)',
          'Add monitoring with Sentry and logging with Winston',
        ],
        project: {
          title: 'Capstone: Production Deployment',
          description: 'Take the Task Manager app live. Configure HTTPS, domain, CDN, automated database backups, error tracking, and a zero-downtime deployment strategy.',
        },
        resources: [
          {
            title: 'Docker Masterclass for Developers',
            platform: 'YouTube',
            type: 'video',
            cost: 'free',
            reason: 'Practical Docker tutorial covering real dev workflows',
            url: null,
            verified: false,
          },
          {
            title: 'GitHub Actions in Action',
            platform: 'GitHub Docs',
            type: 'docs',
            cost: 'free',
            reason: 'Official guide for setting up CI/CD workflows',
            url: null,
            verified: false,
          },
        ],
      },
    ],
  },
];
