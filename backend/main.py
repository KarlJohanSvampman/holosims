import asyncio, os
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from core.redis_queue import enqueue
from db import load_world, save_world
from sim_loop import tick
from systems.economy import household_economy

app = FastAPI(title="Sim Society Ultimate")
clients = []

SIM_ID = "default"

frontend_dir = Path(__file__).parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


# 🚀 MAIN LOOP (DB-backed producer)
async def loop():
    while True:
        world = load_world(SIM_ID)

        world["tick"] += 1

        update_world_tick(SIM_ID, world["tick"])

        # enqueue jobs for workers
        for c in list(world.get("characters", {}).values()):
            enqueue({
                "type": "agent_tick",
                "simulation_id": SIM_ID,
                "character_id": c["id"]
            })


        # broadcast updated world to clients
        dead = []
        for ws in clients:
            try:
                await ws.send_json(world)
            except Exception:
                dead.append(ws)

        for ws in dead:
            if ws in clients:
                clients.remove(ws)

        await asyncio.sleep(float(os.getenv("TICK_RATE_SECONDS", "1.0")))

def update_world_tick(sim_id, tick):
    with conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE world
                SET data = jsonb_set(data, '{tick}', to_jsonb(%s::int))
                WHERE simulation_id=%s
            """, (tick, sim_id))

@app.on_event("startup")
async def startup():
    asyncio.create_task(loop())


@app.get("/")
def index():
    path = Path(__file__).parent / "frontend" / "index.html"
    return FileResponse(path) if path.exists() else {"ok": True, "message": "frontend not found"}


# 🔥 API now reads from DB
@app.get("/api/state")
def state():
    return load_world(SIM_ID)


@app.get("/api/household/{household_id}")
def household(household_id: str):
    world = load_world(SIM_ID)
    return household_economy(world, household_id) or {"error": "not found"}


@app.post("/api/config/environment")
def update_environment(payload: dict):
    world = load_world(SIM_ID)
    world.setdefault("environment", {}).update(payload)
    save_world(SIM_ID, world)
    return world["environment"]


@app.get("/api/llm/logs")
def llm_logs():
    world = load_world(SIM_ID)
    return world.get("llm_logs", [])


@app.delete("/api/llm/logs")
def clear_llm_logs():
    world = load_world(SIM_ID)
    world["llm_logs"] = []
    save_world(SIM_ID, world)
    return {"ok": True}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    clients.append(ws)

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in clients:
            clients.remove(ws)