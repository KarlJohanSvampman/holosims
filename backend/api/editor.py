from fastapi import APIRouter, Request
from pathlib import Path
import json
from db import load_world, save_world

router = APIRouter()

@router.get("/editor/world")
def get_world(sim_id: str):
    return load_world(sim_id)

@router.post("/editor/world")
def save(sim_id: str, data: dict):
    save_world(sim_id, data)
    return {"status": "ok"}


BASE = Path("/data/simulations")

def defs_path(sim_id):
    return BASE / sim_id / "definitions.json"


# =====================================
# LOAD DEFINITIONS
# =====================================

@router.get("/definitions")
def load_definitions(sim_id: str):

    path = defs_path(sim_id)

    if not path.exists():

        return {
            "prop_templates": {},
            "item_templates": {},
            "character_templates": {},
            "interaction_templates": {},
            "activity_templates": {},
            "tile_templates": {}
        }

    with open(path, "r") as f:
        return json.load(f)


# =====================================
# SAVE DEFINITIONS
# =====================================

@router.post("/definitions")
async def save_definitions(
    sim_id: str,
    request: Request
):

    data = await request.json()

    path = defs_path(sim_id)

    path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    return {"ok": True}