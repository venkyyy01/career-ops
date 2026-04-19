# Sai Krishna

**Backend Software Engineer | AI/ML Systems | Cloud-Native Platforms**

Toronto, Ontario, Canada  
saikrishna.sde@gmail.com | +1-647-547-6824  

---

## Summary

Backend Software Engineer with 4+ years of experience building scalable, AI-powered systems and cloud-native platforms. Proven track record of reducing infrastructure costs by 48%, cutting API response times by 50%, and leading Python modernization initiatives across distributed teams. Expertise in FastAPI, microservices architecture, event-driven systems, and AI/LLM integration. Strong focus on observability, reliability, and mentoring junior engineers.

---

## Experience

### Software Engineer
**Ross Video** — Ottawa, ON  
*Jan 2024 – Present*

- Built an internal AI-powered search tool (FastAPI, Vertex AI, Cloud Run) that helps broadcast engineers and field support teams instantly find device setup and troubleshooting guides; cut average resolution time from ~15 min to under 3 min for ~200 daily users
- Led a Python upgrade across 10+ media-processing services and data pipelines (3.8.x to 3.12.x) for a 6-person team; fixed security vulnerabilities (CVEs), brought test coverage to 85%, and cut cloud infrastructure costs by 48%
- Built a reliable event-processing system on GCP Pub/Sub to handle broadcast device and tally-control signals; prevented duplicate commands from being sent during system retries across pipelines processing ~10k events/day
- Moved slow, blocking media tasks (video transcoding, metadata indexing) to run in the background instead of blocking API responses; cut response times roughly in half (~800 ms to ~380 ms) during peak live-production load
- Built AI-assisted workflows to automate broadcast asset registration and production handoff across media and proxy systems; reduced a process that previously took multiple days down to same-day completion
- Introduced and standardized an async API design pattern for services communicating with live production systems; adopted by 4 teams and reduced integration delays from weeks to days
- Added an AI-assisted code review step to the CI pipeline; cut average pull request review time from ~2 days to under 1 day across 3 engineering teams
- Mentored 3 junior engineers through regular 1:1s and pair programming; helped establish a team-wide code review policy and on-call runbooks that reduced after-hours incidents within the first quarter

### Software Developer
**Rogers Communications** — Toronto, ON  
*Mar 2022 – Jan 2024*

- Decomposed a high-traffic Python monolith serving ~5M monthly active subscribers into independently deployable FastAPI and Spring Boot microservices across a 7-engineer team, enabling weekly releases from a previously monthly cadence
- Implemented Kubernetes auto-scaling with liveness and readiness probes, reducing unplanned production incidents from 4 per quarter to under 1 and lowering p99 incident recovery time from ~45 min to under 10 min
- Reworked data ingestion pipelines across Hive, Databricks, and AWS Kinesis to sustain a 3× traffic increase without SLA degradation or additional infrastructure spend
- Built Datadog and CloudWatch dashboards surfacing deployment anomalies and regressions; contributed to a shared alerting standard adopted across 3 platform squads, shortening mean time to triage on production issues
- Influenced quarterly platform roadmap by presenting incident data on recurring deployment-drift failures, resulting in leadership prioritising a GitOps-first strategy and full CI/CD ownership (Jenkins, GitOps) across dev, staging, and production
- Owned end-to-end CI/CD toolchain (Jenkins, GitOps), enabling zero-downtime rolling deployments and eliminating environment drift across all release environments

### Software Developer
**Bell Canada** — Ottawa, ON  
*May 2020 – Mar 2022*

- Profiled and refactored hot-path bottlenecks in legacy Java enterprise services handling high-volume billing transactions for millions of subscribers, stabilising throughput and resolving long-standing reliability issues under peak load
- Introduced compensating-transaction patterns on billing adjustment workflows to guarantee consistency on partial failures, eliminating a class of data integrity incidents that previously required manual correction by the ops team
- Replaced manual deployment scripts with Docker and Kubernetes pipelines for a 5-engineer team, achieving fully repeatable builds and eliminating environment-specific release failures
- Integrated Python-based unit and integration test suites using pytest with mocking and patching coverage into CI, raising test coverage from under 50% to above 75% and reducing defect escape rate into production
- Automated recurring server-provisioning and operational maintenance tasks with Python and Bash, freeing meaningful team capacity for feature delivery
- Redesigned indexes and rewrote inefficient query plans on high-frequency transactional tables, lowering average execution time on critical billing query paths

---

## Education

**Master of IT/Digital Transformation (MDTI)**  
University of Ottawa — May 2021

---

## Certifications

- Microsoft Certified: Azure Solutions Architect Expert (AZ-305) — 2025
- Microsoft Certified: Azure Administrator Associate (AZ-104) — 2024

---

## Skills

**Languages:** Python 3.12, Java, JavaScript

**Frameworks:** FastAPI, Django, Flask, Spring Boot

**AI / LLM:** RAG Pipelines, Agentic frameworks, LangChain, Fine-Tuning, Prompt Engineering

**Cloud:** GCP (Cloud Run, Pub/Sub, BigQuery, Vertex AI), AWS (Lambda, S3, SQS, EC2), Azure (Functions, ADF)

**DevOps:** Docker, Kubernetes, Jenkins, Airflow, GitOps, Terraform

**Observability:** Datadog, CloudWatch, OpenTelemetry

**Data:** PostgreSQL, MSSQL Server, Redis, Hive, AWS Kinesis

**Practices:** TDD, Event-Driven Architecture, Distributed Systems, Idempotency, CI/CD

---

## Key Metrics & Impact

- **Cost Reduction:** 48% cloud infrastructure cost reduction
- **Performance:** 50% API response time improvement (800ms → 380ms)
- **Efficiency:** 80% reduction in resolution time (15min → 3min) for 200 daily users
- **Reliability:** 75% reduction in production incidents (4/quarter → <1/quarter)
- **Recovery:** 78% faster incident recovery (45min → 10min p99)
- **Coverage:** Raised test coverage from <50% to 85%
- **Scale:** Supporting ~5M monthly active subscribers
- **Throughput:** Processing ~10k events/day with idempotency guarantees
