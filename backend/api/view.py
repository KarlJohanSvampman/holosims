from fastapi import APIRouter

from db import load_world
from api.editor import load_definitions

router = APIRouter()


def in_view(x, y, cx, cy, radius):
    return abs(x - cx) <= radius and abs(y - cy) <= radius


@router.get("/view")
def get_view(
    sim_id: str,
    cx: int,
    cy: int,
    zoom: int = 2
):

    # =========================
    # LOAD WORLD
    # =========================
    world = load_world(sim_id)

    # =========================
    # LOAD DEFINITIONS
    # =========================
    definitions = load_definitions(sim_id)

    # =========================
    # VIEW RADIUS
    # =========================
    radius = {
        1: 25,
        2: 15,
        3: 8
    }.get(zoom, 15)

    # =========================
    # CHARACTERS
    # =========================
    chars = [

        c

        for c in world.get(
            "characters",
            {}
        ).values()

        if in_view(
            c["x"],
            c["y"],
            cx,
            cy,
            radius
        )
    ]

    # =========================
    # PROPS
    # =========================
    props = [

        {
            **p,
            "rotation": p.get(
                "rotation",
                0
            )
        }

        for p in world.get(
            "props",
            []
        )

        if in_view(
            p["x"],
            p["y"],
            cx,
            cy,
            radius
        )
    ]

    # =========================
    # DOORS
    # =========================
    doors = []

    for b in world.get("buildings", []):

        for d in b.get("doors", []):

            if in_view(
                d["x"],
                d["y"],
                cx,
                cy,
                radius
            ):

                doors.append(d)

    # =========================
    # TILES
    # =========================
    tiles = []

    for x in range(
        cx - radius,
        cx + radius + 1
    ):

        for y in range(
            cy - radius,
            cy + radius + 1
        ):

            tiles.append({

                "x": x,
                "y": y,

                "terrain": "floor",

                "walkable": True
            })

    # =========================
    # RESPONSE
    # =========================
    return {

        "center": {
            "x": cx,
            "y": cy
        },

        "zoom": zoom,

        "tiles": tiles,

        "characters": chars,

        "props": props,

        "doors": doors,

        # 🔥 IMPORTANT
        "definitions": definitions
    }