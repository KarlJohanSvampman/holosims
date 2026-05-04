import math

# =========================
# DISTANCE (keep grid logic)
# =========================
def manhattan(a, b):
    return abs(a["x"] - b["x"]) + abs(a["y"] - b["y"])


# =========================
# SCORING (NEW)
# =========================
def score_agent(c, other):
    d = manhattan(c, other)
    score = 1 / (1 + d)

    # relationship influence
    rel = c.get("relationships", {}).get(other["id"], {})
    score += rel.get("trust", 0) * 0.5

    # emotional bias
    if c.get("emotion") in ["angry", "fear"]:
        score *= 1.2

    return score


# =========================
# MAIN PERCEPTION
# =========================
def perceive(c, world, radius=5, max_agents=5):

    # -----------------
    # NEARBY AGENTS (UPGRADED)
    # -----------------
    nearby = []

    for other in world["characters"].values():

        if (
            other["id"] == c["id"]
            or other.get("off_grid")
            or other.get("legal", {}).get("status") == "jailed"
        ):
            continue

        if manhattan(c, other) <= radius and line_of_sight(c, other, world):
            nearby.append(other)

    # 🔥 SORT + LIMIT (NEW)
    scored = [(score_agent(c, o), o) for o in nearby]
    scored.sort(key=lambda x: x[0], reverse=True)

    nearby = [o for _, o in scored[:max_agents]]

    # -----------------
    # MAILBOX (UNCHANGED)
    # -----------------
    mailbox = next(
        (
            m for m in world.get("mailboxes", [])
            if manhattan(m, c) <= 1
        ),
        None
    )

    # -----------------
    # GLOBAL CONTEXT (KEEP — VERY IMPORTANT)
    # -----------------
    news = world.get("news", [])[-3:]

    # 🔥 FILTER LOW-IMPORTANCE NEWS (INSERT HERE)
    news = [
        n for n in news
        if n.get("importance", 0.5) > 0.3
    ]

    events = world.get("events", [])[-3:]
    incidents = world.get("incidents", [])[-3:]

    # -----------------
    # FOCUS (NEW)
    # -----------------
    focus = None

    if nearby:
        focus = nearby[0]["id"]
    elif mailbox:
        focus = mailbox.get("id")

    # -----------------
    # CLEAN OUTPUT
    # -----------------
    return {
        "nearby": [
            {
                "id": o["id"],
                "name": o.get("name"),
                "emotion": o.get("emotion"),
                "x": o.get("x"),
                "y": o.get("y"),
            }
            for o in nearby
        ],
        "mailbox": mailbox,
        "news": news,
        "events": events,
        "incidents": incidents,
        "focus": focus
    }


def line_of_sight(a, b, world):

    x0, y0 = a["x"], a["y"]
    x1, y1 = b["x"], b["y"]

    dx = abs(x1 - x0)
    dy = abs(y1 - y0)

    x, y = x0, y0

    n = 1 + dx + dy
    x_inc = 1 if x1 > x0 else -1
    y_inc = 1 if y1 > y0 else -1

    error = dx - dy
    dx *= 2
    dy *= 2

    blockers = {
        (p["x"], p["y"])
        for p in world.get("props", [])
        if p.get("blocks_los")
    }

    # ALSO include closed doors
    for b in world.get("buildings", []):
        for d in b.get("doors", []):
            if not d.get("is_open", True):
                blockers.add((d["x"], d["y"]))
            
    for _ in range(n):

        if (x, y) in blockers:
            return False

        if error > 0:
            x += x_inc
            error -= dy
        else:
            y += y_inc
            error += dx

    return True