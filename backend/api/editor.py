from fastapi import APIRouter
from db import load_world, save_world

router = APIRouter()

@router.get("/editor/world")
def get_world(sim_id: str):
    return load_world(sim_id)

@router.post("/editor/world")
def save(sim_id: str, data: dict):
    save_world(sim_id, data)
    return {"status": "ok"}