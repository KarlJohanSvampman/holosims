import json
from llm.llm_client import call_llm, call_llm_safe


OFFGRID_GOALS = {
    "work": "go_work",
    "shopping": "go_shopping",
    "leisure": "go_leisure",
    "interview": "go_interview"
}
# =========================
# 🧠 REPLAN LOGIC (UNCHANGED)
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
# 🧱 ROOM HELPERS (NEW)
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
# 🎯 TARGET RESOLUTION (NEW)
# =========================
def resolve_goal_target(world, goal):

    if goal == "toilet":
        for p in world.get("props", []):
            if p.get("type") == "toilet":
                return p

    if goal == "eat":
        for p in world.get("props", []):
            if p.get("type") in ["food", "fridge"]:
                return p

    return None


# =========================
# ⚡ FALLBACK PLAN (UPGRADED)
# =========================
def fallback_plan(c, goal, world):

    target = resolve_goal_target(world, goal)

    if not target:
        return {
            "goal": goal,
            "steps": [{"name": "wait"}]
        }

    my_room, my_building = find_room(world, c["x"], c["y"])
    tgt_room, tgt_building = find_room(world, target["x"], target["y"])

    steps = []

    # 🔥 if different room → go via door
    if tgt_room and tgt_room != my_room:
        door = find_door_to_room(tgt_building, tgt_room)
        if door:
            steps.append({
                "name": "move",
                "target_tile": {"x": door["x"], "y": door["y"]}
            })

    # final step → target
    steps.append({
        "name": "move",
        "target_tile": {"x": target["x"], "y": target["y"]}
    })

    return {
        "goal": goal,
        "steps": steps
    }


# =========================
# 🧠 LLM PLAN GENERATION (UNCHANGED)
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

def find_nearest_bus_stop(c, world):
    stops = world.get("bus_stops", [])
    if not stops:
        return None

    stops.sort(key=lambda s: abs(s["x"] - c["x"]) + abs(s["y"] - c["y"]))
    return stops[0]
# =========================
# 🎯 MAIN ENTRY (UPDATED)
# =========================
async def generate_plan(c, goal, world):

    if not should_replan(c, goal):
        return c.get("plan")

    # =========================
    # 🚍 TRANSPORT-AWARE GOALS
    # =========================
    if goal in OFFGRID_GOALS:

        action_name = OFFGRID_GOALS[goal]

        steps = plan_transport_to_offgrid(c, world, action_name)

        plan = {
            "goal": goal,
            "steps": steps
        }

        c["plan"] = plan
        return plan

    # =========================
    # 🧠 NORMAL LOGIC
    # =========================
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

def plan_transport_to_offgrid(c, world, action_name):

    steps = []

    # decide transport
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

    # fallback → car
    return [{"name": action_name}]