from llm.decision import decide
async def decide_action(c, world, perception, memories=None): return await decide(c, world, perception, memories or [])
