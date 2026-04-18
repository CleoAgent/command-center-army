# Command Center Architecture

## Purpose
A visual command center for a hierarchical multi-agent organization:
- Supreme Commander
- Captains / leads
- Worker agents
- Epics, tasks, sessions, health, and business pipelines

## Stack
- Frontend: React + Vite
- UI style: dashboard-first, optionally gamified later with Phaser overlays/widgets
- Data source phase 1: local mock/state files
- Data source phase 2: CLEO tasks/sessions + OpenClaw health/runtime + SignalDock agent status

## Organization Model

### Supreme Commander
- Core orchestrator
- Sees all departments, health, objectives, profits, blockers

### Captains
1. Platform Captain
2. Commerce Captain
3. Services Captain
4. Content Captain
5. Growth Captain
6. Finance Captain

### Workers
Each captain owns workers in:
- research
- execution
- QA
- reporting
- optimization

## Core Screens
1. Commander Overview
2. Org Chart
3. Department Detail
4. Tasks / Epics / Sessions
5. Business Pipelines
6. Revenue / KPI board
7. Health / Runtime / Alerts

## Business Systems (initial placeholders)
- Etsy / POD pipeline
- Fiverr-style services pipeline
- Content pipeline
- Lead-gen / outreach pipeline

## Data Model (phase 1)
- captains[]
- workers[]
- departments[]
- epics[]
- tasks[]
- pipelines[]
- alerts[]
- metrics[]

## Phase 1 Goal
Ship a working visual command center with:
- commander dashboard
- org hierarchy
- active initiatives
- simulated revenue systems
- CLEO/OpenClaw integration slots
