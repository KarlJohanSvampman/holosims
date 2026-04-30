from systems.scheduling import get_current_activity

def select_goal(c):
    scheduled = get_current_activity(c, world)

    if scheduled == "work" and c.get("employed"):
        return "work"

    if scheduled == "sleep":
        return "sleep"

    if scheduled == "eat":
        return "eat"

    if scheduled == "relax":
        return "relax"
    if not c.get("employed"): return {"type":"employment","target":"get_job","priority":1.0}
    if c.get("health",{}).get("conditions"): return {"type":"health","target":"recover","priority":0.95}
    return max(c.get("goals",[]), key=lambda g:g.get("priority",0), default=None)
def heuristic_plan(goal):
    if not goal: return []
    return {"employment":["review_jobs","apply_job","attend_interview"],"wealth":["work_shift","save_money"],"social":["find_person","start_conversation"],"health":["seek_care","rest"]}.get(goal.get("type"),["wait"])
