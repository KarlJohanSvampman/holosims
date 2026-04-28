from db import load_world

WORLD = {}

def get_world(sim_id="default"):
    if sim_id not in WORLD:
        WORLD[sim_id] = load_world(sim_id)
    return WORLD[sim_id]