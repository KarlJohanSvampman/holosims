import math


# =========================
# 🧱 FOOTPRINT → WORLD TILES
# =========================
def get_prop_tiles(prop):

    tiles = []

    footprint = prop.get(
        "footprint",
        [{"dx": 0, "dy": 0}]
    )

    rot = prop.get("rotation", 0)

    cos = round(math.cos(rot))
    sin = round(math.sin(rot))

    for t in footprint:

        dx = t["dx"]
        dy = t["dy"]

        rx = dx * cos - dy * sin
        ry = dx * sin + dy * cos

        tiles.append((
            prop["x"] + rx,
            prop["y"] + ry
        ))

    return tiles


# =========================
# 🎯 ANCHOR CHECK
# =========================
def is_anchor_tile(x, y, world):

    for p in world.get("props", []):

        for a in p.get("anchors", []):

            if (x, y) == (a["x"], a["y"]):
                return True

    return False


# =========================
# 🚧 BLOCKED SET
# =========================
def build_blocked_set(world):

    blocked = set()

    # -----------------
    # PROPS (multi-tile)
    # -----------------
    for p in world.get("props", []):

        for (px, py) in get_prop_tiles(p):
            blocked.add((px, py))

    # -----------------
    # DOORS
    # -----------------
    for b in world.get("buildings", []):

        for d in b.get("doors", []):

            if d.get("state", "closed") != "open":
                blocked.add((d["x"], d["y"]))

    # -----------------
    # ACTIVE INTERACTIONS
    # -----------------
    for c in world.get("characters", {}).values():

        act = c.get("activity")

        if not act:
            continue

        prop_id = act.get("prop_id")
        phase = act.get("phase")

        # temporarily block during transitions
        if phase in ["start", "stop"]:

            prop = next(
                (
                    p for p in world.get("props", [])
                    if p["id"] == prop_id
                ),
                None
            )

            if not prop:
                continue

            for (px, py) in get_prop_tiles(prop):
                blocked.add((px, py))

    return blocked


# =========================
# 🚶 WALKABILITY
# =========================
def is_walkable(x, y, world, blocked):

    # allow stepping onto anchors
    if is_anchor_tile(x, y, world):
        return True

    return (x, y) not in blocked