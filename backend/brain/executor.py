from collections import deque

from brain.memory import store_memory
from brain.conversation import after_speech, maybe_end
from brain.relationships import apply_interaction
from brain.emotion import apply_emotion_inertia
from systems.offgrid import send_offgrid
from systems.emergency import create_911_call
from systems.activities import update_activity
from systems.payments import attempt_pay_bills
from systems.props import find_nearest_prop,get_prop_by_id
EMOTION_BLOCKS = {
    "fearful": {"smash": "leave", "yell": "leave", "speak": "leave"},
    "sad": {"smash": "relax", "yell": "relax"},
    "awkward": {"smash": "wait", "yell": "wait"},
    "calm": {"smash": "speak", "yell": "speak"},
    "annoyed": {"smash": "yell"},
    "curious": {"smash": "observe"}
}


def find_bus_at_stop(c, world):

    for e in world["entities"].values():

        bus = e["components"].get("bus")
        pos = e["components"].get("position")

        if not bus:
            continue

        if bus["state"] == "stopped":
            if abs(pos["x"] - c["x"]) + abs(pos["y"] - c["y"]) <= 1:
                return {"id": e["id"], "position": pos, "passengers": bus["passengers"]}

    return None

# =========================
# PATHFINDING (NEW)
# =========================
def neighbors(x, y):
    return [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]


def build_blocked(world):
    blocked = set()

    # props (walls etc.)
    for p in world.get("props", []):
        if not p.get("walkable", True):
            blocked.add((p["x"], p["y"]))

    # doors (closed = blocked)
    for b in world.get("buildings", []):
        for d in b.get("doors", []):
            if not d.get("is_open", True):
                blocked.add((d["x"], d["y"]))

    return blocked


def find_path(c, tx, ty, world):
    start = (c["x"], c["y"])
    goal = (tx, ty)

    blocked = build_blocked(world)

    queue = deque([(start, [])])
    visited = {start}

    while queue:
        (x, y), path = queue.popleft()

        if (x, y) == goal:
            return path

        for nx, ny in neighbors(x, y):

            if (nx, ny) in visited:
                continue

            if (nx, ny) in blocked:
                continue

            # stay within grid
            if nx < 0 or ny < 0:
                continue
            if nx >= world["grid"]["width"] or ny >= world["grid"]["height"]:
                continue

            visited.add((nx, ny))
            queue.append(((nx, ny), path + [(nx, ny)]))

    return []


def try_open_door(c, world):
    for b in world.get("buildings", []):
        for d in b.get("doors", []):
            if abs(d["x"] - c["x"]) + abs(d["y"] - c["y"]) == 1:
                if not d.get("is_open"):
                    d["is_open"] = True
                    return True
    return False


# =========================
# TARGET HELPER (UNCHANGED)
# =========================
def _target(c, world, action):
    tid = action.get("target_character_id")
    if tid in world["characters"]:
        return world["characters"][tid]

    others = [
        o for o in world["characters"].values()
        if o["id"] != c["id"] and not o.get("off_grid")
    ]
    others.sort(key=lambda o: abs(o["x"] - c["x"]) + abs(o["y"] - c["y"]))
    return others[0] if others else None


# =========================
# MAIN EXECUTION
# =========================
def execute(c, decision, world):


    if update_activity(c, world):
        return  

    if not decision:
        return

    emotion = decision.get("emotion", c.get("emotion", "calm"))
    apply_emotion_inertia(c, emotion)
    c["emotion"] = emotion
    c["mood"] = emotion

    action = decision.get("action", {})
    name = EMOTION_BLOCKS.get(emotion, {}).get(
        action.get("name", "wait"),
        action.get("name", "wait")
    )

    utterance = (action.get("utterance") or "").strip()

    c["last_action"] = name
    c["internal_thought"] = decision.get("thought", c.get("internal_thought", ""))

    c["is_moving"] = False
    # =========================
    # 🔥 UPDATED MOVEMENT
    # =========================
    if name == "move":

        # try open door first
        if try_open_door(c, world):
            return

        tgt = action.get("target_tile") or {}
        tx = int(tgt.get("x", c["x"]))
        ty = int(tgt.get("y", c["y"]))

        path = find_path(c, tx, ty, world)

        if path:
            nx, ny = path[0]
            c["x"] = nx
            c["y"] = ny
        c["is_moving"] = True
    # =========================
    # SPEECH (UNCHANGED)
    # =========================
    elif name in ["speak", "yell"]:
        if not utterance:
            return

        target = _target(c, world, action)
        if not target:
            return

        c["last_utterance"] = utterance
        c.setdefault("speech_bubbles", []).append({
            "text": utterance,
            "tick": world["tick"]
        })
        c["speech_bubbles"] = c["speech_bubbles"][-4:]

        speech_act = decision.get("speech_act", "statement")
        topic = (
            decision.get("topic")
            or (c.get("conversation") or {}).get("topic")
            or "general"
        )

        after_speech(c, target, float(decision.get("conversation_score", 50)), topic)

        store_memory(
            c, utterance, .55,
            ["conversation", topic, speech_act],
            "conversation", world["tick"],
            target=target["id"], speech_act=speech_act
        )

        store_memory(
            target, utterance, .60,
            ["conversation", topic, speech_act],
            "conversation", world["tick"],
            target=c["id"], speech_act=speech_act
        )

        apply_interaction(c, target, speech_act)

        for kw in decision.get("view_keywords", [])[:8]:
            c.setdefault("views", []).append({
                "subject_id": target["id"],
                "keywords": [kw],
                "sentiment": 0
            })

    # =========================
    # OTHER ACTIONS (UNCHANGED)
    # =========================
    elif name == "leave":
        c["conversation"] = None
        c["x"] = max(0, c["x"] - 1)

    elif name == "go_work":
        c["transport"] = {"mode": "car"}
        send_offgrid(c, world, "work", 40)
    elif name == "go_interview":
        send_offgrid(c, world, "interview", 20)

    elif name == "go_shopping":
        send_offgrid(c, world, "shopping", 18)

    elif name == "go_leisure":
        send_offgrid(c, world, "leisure", 28)

    elif name == "call_911":
        report = utterance or "There is an emergency here."
        create_911_call(world, c, action.get("emergency_type") or "police", report)
        c["last_utterance"] = report

    elif name == "call_phone":
        c["is_on_phone"] = True
        c["last_utterance"] = utterance or "Calling..."

    elif name == "end_call":
        c["is_on_phone"] = False
    elif name == "wait_bus":
        # small delay activity
        c["activity"] = {
            "name": "wait_bus",
            "end_time": world["calendar"]["timestamp"] + 60  # 1 min wait
        }
    elif name == "board_bus":
        bus = find_bus_at_stop(c, world)

        if not bus:
            return

        if not is_adjacent(c, bus["position"]):
            return

        face_target(c, bus["position"])

        bus["passengers"].append(c["id"])

        c["transport"] = {"mode": "bus", "bus_id": bus["id"]}

        send_offgrid(c, world, action.get("destination"), 40)
    elif name == "pay_bills":
        attempt_pay_bills(c, world)
    elif name == "use_toilet":

        prop_id = action.get("target_prop_id")

        prop = get_prop_by_id(world, prop_id)

        if not prop:
            return

        snap_to_anchor(c, prop, "sit")

        c["needs"]["bladder"] = 0    
    else:
        c["last_utterance"] = (
            "..."
            if c.get("conversation") and c["conversation"].get("awaiting") not in [None, c["id"]]
            else ""
        )

    maybe_end(c, world)