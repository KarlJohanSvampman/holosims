import json
from llm.llm_client import call_llm,call_llm_safe

# =========================
# 🧠 REPLAN LOGIC
# =========================
def should_replan(c, goal):

    # no plan yet
    if not c.get("plan"):
        return True

    current = c.get("plan", {})

    # goal changed
    if current.get("goal") != goal:
        return True

    # plan exhausted
    if not current.get("steps"):
        return True

    return False


# =========================
# ⚡ SIMPLE FALLBACK PLAN
# =========================
def fallback_plan(goal):

    if goal == "eat":
        return {
            "goal": goal,
            "steps": ["go_to_kitchen", "eat"]
        }

    if goal == "sleep":
        return {
            "goal": goal,
            "steps": ["go_home", "sleep"]
        }

    if goal == "toilet":
        return {
            "goal": goal,
            "steps": ["go_to_bathroom", "toilet"]
        }

    if goal == "socialize":
        return {
            "goal": goal,
            "steps": ["find_person", "talk"]
        }

    return {
        "goal": goal,
        "steps": ["idle"]
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
  "steps": ["step1", "step2", "..."]
}}
"""

    try:
        result = await call_ollama([{"role": "user", "content": prompt}])

        if isinstance(result, dict) and "message" in result:
            text = result["message"].get("content", "")
        else:
            text = str(result)

        parsed = json.loads(text)

        # minimal validation
        if "steps" not in parsed:
            return fallback_plan(goal)

        return parsed

    except Exception:
        return fallback_plan(goal)


# =========================
# 🎯 MAIN ENTRY
# =========================
async def generate_plan(c, goal):

    # avoid unnecessary LLM calls
    if not should_replan(c, goal):
        return c.get("plan")

    # ⚡ decide if LLM is worth it
    needs = c.get("needs", {})

    use_llm = True

    # simple goals → no LLM needed
    if goal in ["eat", "sleep", "toilet"]:
        use_llm = False

    # low energy → no planning overhead
    if needs.get("energy", 1) < 0.3:
        use_llm = False

    if use_llm:
        plan = await llm_plan(c, goal)
    else:
        plan = fallback_plan(goal)

    c["plan"] = plan
    return plan