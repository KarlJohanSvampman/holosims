#c["schedule"] = {
#    "weekday": {
#
#        7: "wake_up",
#        8: "go_work",
#       18: "eat",
#        22: "sleep"
#   }
#} 

def schedule_to_intentions(c, world):

    hour = world["calendar"]["hour"]

    if hour in c["schedule"]["weekday"]:

        goal = c["schedule"]["weekday"][hour]

        c["intentions"].append({
            "goal": goal,
            "priority": 70,
            "status": "planned",
            "start_after": world["tick"]
        })