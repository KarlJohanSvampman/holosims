import math

# =========================
# 🧱 FOOTPRINT → WORLD TILES
# =========================
def get_prop_tiles(prop):
    tiles = []

    footprint = prop.get("footprint", [{"dx": 0, "dy": 0}])
    rot = prop.get("rotation", 0)

    cos = round(math.cos(rot))
    sin = round(math.sin(rot))

    for t in footprint:
        dx, dy = t["dx"], t["dy"]

        rx = dx * cos - dy * sin
        ry = dx * sin + dy * cos

        tiles.append((prop["x"] + rx, prop["y"] + ry))

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
# 🚧 BLOCKED SET (UPGRADED)
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
    # DOORS (state-based)
    # -----------------
    for b in world.get("buildings", []):
        for d in b.get("doors", []):
            if d.get("state", "closed") != "open":
                blocked.add((d["x"], d["y"]))

    return blocked


# =========================
# 🚶 WALKABILITY
# =========================
def is_walkable(x, y, world, blocked):

    # allow stepping on anchor tiles
    if is_anchor_tile(x, y, world):
        return True

    return (x, y) not in blocked