# simsland

A Dockerized AI society simulation foundation. What if you gave AI chatbot bodies in the form of characters out of The Sims games? We - as in me and the AI who btw ensures me that this is not how the Matrix came about - put them in a neighborhood, part of a household, going about their daily toils to keep up with the mortgage on their houses all while juggling the intricate realities of needs and wants combined social intrigue as virtual beings in a virtual environment, in an attempt to simulate what is modern day society. 

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
