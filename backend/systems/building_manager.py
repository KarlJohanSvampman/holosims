from core.definitions import (
    load_definitions
)

from systems.buildings import (
    instantiate_floorplan
)


# =========================================================
# BUILD ALL BUILDINGS
# =========================================================


def build_world_geometry(

    sim_id,

    world
):

    definitions = load_definitions(
        sim_id
    )

    floorplans = definitions.get(
        "floorplan_templates",
        {}
    )

    world_tiles = []
    world_rooms = []
    world_doors = []
    world_windows = []

    for building in world.get(
        "buildings",
        []
    ):

        floorplan_id = building.get(
            "floorplan_id"
        )

        floorplan = floorplans.get(
            floorplan_id
        )

        if not floorplan:
            continue

        runtime = instantiate_floorplan(

            building,

            floorplan
        )

        world_tiles.extend(
            runtime["tiles"]
        )

        world_rooms.extend(
            runtime["rooms"]
        )

        world_doors.extend(
            runtime["doors"]
        )

        world_windows.extend(
            runtime["windows"]
        )

    world["runtime_tiles"] = world_tiles

    world["runtime_rooms"] = world_rooms

    world["runtime_doors"] = world_doors

    world["runtime_windows"] = world_windows