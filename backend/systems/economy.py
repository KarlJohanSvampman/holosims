def apply_expenses(world):
    cal=world.get("calendar",{})
    if cal.get("minute_of_day")!=0 or cal.get("day",1)%7!=0: return
    env=world["environment"]
    for h in world["households"].values():
        utility=60*env.get("power_cost_index",1); food=120*env.get("cost_of_living_index",1); tax=max(0,h.get("wealth",0))*env.get("tax_rate",.25)*.02
        h["weekly_cost"]=round(utility+food+tax,2); h["wealth"]-=h["weekly_cost"]
        if h["wealth"]<0: h["debt"]=h.get("debt",0)+abs(h["wealth"]); h["wealth"]=0
def household_economy(world, household_id):
    h=world["households"].get(household_id)
    if not h: return None
    members=[world["characters"][cid] for cid in h.get("members",[]) if cid in world["characters"]]
    return {**h,"members":[m["name"] for m in members],"tax_rate":world["environment"].get("tax_rate"),"market":world.get("market")}
