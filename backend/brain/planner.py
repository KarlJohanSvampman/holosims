import json
from llm.llm_client import call_llm, call_llm_safe


OFFGRID_GOALS = {
    "work": "go_work",
    "shopping": "go_shopping",
    "leisure": "go_leisure",
    "interview": "go_interview"
}

# =========================
# 🧠 REPLAN LOGIC
# =========================
def should_replan(c, goal):

    if not c.get("plan"):
        return True

    current = c.get("plan", {})

    if current.get("goal") != goal:
        return True

    if not current.get("steps"):
        return True

    return False


# =========================
# 🧱 ROOM HELPERS
# =========================
def find_room(world, x, y):
    for b in world.get("buildings", []):
        for r in b.get("rooms", []):
            bnd = r["bounds"]
            if bnd["x1"] <= x <= bnd["x2"] and bnd["y1"] <= y <= bnd["y2"]:
                return r, b
    return None, None


def find_door_to_room(building, room):
    for d in building.get("doors", []):
        if room["id"] in d.get("connects", []):
            return d
    return None


# =========================
# 🧠 PROP HELPERS (NEW)
# =========================
def find_nearest_prop(c, world, prop_type):

    best = None
    best_dist = 999999

    for p in world.get("props", []):
        if p.get("type") != prop_type:
            continue

        # 🔥 NEW: skip fully occupied props
        anchors = p.get("interaction", {}).get("anchors", [])

        if anchors:
            if all(a.get("occupied_by") for a in anchors):
                continue

        if not anchor:
            c["plan"] = None
            return

        dist = abs(p["x"] - c["x"]) + abs(p["y"] - c["y"])

        if dist < best_dist:
            best = p
            best_dist = dist

    return best


# =========================
# 🎯 TARGET RESOLUTION (UPDATED)
# =========================
def resolve_goal_target(c, world, goal):

    if goal == "toilet":
        return find_nearest_prop(c, world, "toilet")

    if goal == "eat":
        return find_nearest_prop(c, world, "fridge")

    if goal == "sleep":
        return find_nearest_prop(c, world, "bed")

    return None


# =========================
# ⚡ FALLBACK PLAN (UPGRADED WITH PROPS)
# =========================
def fallback_plan(c, goal, world):

    target = resolve_goal_target(c, world, goal)

    if not target:
        return {
            "goal": goal,
            "steps": [{"name": "wait"}]
        }

    my_room, my_building = find_room(world, c["x"], c["y"])
    tgt_room, tgt_building = find_room(world, target["x"], target["y"])

    steps = []

    # move via door if needed
    if tgt_room and tgt_room != my_room:
        door = find_door_to_room(tgt_building, tgt_room)
        if door:
            steps.append({
                "name": "move",
                "target_tile": {"x": door["x"], "y": door["y"]}
            })

    # move to interaction spot (anchor or tile)
    spot = target.get("interaction", {}).get("spot")

    if spot:
        steps.append({
            "name": "move",
            "target_tile": {"x": spot["x"], "y": spot["y"]}
        })
    else:
        steps.append({
            "name": "move",
            "target_tile": {"x": target["x"], "y": target["y"]}
        })

    # interaction step (CRITICAL: pass prop id)
    action_map = {
        "toilet": "use_toilet",
        "eat": "eat",
        "sleep": "sleep"
    }

    action_name = action_map.get(goal)

    if action_name:
        steps.append({
            "name": action_name,
            "target_prop_id": target["id"]
        })

    return {
        "goal": goal,
        "steps": steps
    }


# =========================
# 🧠 LLM PLAN GENERATION
# =========================
async def llm_plan(c, goal):

    prompt = f"""
You are {c.get("name")}.

Goal:
{goal}

State:
Needs: {c.get("needs")}
Emotion: {c.get("emotion")}

Generate a short plan.

Respond ONLY in JSON:
{{
  "goal": "{goal}",
  "steps": ["step1", "step2"]
}}
"""

    try:
        result = await call_llm([{"role": "user", "content": prompt}])

        if isinstance(result, dict) and "message" in result:
            text = result["message"].get("content", "")
        else:
            text = str(result)

        parsed = json.loads(text)

        if "steps" not in parsed:
            return fallback_plan(c, goal, {})

        return parsed

    except Exception:
        return fallback_plan(c, goal, {})


# =========================
# 🚍 BUS HELPERS
# =========================
def find_nearest_bus_stop(c, world):
    stops = world.get("bus_stops", [])
    if not stops:
        return None

    return min(
        stops,
        key=lambda s: abs(s["x"] - c["x"]) + abs(s["y"] - c["y"])
    )


def plan_transport_to_offgrid(c, world, action_name):

    steps = []

    use_bus = True

    wealth = c.get("wealth", 0)
    if wealth > 500:
        use_bus = False

    if use_bus:
        stop = find_nearest_bus_stop(c, world)

        if stop:
            steps.append({
                "name": "move",
                "target_tile": {"x": stop["x"], "y": stop["y"]}
            })

            steps.append({"name": "wait_bus"})
            steps.append({"name": "board_bus", "destination": action_name})

            return steps

    return [{"name": action_name}]


# =========================
# 🎯 MAIN ENTRY
# =========================
async def generate_plan(c, goal, world):

    if not should_replan(c, goal):
        return c.get("plan")

    # 🚍 transport-aware goals
    if goal in OFFGRID_GOALS:

        action_name = OFFGRID_GOALS[goal]

        steps = plan_transport_to_offgrid(c, world, action_name)

        plan = {
            "goal": goal,
            "steps": steps
        }

        c["plan"] = plan
        return plan

    # 🧠 normal planning
    needs = c.get("needs", {})

    use_llm = True

    if goal in ["eat", "sleep", "toilet"]:
        use_llm = False

    if needs.get("energy", 1) < 0.3:
        use_llm = False

    if use_llm:
        plan = await llm_plan(c, goal)
    else:
        plan = fallback_plan(c, goal, world)

    c["plan"] = plan
    return plan