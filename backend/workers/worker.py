import asyncio

from core.redis_queue import dequeue_batch
from db import load_character, save_character_safe, load_world, save_world
# 🧠 Brain pipeline (same as your main.py)
from brain.perception import perceive
from brain.memory import recall
from brain.monologue import think
from brain.emotion import update_emotion
from brain.goals import select_goal
from brain.planner import generate_plan
from brain.decision_engine import decide_action
from brain.executor import execute

# 💾 persistence
from db import save_character_safe, load_character

MAX_BATCH = 10
MAX_CONCURRENCY = 5  # tune this!

sem = asyncio.Semaphore(MAX_CONCURRENCY)
# =========================
# 🧠 FULL AGENT PIPELINE
# =========================
async def process_agent(c, world):
    # skip inactive agents
    if c.get("off_grid") or c.get("legal", {}).get("status") == "jailed":
        return

    # perception
    perception = perceive(c, world)

    # memory recall
    memories = recall(
        c,
        " ".join(c.get("interests", []) + [c.get("emotion", "calm")]),
        6
    )

    # internal monologue (LLM)
    c["internal_thought"] = await think(c, perception, memories)

    # emotion update
    update_emotion(c)

    # goal selection
    goal = select_goal(c)

    # planning
    if goal and not c.get("plan"):
        c["plan"] = await generate_plan(c, goal)

    # decision
    decision = await decide_action(c, world, perception, memories)

    # execution
    execute(c, decision, world)

    # persist character
    save_character_safe(c)


# =========================
# 🔁 JOB ROUTER
# =========================
async def process_job(job):

    sim_id = job.get("simulation_id", "default")
    cid = job["character_id"]

    # 🔥 load ONLY character
    c = load_character(cid, sim_id)
    if not c:
        return

    # ⚠️ world read-only snapshot (no saving)
    world = load_world(sim_id)

    # run brain
    await process_agent(c, world)

    # 🔥 ONLY save character
    save_character_safe(c, sim_id)

# =========================
# 🚀 WORKER LOOP
# =========================
async def worker_loop():
    print("[WORKER] batching enabled")

    while True:
        jobs = dequeue_batch(MAX_BATCH)

        if not jobs:
            await asyncio.sleep(0.05)
            continue

        tasks = [process_agent_job(job) for job in jobs]

        await asyncio.gather(*tasks, return_exceptions=True)
# =========================
# ENTRYPOINT
# =========================
if __name__ == "__main__":
    asyncio.run(worker_loop())