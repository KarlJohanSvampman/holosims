from systems.jobs import generate_job_listings, maybe_fire, apply_for_job, process_interview
from systems.offgrid import maybe_go_offgrid, process_return
from systems.economy import apply_expenses
from systems.market import update_market, produce, consume_households
from systems.events import maybe_generate_shared_event
from systems.emergency import trigger_incident, auto_report_incidents, dispatch, resolve
from systems.law import maybe_arrest_from_incidents, process_trials, process_jail
from systems.health import trigger_health_event, process_health
from systems.politics import process_pending_effects, check_election
from systems.influence import apply_public_figure_influence, apply_social_influence
from systems.media import generate_news
from systems.migration import consider_migration
from systems.story import update_story_arc
from systems.hierarchy import update_hierarchy
from systems.crisis import check_crises, process_crises
from systems.faction_ai import apply_faction_influence
from brain.memory import decay_memories
from brain.beliefs import polarization_drift, compute_alignment
from brain.relationships import first_impression, update_relationship_state

def advance_calendar(world):
    cal=world["calendar"]; cal["minute_of_day"]+=10
    if cal["minute_of_day"]>=1440: cal["minute_of_day"]=0; cal["day"]+=1

def tick(world):
    world["tick"]+=1; advance_calendar(world)
    generate_job_listings(world); process_pending_effects(world)
    update_market(world); produce(world); consume_households(world)
    maybe_generate_shared_event(world); generate_news(world)
    check_crises(world); process_crises(world); check_election(world); apply_faction_influence(world)
    for c in list(world["characters"].values()):
        decay_memories(c); polarization_drift(c); compute_alignment(c)
        maybe_fire(c,world); apply_for_job(c,world); process_interview(c,world)
        maybe_go_offgrid(c,world); process_return(c,world)
        trigger_incident(world,c); trigger_health_event(c,world); process_health(c,world)
        process_jail(c,world); consider_migration(c,world); update_story_arc(c)
        for o in world["characters"].values():
            if o["id"]!=c["id"]: first_impression(c,o); update_relationship_state(c,o)
    auto_report_incidents(world); dispatch(world); resolve(world); maybe_arrest_from_incidents(world); process_trials(world)
    apply_public_figure_influence(world); apply_social_influence(world); update_hierarchy(world); apply_expenses(world)
