# holosims

A GitHub-ready, Dockerized AI society simulation foundation.

Includes: Ollama LLM decisions, serialized async LLM queue, Three.js frontend, PostgreSQL schema, professions/job listings/interviews/layoffs, off-grid story arcs, socioeconomic environment modifiers, news + public figures + media bias, memory/views/relationships/conversations, household economy + mailbox UI, shared events, 911/emergency responders, courts/trials/jail, hospital/treatment/insurance, politics/elections/policy consequences, crises/recovery/inequality/mobility, factions, influence, market supply/demand, goals/plans/internal monologue, hierarchy/power structures.

## Run
```bash
cp .env.example .env
docker compose up --build
```
Open http://localhost:8000

If Ollama has no model yet:
```bash
docker compose exec ollama ollama pull llama3
```
