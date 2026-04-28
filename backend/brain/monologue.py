from llm.llm_client import call_llm,call_llm_safe


# =========================
# 🧠 THINKING GATE
# =========================
def should_think(c):

    needs = c.get("needs", {})

    # survival mode = no thinking
    if needs.get("hunger", 0) > 0.7:
        return False

    if needs.get("energy", 1) < 0.3:
        return False

    # already executing plan
    if c.get("plan"):
        return False

    return True


# =========================
# 🧠 INTERNAL MONOLOGUE
# =========================
async def think(c, perception, memories):

    # skip LLM most of the time
    if not should_think(c):
        return "..."

    prompt = f"""
You are {c.get("name")}.

Perception:
{perception}

Memories:
{memories}

Describe your current internal thoughts briefly.
"""

    try:
        result = await call_llm([{"role": "user", "content": prompt}])

        if isinstance(result, dict) and "message" in result:
            return result["message"].get("content", "")

        return str(result)

    except Exception:
        return "..."