import { useState, useEffect, useRef, useCallback } from "react";

const SCHEMA_VERSION = "1.0";
const PRODUCT_VERSION = "ppps_v1";
const STORAGE_KEY = "ppps_session_v1";

const NAVY = "#1B2B4B";
const AMBER = "#C9974A";
const AMBER_LIGHT = "#FDF6E8";
const SLATE = "#4A5568";
const RULE = "#E2DDD6";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function initSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.schema_version === SCHEMA_VERSION) return parsed;
    }
  } catch(e) {}
  return {
    user_id: generateId(),
    session_id: generateId(),
    product_id: "ppps",
    product_version: PRODUCT_VERSION,
    schema_version: SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active_section: "intro",
    last_active_tab: "learn",
    completion_status: "not_started",
    completed_at: null,
    quick_notes: "",
    answers: {},
  };
}

const SECTIONS = [
  { id: "intro",          label: "Introduction",                        short: "Introduction",          layer: "orientation" },
  { id: "process",        label: "How Parenting Plans Are Developed",   short: "How Plans Develop",     layer: "orientation" },
  { id: "timesharing",    label: "Physical Custody",                    short: "Physical Custody",      layer: "core" },
  { id: "holidays",       label: "Holidays & Special Days",             short: "Holidays",              layer: "core" },
  { id: "legalcustody",   label: "Legal Custody",                       short: "Legal Custody",         layer: "core" },
  { id: "edmedact",       label: "Education / Medical / Activities",    short: "Ed / Med / Activities", layer: "core" },
  { id: "transportation", label: "Transportation & Exchanges",          short: "Transportation",        layer: "core" },
  { id: "communication",  label: "Communication Provisions",            short: "Communication",         layer: "core" },
  { id: "pitfalls",       label: "Common Drafting Pitfalls",            short: "Drafting Pitfalls",     layer: "core" },
  { id: "modification",   label: "Modification & Dispute Resolution",   short: "Modification",          layer: "core" },
  { id: "negotiation",    label: "Negotiation Reality",                 short: "Negotiation",           layer: "core" },
  { id: "additional",     label: "Additional Considerations",           short: "Additional Provisions", layer: "awareness" },
  { id: "closing",        label: "Closing Reflection",                  short: "Closing",               layer: "closing" },
];

const LAYER_LABELS = {
  orientation: "Orientation",
  core: "Core Parenting Plan",
  awareness: "Additional Considerations",
  closing: "Closing",
};

const SECTION_TABS = {
  intro:          ["learn"],
  process:        ["learn", "reflect"],
  timesharing:    ["learn", "compare", "reflect"],
  holidays:       ["learn", "explore", "reflect"],
  legalcustody:   ["learn", "compare", "reflect"],
  edmedact:       ["learn", "reflect"],
  transportation: ["learn", "reflect"],
  communication:  ["learn", "reflect"],
  pitfalls:       ["learn", "reflect"],
  modification:   ["learn", "reflect"],
  negotiation:    ["learn", "reflect"],
  additional:     ["learn", "reflect"],
  closing:        ["reflect"],
};

const TAB_LABELS = { learn: "Learn", compare: "Compare", explore: "Explore", reflect: "Reflect" };

const QUESTIONS = {
  process: [
    { id: "process_temporary_arrangements",     text: "Are temporary arrangements already in place? How are they functioning?" },
    { id: "process_current_stage",              text: "Where are you in the process right now?" },
    { id: "process_what_feels_unclear",         text: "What about the process feels most unclear or uncertain?" },
    { id: "process_questions_for_professional", text: "What questions do you want to raise with a professional about the process itself?" },
  ],
  timesharing: [
    { id: "timesharing_schedule_structure",       text: "What schedule structure is being considered?" },
    { id: "timesharing_transition_frequency",     text: "How often will transitions occur?" },
    { id: "timesharing_school_week",              text: "How might this schedule function during school weeks?" },
    { id: "timesharing_weekends",                 text: "How might it function during weekends?" },
    { id: "timesharing_weekday_child_experience", text: "What would you want a typical weekday to look like for your child in each home?" },
    { id: "timesharing_weekend_child_experience", text: "What would you want a typical weekend to look like?" },
    { id: "timesharing_transition_impact",        text: "How might the frequency of transitions affect routines?" },
    { id: "timesharing_travel_time",              text: "How might travel time affect daily life?" },
    { id: "timesharing_what_feels_clear",         text: "What feels clear about this structure?" },
    { id: "timesharing_needs_discussion",         text: "What needs further thought or discussion?" },
  ],
  holidays: [
    { id: "holidays_important_to_you",          text: "Which holidays feel most important to you?" },
    { id: "holidays_alternated_fixed_divided",  text: "Which holidays might be alternated, fixed, or divided?" },
    { id: "holidays_school_breaks",             text: "How would you like school breaks to be structured?" },
    { id: "holidays_extended_time",             text: "Would extended parenting time during certain periods work for your situation?" },
    { id: "holidays_routine_differences",       text: "How might holiday schedules differ from your regular routine?" },
    { id: "holidays_logistical_considerations", text: "What logistical considerations may arise during these times?" },
    { id: "holidays_what_feels_clear",          text: "What feels straightforward?" },
    { id: "holidays_needs_discussion",          text: "What may require additional discussion?" },
  ],
  legalcustody: [
    { id: "legalcustody_how_decisions_made",       text: "How will major decisions be made?" },
    { id: "legalcustody_areas_needing_discussion", text: "Which areas may require more discussion: education, medical, religious upbringing, activities?" },
    { id: "legalcustody_difficult_agreement",      text: "What situations might make agreement more difficult?" },
    { id: "legalcustody_disagreement_handling",    text: "How might disagreements be addressed if they arise?" },
    { id: "legalcustody_daily_routine_impact",     text: "How might decision-making affect daily routines and expectations?" },
    { id: "legalcustody_what_feels_clear",         text: "What feels clear about decision-making?" },
    { id: "legalcustody_what_remains_uncertain",   text: "What remains uncertain?" },
  ],
  edmedact: [
    { id: "edmedact_information_sharing",               text: "How will information be shared between parents?" },
    { id: "edmedact_staying_informed",                  text: "How will both parents stay informed about school, medical care, and activities?" },
    { id: "edmedact_scheduling_management",             text: "Who will schedule and manage appointments or commitments?" },
    { id: "edmedact_cross_household_responsibilities",  text: "How will responsibilities be handled across households?" },
    { id: "edmedact_schedule_differences_impact",       text: "How might differences in schedules or expectations affect coordination?" },
    { id: "edmedact_what_feels_manageable",             text: "What areas feel manageable?" },
    { id: "edmedact_needs_planning",                    text: "What areas require more planning or clarity?" },
  ],
  transportation: [
    { id: "transportation_exchange_locations",   text: "Where will exchanges take place?" },
    { id: "transportation_school_vs_nonschool",  text: "How will exchanges occur during school days versus non-school days?" },
    { id: "transportation_responsibility",       text: "Who will be responsible for transportation?" },
    { id: "transportation_travel_time_impact",   text: "How will travel time affect routines?" },
    { id: "transportation_delays_handling",      text: "How will delays or unexpected changes be handled?" },
    { id: "transportation_child_experience",     text: "What will transitions feel like for your child?" },
    { id: "transportation_consistency_factors",  text: "What may help make transitions more consistent?" },
  ],
  communication: [
    { id: "communication_preferred_method",  text: "What method of communication feels most workable?" },
    { id: "communication_primary_platform",  text: "Will a primary communication platform be used?" },
    { id: "communication_frequency",         text: "How often will communication occur?" },
    { id: "communication_important_updates", text: "How will important updates be shared?" },
    { id: "communication_urgent_situations", text: "How will communication occur in urgent situations?" },
    { id: "communication_child_contact",     text: "How will your child communicate with each parent?" },
    { id: "communication_what_feels_clear",  text: "What feels clear about communication expectations?" },
    { id: "communication_needs_discussion",  text: "What may need further discussion?" },
  ],
  pitfalls: [
    { id: "pitfalls_vague_language",             text: "Are there provisions that rely on vague terms like 'reasonable' or 'as agreed' without further definition?" },
    { id: "pitfalls_overly_rigid",               text: "Are there areas where the plan feels highly specific but may be difficult to apply if circumstances change?" },
    { id: "pitfalls_reactive_provisions",        text: "Are any provisions tied to a specific concern or past disagreement that may not persist over time?" },
    { id: "pitfalls_unenforceable_expectations", text: "Are there expectations that may be difficult to measure or enforce in practice?" },
    { id: "pitfalls_logistical_gaps",            text: "Are there areas where logistical details are not fully defined?" },
    { id: "pitfalls_what_feels_clear",           text: "Where does the structure feel clear and easy to apply?" },
    { id: "pitfalls_needs_clarity",              text: "Where might additional clarity or discussion be needed?" },
  ],
  modification: [
    { id: "modification_likely_changes",           text: "What types of changes might occur over time?" },
    { id: "modification_plan_impact",              text: "How could those changes affect the parenting plan?" },
    { id: "modification_discussion_process",       text: "How will proposed changes be discussed?" },
    { id: "modification_no_agreement",             text: "What happens if agreement cannot be reached?" },
    { id: "modification_stability_during_dispute", text: "How will stability be maintained during periods of disagreement?" },
    { id: "modification_what_feels_manageable",    text: "What feels manageable about this process?" },
    { id: "modification_what_feels_uncertain",     text: "What feels uncertain?" },
  ],
  negotiation: [
    { id: "negotiation_straightforward_parts", text: "Which parts of the parenting plan feel more straightforward?" },
    { id: "negotiation_needs_more_time",       text: "Which parts may require more time or discussion?" },
    { id: "negotiation_section_interactions",  text: "How might different sections of the plan influence one another?" },
    { id: "negotiation_remaining_questions",   text: "What questions or uncertainties remain?" },
  ],
  additional: [
    { id: "additional_travel",                text: "Are travel provisions likely to be relevant to your situation?" },
    { id: "additional_passport",              text: "Have passport control and international travel been considered?" },
    { id: "additional_rofr",                  text: "Is right of first refusal something you want to discuss?" },
    { id: "additional_new_relationships",     text: "Are provisions around new relationships or household changes something your plan should address?" },
    { id: "additional_extracurricular_costs", text: "How might extracurricular cost-sharing be handled across households?" },
    { id: "additional_technology",            text: "Are technology, device use, or social media provisions relevant to your situation?" },
    { id: "additional_what_applies",          text: "Which of these provisions feel most relevant to your family's situation?" },
    { id: "additional_professional_questions",text: "Which of these topics do you want to make sure you raise with a professional?" },
  ],
  closing: [
    { id: "closing_what_feels_clear",        text: "Looking across all sections, what feels most clear?" },
    { id: "closing_needs_guidance",          text: "What areas still need further thought or professional guidance?" },
    { id: "closing_questions_to_raise",      text: "What questions do you most want to raise with an attorney, mediator, or other professional?" },
    { id: "closing_prepared_client_meaning", text: "What does being a prepared participant mean to you as you enter this process?" },
  ],
};

const DAYS_28 = ["M","T","W","T","F","S","S","M","T","W","T","F","S","S","M","T","W","T","F","S","S","M","T","W","T","F","S","S"];

const SCHEDULES = [
  {
    id: "223", name: "2-2-3 Schedule", type: "Equal time-sharing",
    pattern14: [0,0,1,1,0,0,0,1,1,0,0,1,1,1],
    use28: false,
    transitions: "Multiple times per week",
    bestFor: "Families living close together; children who adapt easily to frequent exchanges",
    helpsWorkWell: [
      "Maintain consistent bedtime and school preparation routines across both homes.",
      "Minimize the need to move essential items. Duplicate sets of commonly used items reduce disruption.",
      "Keep exchange times and locations predictable.",
      "Communicate regularly about schedules, activities, and the child's week.",
    ],
    childPerspective: [
      "Frequent transitions may require the child to repeatedly shift between household routines throughout the week. As the pattern becomes familiar, the predictability of the schedule can help reduce uncertainty.",
      "Having familiar items available in both homes and vehicles may help the child feel grounded across frequent transitions. School materials, clothing, and medications may need to be duplicated between households.",
      "When routines such as bedtime and homework are consistent across both homes, the child is less likely to experience the frequency of exchanges as disorienting.",
      "The child stays in regular physical contact with both parents throughout the week, regardless of how contact is also maintained during the other parent's time.",
    ],
    coordination: "Frequent exchanges mean both parents need to manage consistent routines, homework, bedtime, school preparation, and stay in close communication about the child's week.",
    considerations: "How easily exchanges fit into school mornings, activities, and evening routines depends significantly on the distance between households and real-world commute conditions. The pace of this schedule means differences between households are felt regularly.",
    example: "The parties shall share physical custody of the child on a 2-2-3 rotating schedule. Parent A shall have parenting time each Monday and Tuesday. Parent B shall have parenting time each Wednesday and Thursday. The parties shall alternate weekends from Friday through Sunday, with the schedule reversing the following week. Exchanges shall occur at [time] and [location] unless otherwise agreed.",
  },
  {
    id: "2255", name: "2-2-5-5 Schedule", type: "Equal time-sharing",
    pattern14: null,
    pattern28: [0,0,1,1,0,0,0,0,0,1,1,0,0,0,1,1,0,0,1,1,1,1,1,0,0,1,1,1],
    use28: true,
    transitions: "Varied, short intervals alternate with longer blocks",
    bestFor: "Families wanting consistent weekday involvement with some extended blocks",
    helpsWorkWell: [
      "Understand the repeating pattern clearly. Both parents and the child benefit from knowing what comes next.",
      "Consistent handling of responsibilities across both households reduces friction as the pattern shifts.",
      "Predictable weekday routines give the child stability within the varying block lengths.",
      "Clear communication as the schedule shifts between shorter and extended blocks reduces confusion for everyone.",
    ],
    childPerspective: [
      "Exchanges follow a predictable but varied pattern. Both short stays and longer stays are part of the routine.",
      "Each parent has consistent involvement in weekday routines.",
      "Extended time allows deeper immersion in each household's rhythm before returning to the other.",
      "The pattern requires tracking but becomes familiar over time.",
    ],
    coordination: "Both parents need to track the repeating pattern and communicate clearly, particularly as the schedule shifts between shorter and longer blocks.",
    considerations: "The structure is more complex than a simple weekly alternation. How easily exchanges fit into daily routines depends on distance and real-world commute conditions.",
    example: "Parent A shall have parenting time each Monday and Tuesday. Parent B shall have parenting time each Wednesday and Thursday. The parties shall alternate extended parenting time from Friday through Tuesday on a rotating basis. Exchanges shall occur at [time] and [location] unless otherwise agreed.",
  },
  {
    id: "wowo", name: "Week On / Week Off", type: "Equal time-sharing",
    pattern14: [0,0,0,0,0,0,0,1,1,1,1,1,1,1],
    use28: false,
    transitions: "Once per week",
    bestFor: "Families with some distance between homes; children who do better with longer, uninterrupted blocks",
    helpsWorkWell: [
      "Equip each household to support the child's full weekly routine independently.",
      "Keep expectations consistent and ensure both homes have what is needed for a full week. Having duplicates of essentials, clothing, medications, favorite items, matters more with this structure.",
      "Define how the child stays in contact with the other parent during the off week.",
      "Share school updates, medical information, and activity schedules across the weekly handoff.",
    ],
    childPerspective: [
      "Several days may pass without seeing the other parent in person, which makes consistent communication during the off week more important.",
      "Exchanges between homes may feel more distinct because of the length of each stay.",
      "Each household's routines are experienced in longer, uninterrupted blocks.",
    ],
    coordination: "Coordination is less frequent but what happens at the weekly handoff matters. Sharing school updates, medical information, and activity schedules keeps both parents informed and reduces gaps.",
    considerations: "Longer blocks affect how the child experiences time away from the other parent. How easily weekly exchanges align with school and activities depends on the distance between households and real commute conditions.",
    example: "The parties shall share physical custody of the child on a week-on/week-off basis. Parent A shall have parenting time for one full week beginning Monday at [time], followed by Parent B for the subsequent week. Exchanges shall occur at [time] and [location] unless otherwise agreed.",
  },
  {
    id: "altweekends", name: "Alternating Weekends", type: "Unequal time-sharing",

    use28: true,
    pattern28: [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    transitions: "Biweekly weekends, plus possible weekday time",
    bestFor: "When one parent has primary residence; the other maintains consistent scheduled involvement",
    helpsWorkWell: [
      "Keep expectations around meals, bedtime, and daily routines consistent across both households, not just within each one.",
      "Plan deliberately for how the non-primary parent stays connected during weekday periods, through calls, attendance at school events, or other touchpoints.",
      "Communicate regularly about school, activities, and schedule changes so neither parent is caught off guard.",
      "Maintain meaningful involvement from both parents in the child's routines and activities, even when time is not equally distributed.",
    ],
    childPerspective: [
      "The predictability of the pattern can provide a sense of stability, the child knows when they will see each parent.",
      "Weekday life is centered in one home, which can create consistency in school routines, friendships, and daily structure.",
      "The rhythm between weekday and weekend time is distinct. Maintaining connection with the non-primary parent during the week, through calls, messages, or brief contact, supports the child's relationship with both parents.",
    ],
    coordination: "Fewer exchanges mean less frequent coordination, but maintaining the child's connection to both parents requires deliberate planning and regular communication between handoffs.",
    considerations: "Time is not distributed equally and responsibilities are concentrated differently between households. Additional planning is required to maintain continuity and ensure the child remains connected to both parents.",
    example: "The child shall reside primarily with Parent A. Parent B shall have parenting time on alternating weekends from Friday at [time] until Sunday at [time], and each [weekday] from [time] to [time]. Exchanges shall occur at [location] unless otherwise agreed.",
  },
  {
    id: "workbased", name: "Work-Based Schedule", type: "Non-traditional",
    pattern14: [0,0,0,0,0,0,0,1,1,1,1,0,0,0],
    use28: false,
    noGrid: true,
    gridDescription: "Work-based schedules vary by profession and work cycle. Rather than a fixed weekly pattern, parenting time is structured around when each parent is available. The visual below represents one possible cycle, the actual pattern depends on each parent's work schedule.",
    transitions: "Tied to work cycles, not fixed days of the week",
    bestFor: "Maritime, healthcare, aviation, emergency services, long-haul transportation, or other rotating-shift professions",
    helpsWorkWell: [
      "Share work schedules in advance and communicate changes as early as possible.",
      "Build flexibility provisions directly into the parenting plan language.",
      "Plan around the child's school and activity schedule when work cycles shift.",
      "Define what advance notice looks like in practice.",
    ],
    childPerspective: [
      "Variation in the schedule may initially seem unpredictable, but a rhythm often emerges for the child over time as the work cycle becomes familiar.",
      "Communication with the non-timesharing parent may be less predictable during work periods due to the demands and location of that parent's job.",
      "The parent who is home between work cycles often has greater flexibility to be fully present, which can make that time feel more immersive for the child.",
    ],
    coordination: "Communication with the non-timesharing parent during work periods may need coordination, since the working parent's availability may be limited. Establishing how the child can stay in contact during those periods, and how schedule changes are communicated when they occur, reduces uncertainty for the child and both parents.",
    considerations: "Work-based schedules are less predictable and require more ongoing coordination than fixed-day structures. Plans for these arrangements benefit significantly from explicit language around advance notice requirements, flexibility expectations, and how schedule changes are communicated and documented.",
    example: "The parties shall share physical custody based on Parent A's work schedule. Parent A shall provide advance notice of work periods and available parenting time no later than [X] days in advance. Parenting time shall occur during periods of availability, with the child residing with Parent B during work periods. The parties shall coordinate scheduling to maintain consistency for the child.",
  },
];

function ScheduleGrid({ pattern14, pattern28, use28 }) {
  const DAYS_14 = ["M","T","W","T","F","S","S","M","T","W","T","F","S","S"];

  if (use28 && pattern28) {
    // Stack 28-day grid as two rows of 14
    const row1 = pattern28.slice(0,14);
    const row2 = pattern28.slice(14,28);
    const renderRow = (pat, wkStart) => (
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        {pat.map((v,i) => (
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
            <div style={{width:27,height:27,borderRadius:4,background:v===0?NAVY:AMBER,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,color:"#fff"}}>{DAYS_14[i]}</div>
            {i===0?<div style={{fontSize:7,color:SLATE}}>Wk{wkStart}</div>:<div style={{fontSize:7,color:"transparent"}}>.</div>}
          </div>
        ))}
      </div>
    );
    return (
      <div style={{marginTop:12}}>
        {renderRow(row1,1)}
        {renderRow(row2,3)}
        <div style={{display:"flex",gap:16,marginTop:6,fontSize:11,color:SLATE}}>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:NAVY,display:"inline-block"}}></span>Parent A</span>
          <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:AMBER,display:"inline-block"}}></span>Parent B</span>
        </div>
      </div>
    );
  }

  const pattern = pattern14 || [];
  return (
    <div style={{marginTop:12}}>
      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
        {DAYS_14.map((d,i) => (
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{width:28,height:28,borderRadius:4,background:pattern[i]===0?NAVY:AMBER,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,color:"#fff"}}>{d}</div>
            {i===0?<div style={{fontSize:8,color:SLATE}}>Wk1</div>:i===7?<div style={{fontSize:8,color:SLATE}}>Wk2</div>:<div style={{fontSize:8,color:"transparent"}}>.</div>}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:16,marginTop:8,fontSize:11,color:SLATE}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:NAVY,display:"inline-block"}}></span>Parent A</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:2,background:AMBER,display:"inline-block"}}></span>Parent B</span>
      </div>
    </div>
  );
}

function Orientation({ children }) {
  return (
    <div style={{borderLeft:`3px solid ${AMBER}`,paddingLeft:20,marginBottom:26}}>
      <div style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:15,lineHeight:1.85,color:NAVY,fontStyle:"italic"}}>{children}</div>
    </div>
  );
}

function SH({ children }) {
  return <div style={{fontSize:13,fontWeight:600,color:NAVY,margin:"22px 0 7px",letterSpacing:"0.02em"}}>{children}</div>;
}

function P({ children }) {
  return <p style={{fontSize:13.5,color:SLATE,lineHeight:1.8,margin:"0 0 11px"}}>{children}</p>;
}

function ChildPerspective({ items, showHeader=true }) {
  return (
    <div style={{background:NAVY,borderRadius:10,padding:"15px 18px",margin:"18px 0"}}>
      {showHeader&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(201,151,74,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:11,color:AMBER}}>◎</span>
        </div>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:AMBER}}>WHAT THIS LOOKS LIKE FROM THE CHILD'S PERSPECTIVE</div>
      </div>}
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",gap:9,marginBottom:i<items.length-1?7:0}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:AMBER,marginTop:8,flexShrink:0}}></div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.87)",lineHeight:1.7}}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function HelpsWorkWell({ items, showHeader=true }) {
  return (
    <div style={{background:"#F5F9F5",border:"1px solid #C8DFC8",borderRadius:8,padding:"13px 16px",margin:"12px 0"}}>
      {showHeader&&<div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"#4A7A4A",marginBottom:7}}>WHAT HELPS THIS WORK WELL</div>}
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",gap:8,fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:i<items.length-1?3:0}}>
          <span style={{color:"#4A7A4A",flexShrink:0}}>+</span><span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CoordBlock({ intro, items, showHeader=true }) {
  return (
    <div style={{background:"#F0F4F8",borderRadius:8,padding:"13px 16px",margin:"12px 0"}}>
      {showHeader&&<div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:SLATE,marginBottom:7}}>COORDINATION AND COMMUNICATION</div>}
      {intro&&<div style={{fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:8,fontStyle:"italic"}}>{intro}</div>}
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",gap:8,fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:i<items.length-1?3:0}}>
          <span style={{color:AMBER,flexShrink:0}}>, </span><span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function ConsiderBlock({ children, showHeader=true }) {
  return (
    <div style={{border:`1px solid ${RULE}`,borderRadius:8,padding:"13px 16px",margin:"12px 0",background:"#fff"}}>
      {showHeader&&<div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"#999",marginBottom:7}}>CONSIDERATIONS</div>}
      <div style={{fontSize:13,color:SLATE,lineHeight:1.8}}>{children}</div>
    </div>
  );
}

function ExampleBlock({ children, showHeader=true }) {
  return (
    <div style={{background:"#EEF2FF",borderRadius:8,padding:"13px 16px",margin:"12px 0"}}>
      {showHeader&&<div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"#6B7DB3",marginBottom:7}}>EXAMPLE LANGUAGE, FOR REFERENCE ONLY</div>}
      <div style={{fontSize:12.5,color:"#3D4E7A",lineHeight:1.75,fontStyle:"italic"}}>{children}</div>
    </div>
  );
}

function SectionDivider() {
  return <div style={{height:1,background:RULE,margin:"24px 0"}}></div>;
}

function CommonQs({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={{margin:"18px 0"}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:SLATE,marginBottom:9}}>QUESTIONS PARENTS COMMONLY ASK</div>
      {items.map((item,i) => (
        <div key={i} style={{borderBottom:`1px solid ${RULE}`}}>
          <div onClick={()=>setOpen(open===i?null:i)} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",cursor:"pointer"}}>
            <div style={{fontSize:11,color:AMBER,flexShrink:0,transform:open===i?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none"}}>▶</div>
            <div style={{fontSize:13,color:NAVY,fontWeight:500,lineHeight:1.4}}>{item.q}</div>
          </div>
          {open===i&&<div style={{fontSize:13,color:SLATE,lineHeight:1.75,paddingBottom:12,paddingLeft:20}}>{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

function KeyTakeaways({ items }) {
  return (
    <div style={{background:NAVY,borderRadius:10,padding:"15px 18px",margin:"22px 0 0"}}>
      <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:AMBER,marginBottom:11}}>KEY TAKEAWAYS</div>
      {items.map((item,i) => (
        <div key={i} style={{display:"flex",gap:9,marginBottom:i<items.length-1?7:0}}>
          <div style={{color:AMBER,fontSize:13,flexShrink:0,marginTop:1}}>✓</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.87)",lineHeight:1.65}}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSubsection({ label, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{marginTop:10}}>
      <div onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 0",cursor:"pointer"}}>
        <div style={{fontSize:11,color:AMBER,flexShrink:0,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none"}}>▶</div>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:open?SLATE:"#aaa"}}>{label}</div>
      </div>
      {open&&<div style={{marginTop:2}}>{children}</div>}
    </div>
  );
}

function ScheduleCardContent({ s }) {
  return (
    <div style={{padding:"0 17px 18px"}}>
      {s.noGrid
        ? <div style={{background:"#f8f7f5",borderRadius:8,padding:"12px 16px",margin:"12px 0",fontSize:13,color:SLATE,lineHeight:1.7}}>{s.gridDescription}</div>
        : <ScheduleGrid pattern14={s.pattern14} pattern28={s.pattern28} use28={s.use28} />
      }
      <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div style={{background:"#f8f7f5",borderRadius:8,padding:"9px 12px"}}>
          <div style={{fontSize:10,fontWeight:600,color:AMBER,marginBottom:3}}>TRANSITIONS</div>
          <div style={{fontSize:12.5,color:SLATE}}>{s.transitions}</div>
        </div>
        <div style={{background:"#f8f7f5",borderRadius:8,padding:"9px 12px"}}>
          <div style={{fontSize:10,fontWeight:600,color:AMBER,marginBottom:3}}>WORKS BEST FOR</div>
          <div style={{fontSize:12.5,color:SLATE}}>{s.bestFor}</div>
        </div>
      </div>
      <CollapsibleSubsection label="WHAT THIS LOOKS LIKE FROM THE CHILD'S PERSPECTIVE">
        <ChildPerspective items={s.childPerspective} showHeader={false} />
      </CollapsibleSubsection>
      <CollapsibleSubsection label="WHAT HELPS THIS WORK WELL">
        <HelpsWorkWell items={s.helpsWorkWell} showHeader={false} />
      </CollapsibleSubsection>
      <CollapsibleSubsection label="COORDINATION AND COMMUNICATION">
        <CoordBlock intro={null} items={[s.coordination]} showHeader={false} />
      </CollapsibleSubsection>
      <CollapsibleSubsection label="CONSIDERATIONS">
        <ConsiderBlock showHeader={false}>{s.considerations}</ConsiderBlock>
      </CollapsibleSubsection>
      <CollapsibleSubsection label="EXAMPLE LANGUAGE">
        <ExampleBlock showHeader={false}>{s.example}</ExampleBlock>
      </CollapsibleSubsection>
    </div>
  );
}

function ReflectSection({ sectionId, session, onAnswer, onFlag }) {
  const questions = QUESTIONS[sectionId] || [];
  const answered = questions.filter(q => (session.answers[q.id]||"").trim().length > 0).length;
  const topRef = useRef(null);
  useEffect(() => { if (topRef.current) topRef.current.scrollIntoView({behavior:"smooth"}); }, [sectionId]);
  return (
    <div ref={topRef}>
      <Orientation>These questions are here to help you think, not to evaluate your answers. There is no wrong direction, only your situation, your priorities, and what matters most to you as you move through this process.</Orientation>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <P>Work through these at your own pace. Return to any question at any time. Your answers build your preparation document.</P>
        <div style={{fontSize:13,color:AMBER,fontWeight:500,whiteSpace:"nowrap",marginLeft:16}}>{answered}/{questions.length} answered</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {questions.map((q) => {
          const val = session.answers[q.id] || "";
          const flagged = session.answers[q.id+"__flag"] || false;
          return (
            <div key={q.id} style={{padding:"15px 17px",border:`1px solid ${flagged?AMBER:RULE}`,borderRadius:8,background:flagged?AMBER_LIGHT:"#fff"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div style={{fontSize:13.5,color:NAVY,fontWeight:500,lineHeight:1.5,flex:1}}>{q.text}</div>
                <button tabIndex={-1} onClick={()=>onFlag(q.id,!flagged)} title={flagged?"Remove flag":"Flag for discussion"} style={{marginLeft:11,background:"none",border:"none",cursor:"pointer",fontSize:15,color:flagged?AMBER:"#ccc",padding:0,lineHeight:1,flexShrink:0}}>⚑</button>
              </div>
              <textarea value={val} onChange={e=>onAnswer(q.id,e.target.value)} placeholder="Your thoughts..." rows={3} style={{width:"100%",border:`1px solid ${RULE}`,borderRadius:6,padding:"9px 11px",fontSize:13,color:SLATE,fontFamily:"Inter,sans-serif",resize:"vertical",background:"#fafaf9",boxSizing:"border-box",outline:"none"}} />
              {flagged&&<div style={{fontSize:11,color:AMBER,marginTop:5,fontWeight:500}}>⚑ Flagged for discussion</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HowToUsePanel() {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const coreFeatures = [
    ["Learn tab", "Educational content for each topic, how that part of a parenting plan works, what it looks like in practice, and what to watch for."],
    ["Compare or Explore tab", "Interactive comparisons of different approaches and structures. Multiple items can be open at the same time."],
    ["Reflect tab", "Guided questions that capture your thoughts and build your preparation document as you go."],
  ];

  const additionalFeatures = [
    ["Quick Notes", "A freeform notes field in the bottom right of the progress panel. Park thoughts as they occur, questions to raise, things to follow up on."],
    ["Flag for Discussion", "Within each reflection question, the flag icon marks that item for your discussion list. Flagged items surface at the top of your preparation summary."],
    ["Your Summary", "The button in the top right assembles everything you have answered into a preparation document you can review, print, or save as a PDF."],
    ["Progress Tracking", "The right panel shows your overall progress and per-section completion. It can be collapsed using the Progress button if you want a full-width workspace."],
    ["Collapsible Sections", "Within each section, subsections can be collapsed individually using the arrow on the left. They open by default, collapse them once you are familiar with the content."],
  ];

  return (
    <div style={{border:`1px solid ${RULE}`,borderRadius:8,overflow:"hidden",margin:"0 0 20px"}}>
      <div
        onClick={()=>setOpen(!open)}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",cursor:"pointer",background:open?"#f8f7f5":"#fff"}}
      >
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:AMBER,transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",display:"inline-block",lineHeight:1}}>▶</span>
          <span style={{fontSize:13,fontWeight:600,color:NAVY}}>What's Included in This System</span>
        </div>
        <span style={{fontSize:11,color:SLATE}}>{open?"Hide":"Show features"}</span>
      </div>
      {open&&(
        <div style={{padding:"4px 16px 16px",background:"#f8f7f5"}}>
          <P>This system is organized into sections you can work through at your own pace. Here is what is available in each section and throughout the system.</P>
          <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:8}}>
            {coreFeatures.map(([feature,desc])=>(
              <div key={feature} style={{display:"flex",gap:9,padding:"7px 11px",background:"#fff",border:`1px solid ${RULE}`,borderRadius:6}}>
                <div style={{width:3,borderRadius:2,background:AMBER,flexShrink:0,alignSelf:"stretch"}}></div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:NAVY,marginBottom:1}}>{feature}</div>
                  <div style={{fontSize:12,color:SLATE,lineHeight:1.6}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          {!showAll&&(
            <button onClick={(e)=>{e.stopPropagation();setShowAll(true);}} style={{fontSize:11,color:AMBER,background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontFamily:"Inter,sans-serif",fontWeight:500}}>
              + Show additional features
            </button>
          )}
          {showAll&&(
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {additionalFeatures.map(([feature,desc])=>(
                <div key={feature} style={{display:"flex",gap:9,padding:"7px 11px",background:"#fff",border:`1px solid ${RULE}`,borderRadius:6}}>
                  <div style={{width:3,borderRadius:2,background:AMBER,flexShrink:0,alignSelf:"stretch"}}></div>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:NAVY,marginBottom:1}}>{feature}</div>
                    <div style={{fontSize:12,color:SLATE,lineHeight:1.6}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntroLearn() {
  return (
    <div>
      <Orientation>Parenting plans are often discussed in terms of legal requirements, forms, or court processes. In practice, they define how a child moves between households, how decisions are made, and how daily life is structured across both homes. The way parenting plans are written can vary, but the underlying structure tends to address the same core areas.</Orientation>
      <P>This system is designed to help you understand how parenting plans are structured and how they function in day-to-day life. It focuses on how time is organized, how decisions are made, how responsibilities are carried out, and how communication and coordination occur over time.</P>
      <P>Most parents arrive at this process without knowing what they do not know. That is not a failure. It is simply the reality. This system exists to change that.</P>
      <SH>How This System Is Organized</SH>
      <P>This system is organized based on how parenting plans function in real life, rather than how they are grouped in a specific legal document. The same concepts may appear in different sections depending on the attorney, mediator, or court involved.</P>
      <P>For example: education and medical decisions may appear within legal custody in some plans and as separate sections in others. Extracurricular activities could be grouped under decision-making, scheduling, or a separate category. Communication and information sharing might appear in different locations depending on how the plan is structured. These differences in organization do not change how a parenting plan functions in practice.</P>
      <HowToUsePanel />
      <SH>What This System Covers</SH>
      <div style={{display:"flex",flexDirection:"column",gap:7,margin:"10px 0"}}>
        {[
          ["How Plans Develop","What the development process actually looks like: temporary orders, drafting, mediation, revision, and finalization."],
          ["Physical Custody","How the child's time is structured between households: schedules, transitions, and routines that define daily life."],
          ["Holidays and Special Days","How the regular schedule is suspended during significant dates and how those variations are structured."],
          ["Legal Custody","Who holds authority over major decisions affecting the child's education, health, religious upbringing, and development."],
          ["Education / Medical / Activities","How parents stay informed and involved in important aspects of a child's life across two households."],
          ["Transportation and Exchanges","How transitions between households happen in practice: timing, location, and responsibility."],
          ["Communication","How parents share information and how the child stays connected to both households."],
          ["Drafting Pitfalls","How the language of a plan can create problems, and what to watch for."],
          ["Modification and Disputes","How plans adapt over time and how disagreements are addressed when they arise."],
          ["Negotiation Reality","What the process of reaching agreement actually looks like in practice."],
          ["Additional Considerations","Provisions that appear in many parenting plans but that parents often do not know are part of the conversation."],
        ].map(([title,desc]) => (
          <div key={title} style={{display:"flex",gap:11,padding:"9px 13px",background:"#fff",border:`1px solid ${RULE}`,borderRadius:7}}>
            <div style={{width:3,borderRadius:2,background:AMBER,flexShrink:0,alignSelf:"stretch"}}></div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:NAVY,marginBottom:2}}>{title}</div>
              <div style={{fontSize:12.5,color:SLATE,lineHeight:1.6}}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <SH>Scope and Variation</SH>
      <P>Parenting plans often address a core set of topics such as time-sharing, decision-making, and communication. Beyond these areas, plans often include additional provisions that reflect the specific needs, preferences, or circumstances of a family. These provisions can vary widely. Some plans include details related to travel, introduction of new partners, temporary care arrangements, or other day-to-day considerations. Others remain more limited in scope.</P>
      <P>There is no single format that applies to every situation. Whether a provision is included or not does not change how a parenting plan functions day-to-day. What matters is how clearly expectations are understood and how consistently the plan can be followed in practice.</P>
      <SH>About Example Language</SH>
      <P>Example language is included throughout this system to help you recognize how concepts may appear in a parenting plan. These examples are simplified and provided for reference only. They are intended to help you recognize structure and language, not to serve as a final or complete document. They are not intended to be copied directly or used as a substitute for legal advice.</P>
      <SH>Child Support and Financial Obligations</SH>
      <P>Parenting plans sometimes reference certain financial responsibilities related to the child, such as shared expenses or costs associated with activities, education, or care. Child support can in some cases be addressed within a parenting plan, but it is more commonly handled through separate legal processes or court orders. Because financial arrangements vary by jurisdiction and individual circumstances, they are not a primary focus of this system.</P>
      <SH>Written Structure and Informal Understandings</SH>
      <P>Parenting plans often reflect both formal provisions and informal understandings between parents. Informal understandings may work well in the moment but can be more difficult to rely on over time if they are not reflected in the written plan. A written plan provides a reference point that holds as circumstances and interpretations change over time.</P>
      <SH>What This System Is Not</SH>
      <div style={{border:`1px solid ${RULE}`,borderRadius:8,padding:"14px 18px",background:"#fff",marginTop:4}}>
        <P style={{margin:0}}>This system is not legal advice. It does not recommend specific outcomes or suggest what your parenting plan should contain. It does not replace an attorney, mediator, or any other professional involved in your process. It is a preparation tool, one that exists so that the time you spend with those professionals is used as effectively as possible.</P>
      </div>
      <KeyTakeaways items={[
        "Parenting plans define how daily life functions across two homes, not just when the child is with a particular parent.",
        "Understanding the structure before you negotiate it changes your capacity to participate in that conversation.",
        "These reflection questions exist to help you think clearly, not to evaluate you. Work through them in any order and return to any question at any time.",
      ]} />
    </div>
  );
}

function ProcessLearn() {
  return (
    <div>
      <Orientation>Oftentimes, parents first encounter the idea of a parenting plan when they are already in the middle of a trying situation. They may not know what a parenting plan is, let alone what is required to create a comprehensive one. Understanding how the development process works, before you are in the middle of it, reduces the anxiety that comes from not knowing what comes next.</Orientation>
      <P>Parenting plans are built over time through discussion, revision, and in some cases formal legal procedures. The process does not follow a fixed sequence. Progress often occurs in stages, and earlier decisions are revisited as the overall structure becomes clearer.</P>
      <SH>Early Stages and Temporary Arrangements</SH>
      <P>The process sometimes begins with a formal legal filing. Other times, discussions start informally between parents before any legal action is taken. Short-term arrangements may be used during this period to provide immediate structure for the child.</P>
      <P>These arrangements are sometimes formalized through temporary orders issued by the court. Temporary orders can cover a wide range of topics, not just parenting time. They may address:</P>
      <div style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:8,padding:"12px 16px",margin:"8px 0 12px"}}>
        {[
          "Parenting time and exchange schedules",
          "Decision-making authority during the interim period",
          "Communication requirements between parents",
          "Financial obligations and expense responsibilities",
          "Attorney fees",
          "Parenting coordinator fees and who is responsible for them",
          "Housing arrangements",
        ].map((item,i,arr) => (
          <div key={i} style={{display:"flex",gap:8,fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:i<arr.length-1?3:0}}>
            <span style={{color:AMBER,flexShrink:0}}>, </span><span>{item}</span>
          </div>
        ))}
        <div style={{fontSize:12,color:"#aaa",marginTop:8,fontStyle:"italic"}}>The scope of a temporary order depends on what is being contested and what the court determines is necessary to provide stability during the process.</div>
      </div>
      <ChildPerspective items={[
        "The child may experience changes in routine before any formal plan is in place. Temporary arrangements shape daily life while the permanent plan is being negotiated.",
        "Stability during early stages depends on how consistently those arrangements are followed, not on whether they are formally documented.",
        "Children experience the process itself, not just the decisions it produces. How this period is navigated is something they take in, even when adults assume otherwise.",
      ]} />
      <SectionDivider />
      <SH>Drafting and Revision</SH>
      <P>Parenting plans are developed through an initial draft followed by review and revision. One party may prepare a proposed structure, which is then shared with the other parent or their representative. The response may include changes, questions, or a different approach to specific sections.</P>
      <P>These exchanges often repeat many times. Revisions are a normal part of the process. It is common for proposed terms to be declined or revised without agreement, and for communication to pause without explanation. This does not mean the process has ended. Progress is not always linear.</P>
      <SectionDivider />
      <SH>Mediation</SH>
      <P>In many situations, mediation is used to support the development of a parenting plan. Mediation provides a structured setting for discussion with the assistance of a neutral third party. The mediator helps organize the conversation and guides the process but does not make decisions.</P>
      <P>The goal of mediation is to resolve as much as possible in each session. Sometimes that happens in one meeting. Other times, a follow-up session is needed to work through remaining issues. Either outcome is part of the process, not a sign that it has stalled.</P>
      <SectionDivider />
      <SH>Court Timing and Delays</SH>
      <P>When the process occurs within a legal proceeding, the pace may be influenced by court scheduling. Courts operate within established procedures and timelines. Hearings and required steps will be spaced over time, and delays can occur due to scheduling constraints or case volume. Work on the parenting plan often continues between court dates.</P>
      <CoordBlock
        intro="Staying organized during the development process involves a few recurring logistics."
        items={[
          "Keep records of proposals and responses, what was proposed, when, and what the response was",
          "Stay in communication with whoever is guiding your process, whether that is an attorney, a mediator, or another resource",
          "Understand what the next scheduled step is and when it occurs",
          "Keep temporary arrangements stable for the child while the drafting process continues",
        ]}
      />
      <SectionDivider />
      <SH>Finalization</SH>
      <P>Different sections of the plan may be resolved at different times. In some situations, a final agreement is reached through discussion. In others, unresolved issues are addressed through mediation or court involvement.</P>
      <P>Finalization occurs when the plan is formalized, either by agreement of both parties, submitted to the court for approval, or as part of a legal order issued by a judge. Even when parents reach full agreement on their own, that agreement is typically reviewed and signed off by a judge before it becomes enforceable. Once finalized, the plan becomes the written reference point for both households.</P>
      <P>The timeline from first discussion to finalization varies significantly. Some plans are completed in weeks. Others take many months. It is common for the process to extend over a period of months, particularly when formal legal proceedings are involved.</P>
      <ConsiderBlock>Delays do not mean the process has failed. A plan that is clear, workable, and sustainable is worth the time it takes to reach carefully.</ConsiderBlock>
      <CommonQs items={[
        {q:"What are temporary orders and how long do they last?",a:"Temporary orders are court-issued arrangements that govern parenting time, decision-making, and sometimes financial matters while a longer-term plan is being developed. They are intended to be interim but can remain in place for months or longer. In some cases, temporary arrangements that function well become the basis for the permanent plan."},
        {q:"What if the other parent will not respond to proposals?",a:"Non-response is common and does not necessarily indicate bad faith or a breakdown in the process. If you are working with an attorney, they will typically follow up through formal channels. If you are navigating the process independently, documenting your attempts to communicate and seeking guidance from a mediator or family law resource can help establish a path forward."},
        {q:"Does the plan have to go through a judge?",a:"In most cases, yes, even when parents reach full agreement on their own. An uncontested agreement is typically submitted to the court, reviewed, and signed by a judge before it becomes legally enforceable. Court approval is what gives the plan its enforceability. A judge may approve the agreement without a formal hearing, but some form of judicial review is standard in most jurisdictions."},
        {q:"How long does the whole process typically take?",a:"It varies significantly depending on how much agreement exists at the outset, whether mediation is needed, and court scheduling. Some plans are finalized in weeks. Others take six months to a year or longer."},
      ]} />
      <KeyTakeaways items={[
        "Parenting plans are built over time through discussion, negotiation, revision, and refinement. Rarely in a single conversation.",
        "Temporary orders can cover far more than parenting time. Know what yours addresses.",
        "Proposals being declined or revised is a normal part of the process, not a signal that it has failed.",
        "Mediation aims to resolve as much as possible in each session. Sometimes follow-up is needed. That is part of the process.",
        "Even agreed-upon plans typically require a judge's approval before they become enforceable.",
      ]} />
    </div>
  );
}

function TimesharingLearn() {
  return (
    <div>
      <Orientation>Physical custody refers to how a child's time is divided between parents. It defines where the child resides on a day-to-day basis and how time is structured across households. Getting clarity on how these structures work, before you are in the room negotiating them, changes your capacity to participate in that conversation.</Orientation>
      <P>Different states use different terminology: parenting time, residential responsibility, time-sharing. The underlying concept is the same. A parenting plan sets out a defined schedule so both parents understand when the child will be in their care. This typically includes a repeating schedule or pattern and defined transitions between households. It will also account for adjustments related to holidays, school breaks, and special circumstances.</P>
      <P>Parenting time is not limited to a small set of predefined schedules. Most plans reflect a range of arrangements based on the child's needs and the practical realities of each family. Many plans combine elements from multiple approaches.</P>
      <SH>The Goal of a Time-Sharing Structure</SH>
      <P>Every parent wants the schedule that works best for their child. That is the right goal. What the process often reveals is that the perfect schedule, the one that accounts for every variable perfectly, is rarely achievable. What is achievable is a schedule that is predictable, workable, and sustainable over time, and that can adapt as circumstances change.</P>
      <ChildPerspective items={[
        "Exchanges occur at defined intervals. How frequently they occur shapes how much consistency the child can expect across both households in any given week.",
        "Personal items may need to be available in both homes, school materials, clothing, medications, a favorite toy.",
        "The more frequently exchanges occur, the more often differences between households are felt. Consistency in routines across both homes matters more than parents often expect.",
        "The child stays in contact with both parents, but the emotional experience of exchanges varies by child, age, and how predictably they happen.",
      ]} />
      <SH>Distance and Travel Time</SH>
      <P>Travel time between households significantly influences how a parenting schedule functions in practice. It affects school attendance, activity participation, and the consistency of daily routines. Distance alone does not reflect how a schedule operates day-to-day. Real-world commute conditions, rush hour traffic, school pickup windows, activity start times, all factor into whether a schedule is genuinely workable.</P>
      <CoordBlock
        intro="Any time-sharing structure places a set of recurring logistics on both parents."
        items={[
          "Exchange timing, locations, and responsibility for transportation",
          "Movement or duplication of school materials and personal items between homes",
          "Consistency in routines such as homework, bedtime, and school preparation",
          "Ongoing communication regarding schedules, activities, and changes",
        ]}
      />
      <ConsiderBlock>A schedule that looks straightforward on paper can function very differently in practice. Real-world commute conditions, work schedules, and school pickup windows all affect whether a schedule is genuinely sustainable. The goal is a schedule that both households can follow consistently, not a perfect allocation of time that breaks down under pressure.</ConsiderBlock>
      <SH>Adapting Over Time</SH>
      <P>Parenting plans often include provisions that allow schedules to adjust as circumstances change, the child's age, school schedule, work availability, or changes in travel time. Some plans include defined triggers for these changes, allowing the structure to evolve without requiring renegotiation or court involvement.</P>
      <CommonQs items={[
        {q:"Does equal time-sharing always mean exactly 50/50?",a:"Equal time-sharing structures aim for an even division, but the exact percentage depends on the schedule pattern, how holidays are handled, and how the year plays out in practice. The structure matters as much as the stated intention."},
        {q:"Is there a default schedule most courts prefer?",a:"There is no universal default. Different jurisdictions have different starting points, and courts generally consider the child's specific needs and circumstances. The schedule that functions best in practice is more important than the one that sounds best in theory."},
        {q:"Can schedules change as children get older?",a:"Many parenting plans include provisions for schedules to evolve as the child's needs change. Some plans define specific triggers for review. Others require agreement or court involvement for any change."},
        {q:"What happens if parents move farther apart after the plan is in place?",a:"Significant changes in distance between households are among the most common reasons parenting plans are modified. The plan itself may include provisions addressing relocation, or modification may require a formal legal process."},
      ]} />
      <KeyTakeaways items={[
        "Physical custody is one significant part of what defines daily life across two homes, alongside decisions, communication, and the routines each household builds.",
        "More exchanges require more coordination. Fewer exchanges mean longer stretches away from one parent.",
        "Real-world conditions, rush hour traffic, school pickup windows, work schedules, affect how any schedule actually functions. Account for them.",
        "Holiday schedules override the base schedule. The next section covers how that overlay works.",
        "Schedules can be built to adapt over time as the child's age, school, and circumstances change.",
      ]} />
    </div>
  );
}

function TimesharingCompare() {
  const [openSet, setOpenSet] = useState(new Set());
  const toggle = (id) => {
    setOpenSet(prev => { const next = new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; });
  };
  return (
    <div>
      <Orientation>These schedule types are reference points, not rigid categories. Understanding how each works helps you think through what fits your situation before you are in the room deciding.</Orientation>
      <div style={{fontSize:11,color:SLATE,marginBottom:14}}>Tap any schedule to open it. Multiple schedules can be open at the same time for comparison.</div>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {SCHEDULES.map(s => {
          const isOpen = openSet.has(s.id);
          return (
            <div key={s.id} style={{borderRadius:8,border:`1.5px solid ${isOpen?AMBER:RULE}`,background:isOpen?AMBER_LIGHT:"#fff",overflow:"hidden"}}>
              <div onClick={()=>toggle(s.id)} style={{padding:"13px 17px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:11,color:isOpen?AMBER:"#ccc",flexShrink:0,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none"}}>▶</div>
                <div>
                  <div style={{fontWeight:600,color:NAVY,fontSize:14}}>{s.name}</div>
                  <div style={{fontSize:12,color:SLATE,marginTop:1}}>{s.type}</div>
                </div>
              </div>
              {isOpen&&<ScheduleCardContent s={s} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HolidaysLearn() {
  return (
    <div>
      <Orientation>Holidays often carry personal, cultural, religious, and family significance that extends beyond the normal weekly schedule. How that time is structured, and how clearly those structures are defined, often determines whether the plan provides clarity or creates recurring friction.</Orientation>
      <P>While physical custody defines the child's regular, repeating schedule, holidays and special days introduce deviations from that structure. These periods are addressed separately within a parenting plan to establish expectations when the standard schedule does not apply.</P>
      <SH>How Holiday Schedules Function</SH>
      <P>Parenting plans commonly include a holiday schedule that overrides the base time-sharing structure. The holiday schedule functions as an overlay, temporarily replacing the base schedule during specified periods. Once the holiday period ends, the base schedule resumes. These adjustments are generally defined in advance to reduce uncertainty and prevent conflict.</P>
      <SH>Types of Holidays and Special Days</SH>
      <P>Parenting plans often address a range of recurring and non-recurring dates. Common examples include major national or cultural holidays, religious holidays, school breaks, the child's birthday, each parent's birthday, Mother's Day and Father's Day, and extended holiday weekends. The scope reflects the family's traditions, priorities, and practical considerations.</P>
      <SH>What This Looks Like in Practice</SH>
      <P>Holiday scheduling changes the rhythm of the child's routine. Exchanges may occur on different days, at different times, or in a different sequence than the base schedule. In some cases, the child may spend time in a household where they would not normally be under the weekly schedule.</P>
      <P>Because these periods often involve travel, extended family, or special events, the timing and structure of exchanges may differ from typical weekly transitions. Holiday schedules also interact with school calendars, which may shift slightly from year to year, affecting how specific dates align with weekends or existing parenting time.</P>
      <ChildPerspective items={[
        "The child may spend certain holidays with different parents each year. Familiar routines shift during these periods.",
        "Exchanges can occur at times that differ from the usual schedule, which may feel less predictable.",
        "The child participates in different traditions depending on the household, extended family involvement, travel, and routines may all vary.",
        "Extended time with one parent during school breaks may mean several days without seeing the other parent.",
        "Consistency and communication from year to year helps the child anticipate what to expect.",
      ]} />
      <SH>Extended Parenting Time</SH>
      <P>Some plans include provisions for extended, uninterrupted time, often during summer break, school vacations, or periods of reduced obligations. These periods may last one week or longer and may temporarily replace both the base schedule and portions of the holiday schedule, depending on how the plan is written.</P>
      <HelpsWorkWell items={[
        "Define holiday start and end times clearly in advance.",
        "Establish how holidays interact with the regular schedule.",
        "Coordinate with school calendars and activity schedules.",
        "Set advance notice requirements for extended time or travel.",
        "Define how contact with the other parent is handled during extended periods.",
      ]} />
      <CoordBlock
        intro="Holiday and special day provisions require both parents to manage a few recurring logistics."
        items={[
          "How exchanges are handled during holidays, including transportation responsibility",
          "Advance planning for multi-day holidays and school breaks",
          "Communication regarding travel plans or extended family involvement",
          "Coordination when school calendars or holiday dates shift year to year",
        ]}
      />
      <ConsiderBlock>Holidays often carry emotional weight. Because these periods matter, differences in expectations between households may become more noticeable. Real-world conditions, travel, traffic, and logistics, can influence how easily holiday exchanges occur, particularly when transitions fall on busy travel days.</ConsiderBlock>
      <CommonQs items={[
        {q:"What happens if a holiday falls on a school day?",a:"Most plans address this, either the holiday takes precedence regardless of school, or holiday time begins after school ends. The plan itself should specify. Ambiguity here is a common source of conflict."},
        {q:"Does the holiday schedule override the regular schedule every time?",a:"Generally, yes, designated holiday parenting time takes precedence over the base schedule. The plan should define this clearly so there is no ambiguity about which schedule applies at any given time."},
        {q:"How far in advance do holiday plans need to be communicated?",a:"Many plans include advance notice requirements, typically ranging from 14 to 60 days depending on the nature of the holiday and whether travel is involved. The specific requirement depends on how the plan is written."},
        {q:"Can families maintain similar holiday routines across both homes?",a:"Yes. Some families maintain similar routines across households during holidays, while in others each household follows its own traditions. Neither approach is required. What matters is that expectations are clear in advance."},
      ]} />
      <KeyTakeaways items={[
        "The holiday schedule is an overlay, it temporarily replaces the base schedule, then the base schedule resumes.",
        "Holidays carry personal, cultural, and family significance. Clear structure reduces friction during the periods that matter most.",
        "Extended summer or break time may affect both the base and holiday schedules. How these interact should be clearly defined.",
        "Advance notice requirements for holiday travel should be specified in the plan.",
        "Consistency from year to year reduces uncertainty for the child.",
      ]} />
    </div>
  );
}

function HolidaysExplore() {
  const approaches = [
    {name:"Alternating Holidays",desc:"Parents alternate specific holidays each year, one parent in even-numbered years, the other in odd-numbered years. This is the most common approach for major holidays.",example:"The parties shall alternate the following holidays on an annual basis. Parent A shall have the child in even-numbered years, and Parent B in odd-numbered years. Holiday parenting time shall take precedence over the regular parenting schedule."},
    {name:"Fixed Holidays",desc:"Certain days are consistently assigned to one parent each year, regardless of the regular schedule. Mother's Day and Father's Day are the most common examples of fixed holidays. Each parent's birthday is another.",example:"Mother's Day shall be spent with the mother each year from [time] to [time]. Father's Day shall be spent with the father each year from [time] to [time]. These holidays shall take precedence over the regular parenting schedule."},
    {name:"Split Days",desc:"Some holidays are divided within the same calendar day, one parent has morning time, the other has evening. More common when parents live relatively close to one another.",example:"Parent A shall have parenting time from [time] to [time], and Parent B shall have parenting time from [time] to [time]. The exchange shall occur at [location] unless otherwise agreed."},
    {name:"Extended Holiday Blocks",desc:"School breaks or multi-day holidays assigned as continuous blocks of time. Winter break is commonly divided into two segments, or alternated by year.",example:"Winter break shall be divided into two segments. Parent A shall have the first segment in even-numbered years and the second in odd-numbered years. Exchanges shall occur at [time] and [location] unless otherwise agreed."},
    {name:"Customized or Hybrid Structures",desc:"Most parenting plans combine elements from multiple approaches, major holidays alternating, parent-specific days fixed, certain events split or handled individually. These combinations reflect the family's specific traditions and practical considerations.",example:"The parties shall alternate Thanksgiving and winter break on an annual basis. Mother's Day and Father's Day are fixed. The child's birthday shall be divided, with Parent A having morning time and Parent B having afternoon and evening."},
  ];
  const [openSet, setOpenSet] = useState(new Set());
  const toggle = (i) => { setOpenSet(prev => { const next = new Set(prev); next.has(i)?next.delete(i):next.add(i); return next; }); };
  return (
    <div>
      <Orientation>Holiday scheduling approaches can be combined in many ways. Most plans use more than one. Explore each to understand how it works before deciding what fits your situation.</Orientation>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {approaches.map((a,i) => (
          <div key={i} style={{border:`1.5px solid ${openSet.has(i)?AMBER:RULE}`,borderRadius:8,overflow:"hidden",background:openSet.has(i)?AMBER_LIGHT:"#fff"}}>
            <div onClick={()=>toggle(i)} style={{padding:"13px 17px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:openSet.has(i)?AMBER:"#ccc",flexShrink:0,transform:openSet.has(i)?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none",display:"inline-block"}}>▶</span>
              <span style={{fontWeight:600,color:NAVY,fontSize:14}}>{a.name}</span>
            </div>
            {openSet.has(i)&&<div style={{padding:"0 17px 16px"}}><P>{a.desc}</P><ExampleBlock>{a.example}</ExampleBlock></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LegalCustodyLearn() {
  return (
    <div>
      <Orientation>Legal custody determines who makes major decisions affecting the child's life. Understanding how this works, before negotiations begin, changes your capacity to evaluate what is being proposed and why it matters.</Orientation>
      <P>Legal custody defines how major decisions affecting the child are made and who holds responsibility for those decisions. Different states use different terminology: decision-making authority, legal decision-making, parental responsibility. The underlying concept is the same.</P>
      <P>A parenting plan establishes a framework for how decisions will be handled over time. That framework defines whether decisions are made jointly or by one parent, how information is shared between parents, whether consultation is required before decisions are made, and how disagreements are addressed. The purpose is to reduce uncertainty when decisions arise and to provide a structure that can be relied on over time.</P>
      <P>Each parent makes day-to-day decisions regarding the child's care and routine while the child is with them. Legal custody applies to decisions that carry meaningful or lasting impact.</P>
      <SH>Categories of Major Decisions</SH>
      <P>Major decisions are those that have a meaningful or lasting impact on the child's health, education, religious upbringing, or overall development. Common categories include:</P>
      <div style={{background:"#fff",border:`1px solid ${RULE}`,borderRadius:8,padding:"12px 16px",margin:"8px 0 12px"}}>
        {[
          "Education: selecting or changing schools, special education services, academic interventions, significant programs",
          "Medical: selecting physicians, non-emergency treatment decisions, mental health counseling, elective procedures, vaccination decisions",
          "Religious upbringing: participation in religious practices, instruction, or ceremonies",
          "Activities: enrollment in time-intensive or long-term activities that affect both households or involve significant cost",
        ].map((item,i,arr) => (
          <div key={i} style={{display:"flex",gap:8,fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:i<arr.length-1?3:0}}>
            <span style={{color:AMBER,flexShrink:0}}>, </span><span>{item}</span>
          </div>
        ))}
      </div>
      <SH>Areas That May Be Less Clearly Defined</SH>
      <P>Not all decisions fall neatly into major or day-to-day categories. Some depend on the child's age, the family's values, and how the plan is written. Examples include participation in religious ceremonies beyond regular practice; piercings or other non-medically necessary procedures; dietary choices tied to cultural or lifestyle preferences; and hairstyle or grooming choices with personal or cultural significance. In some plans these are addressed directly. In others, they are handled by the parent with the child at the time unless they rise to a level both parents consider significant.</P>
      <ChildPerspective items={[
        "It is beneficial to the child when both parents are working toward a common understanding of how major decisions will be made, even when they do not fully agree.",
        "When parents disagree on a major decision, the process of reaching resolution may take longer and can create strain if not approached carefully.",
        "When parents are aligned, or working toward a reasonable compromise, the child is more likely to experience consistency across households on important issues.",
        "The child may not be aware of how decisions are made, but experiences the outcomes through daily life.",
      ]} />
      <SH>Disagreement Resolution</SH>
      <P>In joint legal custody arrangements, parenting plans sometimes include a method for addressing situations where parents cannot reach agreement. Common approaches include:</P>
      <P><strong style={{color:NAVY,fontWeight:600}}>Designated decision authority in specific areas</strong>, one parent may have final decision-making authority in certain categories, such as medical or educational decisions, while other areas remain shared.</P>
      <P><strong style={{color:NAVY,fontWeight:600}}>Good-faith consultation with final authority</strong>, both parents consult and attempt to reach agreement. If agreement cannot be reached after reasonable effort, one parent may be given final authority.</P>
      <P><strong style={{color:NAVY,fontWeight:600}}>Third-party involvement</strong>, the parents agree to consult a neutral third party such as a mediator or parenting coordinator before a decision is finalized.</P>
      <P><strong style={{color:NAVY,fontWeight:600}}>Status quo approach</strong>, the current arrangement remains in place until agreement is reached or further action is taken.</P>
      <ConsiderBlock>Disagreements over major decisions are among the most common sources of conflict after a parenting plan is in place. Joint legal custody requires ongoing communication. Sole legal custody reduces coordination but concentrates authority. Depending on the circumstances, one structure may be more appropriate than the other.</ConsiderBlock>
      <CommonQs items={[
        {q:"Does joint legal custody mean both parents must agree on everything?",a:"No. Joint legal custody applies to major decisions, education, non-emergency medical care, religious upbringing, and significant activities. Day-to-day decisions during each parent's parenting time are made independently by that parent. What joint legal custody requires is a plan for how parents will reach agreement or work through disagreement on major issues, not agreement on everything. The third question in this section addresses what happens when that process breaks down."},
        {q:"Can one parent make an emergency medical decision alone?",a:"Yes. Emergency care is handled by the parent with the child at the time. The obligation is to notify the other parent as soon as reasonably possible. Most plans address this explicitly."},
        {q:"What happens if we have joint custody but truly cannot agree on something?",a:"The plan's dispute resolution process applies. Most plans include a defined path, good-faith consultation, then third-party involvement, then potentially court action. Without a defined process in the plan, an impasse on a major decision may require court intervention to resolve."},
      ]} />
      <KeyTakeaways items={[
        "Legal custody governs major decisions, not daily parenting choices. Each parent makes those independently during their parenting time.",
        "The framework, how decisions are made, how information is shared, how disagreements are resolved, is what the plan needs to define.",
        "The definition of 'major decision' matters. Vague plans create recurring disputes over what requires joint agreement.",
        "Emergency medical decisions are always made by the parent present. Notification follows.",
        "Disagreement resolution provisions are among the most important parts of a legal custody arrangement.",
      ]} />
    </div>
  );
}

function LegalCustodyCompare() {
  const options = [
    {
      id:"joint", name:"Joint Legal Custody",
      desc:"Both parents participate in major decisions affecting the child. Neither parent has unilateral authority over major issues. Consultation is expected before decisions are finalized.",
      inPractice:[
        "Both parents are expected to communicate before major decisions are finalized",
        "Neither parent can act unilaterally on issues defined as major in the plan",
        "When parents cannot agree, the plan's dispute resolution process applies",
        "Ongoing communication about the child's education, health, and development is built into the structure",
      ],
      helpsWorkWell:[
        "Clearly define what information each parent receives about major decisions and when",
        "Establish a consultation process with a defined timeline before decisions are finalized",
        "Agree in advance on what happens when consensus cannot be reached",
        "Keep communication focused on the child's needs",
      ],
      childPerspective:[
        "It is beneficial to the child when both parents are working toward agreement, even when it takes longer to reach.",
        "When parents disagree, the process of reaching resolution may create strain on family dynamics if not approached carefully.",
        "When aligned or working toward compromise, the child is more likely to experience consistency across households on major issues.",
      ],
      example:"The parents share joint legal custody. Major decisions regarding education, non-emergency medical care, religious upbringing, and extracurricular activities shall be made jointly. Each parent shall communicate in advance regarding significant decisions and make a reasonable effort to reach agreement before any decision is finalized.",
    },
    {
      id:"sole", name:"Sole Legal Custody",
      desc:"One parent is assigned primary decision-making authority. The other parent may still be informed or consulted, but responsibility for final decisions rests with one parent.",
      inPractice:[
        "One parent has final authority over major decisions without requiring the other's agreement",
        "The non-custodial parent may still be informed or have input, but cannot block decisions",
        "Less ongoing coordination is required for major decisions",
        "The plan should still define what information is shared and how",
      ],
      helpsWorkWell:[
        "Clearly define what information the non-custodial parent receives and when",
        "Establish a notification process for significant decisions even when consent is not required",
        "Respect the consultation process even when final authority rests with one parent",
        "Keep the non-custodial parent informed in a way that supports the child's continuity",
      ],
      childPerspective:[
        "Decisions may be made more efficiently but may reflect one parent's perspective more strongly.",
        "The child may experience less back-and-forth on major issues.",
        "Differences between households may be more pronounced on topics where perspectives diverge.",
      ],
      example:"Parent A is granted sole legal custody and shall be responsible for major decisions regarding the child's education, medical care, religious upbringing, and general welfare. Parent B shall be kept informed of significant decisions and may provide input, but final decision-making authority shall rest with Parent A.",
    },
  ];
  const [openSet, setOpenSet] = useState(new Set());
  const toggle = (id) => { setOpenSet(prev => { const next = new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; }); };
  return (
    <div>
      <Orientation>These two structures have meaningfully different implications for how decisions get made and how conflict is handled when parents disagree. Understanding both before you negotiate changes your capacity to evaluate what is being proposed.</Orientation>
      <div style={{fontSize:11,color:SLATE,marginBottom:14}}>Both options can be open at the same time for comparison.</div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        {options.map(o => {
          const isOpen = openSet.has(o.id);
          return (
            <div key={o.id} style={{border:`1.5px solid ${isOpen?AMBER:RULE}`,borderRadius:8,background:isOpen?AMBER_LIGHT:"#fff",overflow:"hidden"}}>
              <div onClick={()=>toggle(o.id)} style={{padding:"14px 17px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,color:isOpen?AMBER:"#ccc",flexShrink:0,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none",display:"inline-block"}}>▶</span>
                <div style={{fontWeight:600,color:NAVY,fontSize:14}}>{o.name}</div>
              </div>
              {isOpen&&<div style={{padding:"0 17px 18px"}}>
                <P>{o.desc}</P>
                <CollapsibleSubsection label="WHAT THIS LOOKS LIKE IN PRACTICE">
                  <CoordBlock intro={null} items={o.inPractice} showHeader={false} />
                </CollapsibleSubsection>
                <CollapsibleSubsection label="WHAT HELPS THIS WORK WELL">
                  <HelpsWorkWell items={o.helpsWorkWell} showHeader={false} />
                </CollapsibleSubsection>
                <CollapsibleSubsection label="WHAT THIS LOOKS LIKE FROM THE CHILD'S PERSPECTIVE">
                  <ChildPerspective items={o.childPerspective} showHeader={false} />
                </CollapsibleSubsection>
                <CollapsibleSubsection label="EXAMPLE LANGUAGE">
                  <ExampleBlock showHeader={false}>{o.example}</ExampleBlock>
                </CollapsibleSubsection>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EdMedActLearn() {
  return (
    <div>
      <Orientation>Education, medical care, and activities are areas where staying informed and coordinating across two households is generally most constant, and where gaps in the plan are most likely to be felt in daily life.</Orientation>
      <SH>Education</SH>
      <P>Education is one of the most consistent and structured aspects of a child's life and often requires coordination across both households. Educational responsibilities include school selection, communication with teachers, academic support, and participation in school-related activities. Even when one parent has primary decision-making authority, both parents often remain involved in day-to-day educational support. There is an important distinction between having the right to access records and actually being in the communication loop, both matter and both should be explicitly addressed in the plan.</P>
      <HelpsWorkWell items={[
        "Ensure both parents are actively listed as contacts with the school and receive direct communications, not just forwarded information.",
        "Maintain consistent expectations around attendance and homework routines across both homes.",
        "Establish a clear understanding of how school-related costs and expenses are handled.",
        "Coordinate the school calendar and discuss the parenting schedule to identify and resolve any conflicts in advance.",
      ]} />
      <ChildPerspective items={[
        "The child may experience school routines across one or both households with varying levels of consistency depending on coordination between parents.",
        "Homework and preparation may be handled differently in different environments.",
        "Expectations may vary depending on coordination between households.",
        "School events may involve one or both parents, depending on the plan and the relationship between households.",
      ]} />
      <CoordBlock
        intro="Education may require ongoing coordination between households to function smoothly."
        items={[
          "Both parents having direct access to school portals, records, and communications",
          "Both parents listed as contacts and emergency contacts who receive direct school communications",
          "Sharing school-related documents, schedules, and updates",
          "Responsibility for attending conferences and school events",
          "Coordination of school schedules, supply needs, and preparation",
        ]}
      />
      <ConsiderBlock>There is a meaningful difference between the right to access records and actually receiving communications. Ensuring both parents are actively in the loop with schools requires deliberate action, it does not happen automatically.</ConsiderBlock>
      <ExampleBlock>Both parents shall have access to the child's educational records and may communicate directly with school personnel. Each parent shall ensure they are listed as a contact and emergency contact with the child's school and shall receive direct communications. The parties shall cooperate to ensure the child has necessary school supplies prior to the start of each school year.</ExampleBlock>
      <SectionDivider />
      <SH>Medical and Health Care</SH>
      <P>Medical responsibilities include scheduling appointments, attending visits, managing prescriptions, and communicating about health-related needs. Routine care is often handled by the parent with the child at the time, while more significant decisions follow the legal custody structure. Both parents having direct access to providers, not just receiving forwarded information, supports continuity of care.</P>
      <HelpsWorkWell items={[
        "Communicate about appointments and care before and after visits.",
        "Ensure both parents are independently listed with medical providers and can communicate directly.",
        "Share diagnoses, treatment updates, and any changes in care in a timely way.",
        "Establish how non-covered medical expenses are documented and reimbursed.",
      ]} />
      <ChildPerspective items={[
        "The child benefits when medical routines are managed consistently across both households.",
        "When communication between parents about health care is seamless, the child's care feels more coordinated and less stressful.",
      ]} />
      <CoordBlock
        intro="Medical care involves a few recurring communication subjects between parents."
        items={[
          "Who informs the other parent after an appointment, and within what timeframe",
          "How urgent health issues are communicated outside of normal channels",
          "How provider recommendations, diagnoses, and treatment plans are shared",
          "How disagreements about a medical decision are raised and addressed",
        ]}
      />
      <ExampleBlock>Both parents shall have access to the child's medical records and may communicate directly with health care providers. The parent obtaining medical services shall provide relevant information and documentation to the other parent following the appointment. Non-emergency medical decisions shall be made in accordance with the legal custody provisions of this plan.</ExampleBlock>
      <SectionDivider />
      <SH>Activities and Development</SH>
      <P>Activities, extracurricular programs, sports, lessons, affect both households through scheduling, transportation, and cost. How activities are agreed upon, how costs are shared, and what happens when one parent enrolls a child without the other's agreement are all worth addressing clearly in the plan.</P>
      <HelpsWorkWell items={[
        "Establish a clear process for agreeing on activity enrollment before commitments are made.",
        "Define how costs are divided for agreed-upon activities.",
        "Clarify transportation responsibility for each parent during their parenting time.",
        "Understand how activities affect both households before enrollment.",
      ]} />
      <ChildPerspective items={[
        "The child benefits when both parents are able to coordinate and agree on the activities the child participates in.",
        "When both households follow through on commitments in the child's schedule, the consistency has a positive impact on the child's experience.",
        "When attendance and transportation happen seamlessly regardless of which home the child is in, the disruption to the child is minimized.",
      ]} />
      <CoordBlock
        intro="Activities generate a set of recurring communication topics between parents."
        items={[
          "Communicating schedule changes from coaches, schools, or activity organizers",
          "Sharing activity calendars so both parents can plan around commitments",
          "Discussing conflicts between activity schedules and parenting time before they become problems",
          "Handling last-minute changes to practices, games, or events",
        ]}
      />
      <ConsiderBlock>If a parent enrolls the child in an activity without agreement, that parent may be responsible for the associated costs. Most plans address this directly. Both parents are generally entitled to attend the child's activities regardless of custody structure.</ConsiderBlock>
      <ExampleBlock>The parties may enroll the child in extracurricular activities by agreement. Each parent shall ensure the child's attendance at scheduled activities during their parenting time and shall provide transportation as required. The parties shall share the cost of agreed-upon activities. If a parent enrolls the child in an activity without agreement, that parent shall be responsible for the associated costs unless otherwise agreed. Both parents may attend the child's activities.</ExampleBlock>
      <SH>How These Areas Interact</SH>
      <P>Education, medical care, and activities do not operate independently. School schedules affect activity participation. Medical needs affect school attendance. Activities influence coordination and scheduling across households. Coordination in one area affects the others.</P>
      <CommonQs items={[
        {q:"Does both parents having access to school records mean the school communicates equally with both?",a:"Not automatically. Both parents typically have a legal right to records, but ensuring you are listed as an active contact and receive direct communications requires deliberate action with the school."},
        {q:"What if parents disagree about whether a child needs therapy or mental health support?",a:"Mental health treatment typically falls under legal custody as a major decision. In joint legal custody, both parents are expected to participate in that decision. In sole legal custody, the custodial parent typically has final authority."},
      ]} />
      <KeyTakeaways items={[
        "Both parents typically have rights to access records for education and medical care, but being in the active communication loop requires deliberate action.",
        "Activities affect both households. Agreement on enrollment and cost-sharing should be clearly defined before commitments are made.",
        "Education, medical care, and activities interact. Coordination in one area affects the others.",
        "The distinction between access rights and active participation matters. Build both into the plan explicitly.",
      ]} />
    </div>
  );
}

function TransportationLearn() {
  return (
    <div>
      <Orientation>Exchanges are a recurring part of shared parenting life. The logistics surrounding them shape the child's experience of moving between homes more than parents often realize.</Orientation>
      <P>Parenting plans typically define how exchanges take place, including timing, location, and responsibility. These provisions create a predictable structure for transitions and help both parents understand their roles.</P>
      <SH>Exchange Structure</SH>
      <P>Exchanges typically occur at defined times and locations. Some plans use one parent's residence, both residences, a neutral exchange location, or the child's school or daycare. School-based exchanges are common during the school year, one parent drops off, the other picks up.</P>
      <P>Predictable, neutral exchange locations tend to be easiest on children and parents alike. A familiar, low-key setting reduces the emotional weight of the transition. Brief, focused exchanges are generally easier on children than extended ones, particularly during periods of strong attachment. Information exchange between parents is valuable, but the handoff itself should be kept calm and brief for the child's benefit.</P>
      <HelpsWorkWell items={[
        "Use consistent, predictable locations that feel neutral and familiar to the child.",
        "Keep exchanges brief and calm. The child's transition is easier when it is low-key.",
        "Define timing expectations clearly so both parents and the child know what to expect.",
      ]} />
      <ChildPerspective items={[
        "The child transitions between households at defined times. The experience of that transition depends heavily on how predictable and calm it is.",
        "Exchanges at neutral, familiar locations reduce the emotional complexity of the transition.",
        "A child moving from an exciting environment mid-activity experiences the transition differently than one coming from a routine moment. Predictable locations and timing help.",
        "Having familiar items available in both homes reduces what the child needs to carry and what the exchange needs to coordinate.",
      ]} />
      <CoordBlock
        intro="Exchange structure generates a few recurring communication topics between parents."
        items={[
          "How delays are communicated and within what timeframe",
          "Who is notified when pickup or dropoff arrangements change unexpectedly",
          "How school-day versus non-school-day exchanges are handled differently",
          "What happens when weather, traffic, or other conditions affect timing",
        ]}
      />
      <ConsiderBlock>Real-world commute conditions, traffic, school pickup windows, activity start times, affect how easily exchanges fit into daily routines. The number and timing of exchanges influences how transitions are experienced. Extended or emotionally charged exchanges are harder on children, particularly younger ones and during periods of adjustment.</ConsiderBlock>
      <ExampleBlock>During the school year, exchanges may occur at the child's school, with one parent responsible for drop-off and the other responsible for pick-up. During non-school periods, exchanges shall occur at each parent's residence or a mutually agreed neutral location unless otherwise agreed.</ExampleBlock>
      <SectionDivider />
      <SH>Transportation Responsibility</SH>
      <P>Parenting plans typically assign responsibility for transportation to either the parent who is beginning their parenting time or the parent ending their time, these are two ways of describing the same handoff. Clarity here prevents missed exchanges and removes a recurring source of friction.</P>
      <HelpsWorkWell items={[
        "Assign transportation responsibility clearly for each type of exchange.",
        "Define timing expectations for arrival.",
        "Establish a process for communicating delays before they become problems.",
        "Identify backup plans for when transportation arrangements fall through.",
        "The parent ending their parenting time should have the child organized and ready to go before the exchange.",
      ]} />
      <ChildPerspective items={[
        "Knowing who is picking them up and when gives the child a sense of predictability.",
        "Consistent transportation arrangements reduce the uncertainty of transitions.",
      ]} />
      <CoordBlock
        intro="Transportation responsibility generates a few specific communication topics."
        items={[
          "How delays are communicated, who notifies whom and within what timeframe",
          "When and how backup transportation is activated if primary plans fall through",
          "Who is contacted if plans change unexpectedly close to the exchange time",
        ]}
      />
      <ExampleBlock>The parent beginning their custodial period shall be responsible for picking up the child from school or the other parent's residence. Each parent shall be responsible for their own transportation costs. If a delay occurs, the delayed parent shall notify the other parent as soon as reasonably possible.</ExampleBlock>
      <SectionDivider />
      <SH>Third-Party Exchanges</SH>
      <P>In some situations, exchanges can involve a third party at a different agreed-upon location. This could be a non-parental family member picking the child up, or a trusted individual at a school or daycare. Third-party exchanges can reduce direct contact between parents at transitions, which may support smoother handoffs when direct interaction is difficult.</P>
      <CoordBlock
        intro="Third-party exchanges may require clear communication and defined expectations."
        items={[
          "Identification of approved third parties and/or designated neutral locations",
          "Ensuring any third party understands the schedule and expectations in advance",
          "Communication between parents about exchange details",
          "Responsibility for coordination with the third party",
        ]}
      />
      <ExampleBlock>Exchanges may occur through a mutually agreed third party or at a designated neutral location unless otherwise agreed in writing. The parties shall ensure that any third party involved in exchanges is informed of the schedule and expectations.</ExampleBlock>
      <SectionDivider />
      <SH>Personal Items and Preparedness</SH>
      <P>Exchanges often involve the movement of personal items, clothing, school materials, medications, a favorite toy, a comfort item. Maintaining the essentials in both homes reduces what the child needs to carry, simplifies exchanges, and keeps the handoff focused on the child rather than logistics.</P>
      <ChildPerspective items={[
        "Having familiar items available in both homes or vehicles reduces the sense of disruption during transitions.",
        "Not having to pack up belongings for every exchange makes the transition feel more routine and less like an event.",
      ]} />
      <CoordBlock
        intro="Personal items may require coordination between households to reduce friction at exchanges."
        items={[
          "Maintaining appropriate clothing, toiletries, and daily necessities in each household",
          "Ensuring prescription medications travel with the child as needed",
          "Communicating about items that need to be transferred between households",
          "Keeping school materials and activity equipment accessible in the right home at the right time",
        ]}
      />
      <ExampleBlock>Each parent shall maintain appropriate clothing, toiletries, and general necessities for the child within their household. Prescription medications shall travel with the child between households as needed.</ExampleBlock>
      <CommonQs items={[
        {q:"Should exchanges happen at neutral locations rather than either parent's home?",a:"It depends on the complexity of the relationship between the parents. Some families find that exchanges at home work perfectly well. Others find that a neutral, public location, a grocery store parking lot, a fire station, a school, makes transitions easier for everyone, including the child. The right answer depends on what reduces friction and keeps exchanges brief and calm."},
        {q:"What if one parent is consistently late to exchanges?",a:"Most plans include a general expectation of punctuality and a notification requirement for delays. Repeated lateness may be addressed through the dispute resolution process in the plan."},
        {q:"Is there guidance on how long an exchange should take?",a:"Most plans do not specify duration, but brief, focused exchanges are generally easier on children. Extended exchanges, particularly when one environment is more stimulating or when attachment is strong, can make the transition harder."},
      ]} />
      <KeyTakeaways items={[
        "Predictable, neutral exchange locations are generally easiest on children and parents.",
        "Brief, calm exchanges reduce the emotional complexity of transitions, particularly for younger children.",
        "Transportation responsibility should be clearly assigned. Ambiguity here is a recurring source of friction.",
        "Maintaining daily essentials in both homes reduces what the child needs to carry and simplifies exchanges.",
        "Third-party exchanges are a valid option when direct contact between parents at transitions is difficult.",
      ]} />
    </div>
  );
}

function CommunicationLearn() {
  return (
    <div>
      <Orientation>Parenting plans define schedules, decisions, and logistics. Communication is what makes all of it function. How parents share information, resolve questions, and stay in contact with the child has a direct effect on the child's daily experience across both homes.</Orientation>
      <SH>Parent-to-Parent Communication</SH>
      <P>Parenting plans often include expectations regarding how parents exchange information and coordinate matters related to the child. These expectations may address method of communication, timing and responsiveness, sharing of information, and communication during routine and non-routine situations.</P>
      <P>Using a consistent method helps organize information and reduces misunderstandings. Keeping communication focused on child-related matters supports coordination and reduces the opportunities for friction that arise when communication expands beyond its purpose.</P>
      <HelpsWorkWell items={[
        "Designate a primary communication platform and use it consistently.",
        "Keep communication focused on the child's schedule, health, education, and activities.",
        "Define response time expectations so both parents know what to expect.",
        "Use a platform that creates a record when that may be useful.",
      ]} />
      <ChildPerspective items={[
        "When parents communicate well and predictably, the continuity of care helps the child feel stable and grounded.",
        "Maintaining clear communication around scheduling, pickups, school, and activities keeps the child focused on their own life rather than caught up in their parents' logistics.",
      ]} />
      <CoordBlock
        intro="Parent-to-parent communication covers a set of recurring topics that both parents need to stay current on."
        items={[
          "Schedule changes and upcoming parenting time adjustments",
          "School updates, events, and academic concerns",
          "Medical appointments, health changes, and care decisions",
          "Activity schedules, conflicts, and logistical changes",
          "How to reach each other outside normal channels when something urgent comes up",
        ]}
      />
      <ConsiderBlock>Differences in communication style or expectations may affect how information is shared. At times, communication may become limited, delayed, or more difficult. Clear structure can help maintain continuity when communication is not consistent.</ConsiderBlock>
      <ExampleBlock>The parties shall communicate regarding matters related to the child's schedule, education, health, and activities. Communication shall occur through [designated platform] unless otherwise agreed, except in the case of emergency.</ExampleBlock>
      <SectionDivider />
      <SH>The Child As Messenger</SH>
      <P>Using a child to relay messages, convey information, or ask questions between parents places the child in the middle of the adult relationship in a way that creates anxiety and loyalty conflict. Most parenting plans address this directly. The child should not be asked to deliver messages, relay requests, report on the other household, or serve as an intermediary in any form. All communication regarding the child belongs between the parents directly.</P>
      <ExampleBlock>The parties shall not use the child to convey messages, ask questions, or communicate between parents. All communication regarding the child's care, schedule, and well-being shall occur directly between the parents.</ExampleBlock>
      <SectionDivider />
      <SH>Disparagement</SH>
      <P>Many parenting plans include a provision addressing how parents speak about each other in front of the child, and how people in each parent's household speak about the other parent. Negative comments about the other parent in the child's presence are experienced by the child as an attack on part of themselves. Courts take disparagement seriously, and for good reason.</P>
      <ExampleBlock>Neither party shall make disparaging remarks about the other parent in the presence of the child, nor shall they allow others in their household or extended family to do so. This provision extends to social media and other forms of communication where the child or the child's social network may be exposed to such remarks.</ExampleBlock>
      <SectionDivider />
      <SH>Emergency Communication</SH>
      <P>When events affect the child's health or safety, a parent may need to communicate immediately outside of normal channels. Most plans address this explicitly, with a standard expectation of notification as soon as reasonably possible.</P>
      <CoordBlock
        intro="Emergency communication operates separately from routine communication and has its own expectations."
        items={[
          "When immediate communication is required outside normal channels",
          "How to reach each other when the primary platform is not accessible",
          "What information needs to be shared and how quickly",
        ]}
      />
      <ExampleBlock>A parent may make emergency decisions affecting the child's health or safety while the child is in their care. The parent shall notify the other parent of the emergency and any actions taken as soon as reasonably possible.</ExampleBlock>
      <SectionDivider />
      <SH>Communication with the Child</SH>
      <P>Parenting plans often address how the child communicates with each parent during the other's parenting time. Consistent, reasonable access to the other parent supports the child's sense of connection and security.</P>
      <CoordBlock
        intro="The child's contact with the non-present parent has its own expectations, separate from parent-to-parent communication."
        items={[
          "Frequency and timing of calls or video calls with the other parent",
          "Method of communication: phone, video, or other agreed-upon means",
          "Whether communication is scheduled or flexible",
          "Ensuring communication does not interfere with the child's routine in the other household",
        ]}
      />
      <ExampleBlock>The child may have reasonable communication with the other parent during each parent's custodial period. Such communication shall not be monitored or interrupted. Communication shall occur at reasonable times and shall not interfere with the child's routine.</ExampleBlock>
      <SectionDivider />
      <SH>Information Sharing</SH>
      <P>Both parents having direct access to school and medical records, and the ability to communicate independently with providers, supports continuity across households. Receiving forwarded information is not the same as being directly in the loop. Each parent should ensure they are actively listed with schools, providers, and other relevant parties.</P>
      <ExampleBlock>Both parents shall have access to records related to the child's education, health, and activities and may communicate directly with relevant providers. Each parent shall provide the other with information and documentation received that is not otherwise accessible.</ExampleBlock>
      <CommonQs items={[
        {q:"Are there apps designed specifically for co-parent communication?",a:"Yes. Platforms including OurFamilyWizard, TalkingParents, and Cozi are designed for co-parent communication and create timestamped records of exchanges. Some plans specify one of these; others leave the choice to the parents."},
        {q:"Can the disparagement provision apply to social media?",a:"Yes. Many plans now explicitly include social media as a covered platform. Posting negative content about the other parent where the child or the child's social network could see it is increasingly addressed in parenting plans."},
        {q:"What if the other parent does not respond to communication in a reasonable timeframe?",a:"Most plans include a general expectation of timely response without specifying a hard deadline. Persistent non-response may be addressed through the dispute resolution process in the plan."},
      ]} />
      <KeyTakeaways items={[
        "Communication is how everything else in the plan actually functions. Its structure matters as much as any other provision.",
        "Children should not be used to relay messages. The reason is the child's wellbeing, not the parents' convenience.",
        "Negative comments about the other parent in the child's presence are experienced by the child as an attack on part of themselves.",
        "Designating a primary communication platform creates a record and reduces ambiguity.",
        "The child's communication with the non-present parent is a separate topic from parent-to-parent communication, with its own expectations.",
      ]} />
    </div>
  );
}

function PitfallsLearn() {
  return (
    <div>
      <Orientation>The language choices made while drafting a parenting plan shape how it functions, and how it may struggle, long after the circumstances that produced it have changed. Understanding common drafting problems before a plan is finalized gives you the capacity to ask better questions and contribute to clearer, more durable language.</Orientation>
      <P>Drafting issues are often not identified at the time a plan is written. They tend to appear later, when the plan is relied upon in specific situations. A provision may seem workable in general terms but become less clear when applied to a particular set of circumstances.</P>
      <SH>Vague Language</SH>
      <P>Some provisions describe general expectations without clearly defining how they are carried out. References to "reasonable" arrangements, "mutual agreement," or "as needed" adjustments without additional detail can seem functional when written but create interpretation gaps over time. When terms are not clearly defined, different interpretations develop, and those interpretation gaps are among the most common sources of disputes after a parenting plan is in place.</P>
      <HelpsWorkWell items={[
        "Replace 'reasonable' with specific timelines, locations, or processes wherever possible.",
        "Define what happens when parents do not agree on what is 'reasonable.'",
        "Review the plan for every instance of 'as agreed' and ask what the plan provides without that agreement.",
      ]} />
      <ConsiderBlock>Vague language often reflects an optimistic assumption at the time of drafting that both parties will interpret terms the same way. That assumption erodes over time, particularly when circumstances or the relationship between parents changes.</ConsiderBlock>
      <SectionDivider />
      <SH>Overly Rigid Provisions</SH>
      <P>Some plans include highly specific terms that do not allow for adjustment when circumstances change. For example, a plan that specifies "exchanges shall occur at 5:00 PM at Parent A's residence every Monday and Wednesday" may be unworkable if either parent's work schedule changes or the family relocates. These provisions may reflect an effort to create certainty but can become unworkable when schedules shift or unexpected situations arise.</P>
      <P>In practice, rigid terms often require informal adjustment, which may not be reflected in the written plan. The gap between the document and how the plan is actually lived is where most post-finalization friction originates.</P>
      <HelpsWorkWell items={[
        "Build flexibility mechanisms into the plan rather than relying on rigid specificity.",
        "Define how changes can be made by agreement without requiring court involvement.",
        "Distinguish between provisions that need to be specific and those that benefit from flexibility.",
      ]} />
      <SectionDivider />
      <SH>Emotional or Reactive Language</SH>
      <P>Some provisions are shaped by a specific moment, disagreement, or concern rather than a broader structure. This can appear as language focused on past behavior, anticipated future conflict, or attempts to define how a parent should act in general terms. For example, a provision that reads "Parent A shall not discuss the litigation with the child" addresses a specific concern from a specific moment. A provision that reads "Neither parent shall discuss adult legal matters with the child" addresses the same concern in a way that is durable and applies equally.</P>
      <ConsiderBlock>Emotionally reactive provisions often feel necessary at the time of drafting and unnecessary later. Courts are sometimes skeptical of provisions that read as punitive rather than functional.</ConsiderBlock>
      <SectionDivider />
      <SH>Non-Enforceable Expectations</SH>
      <P>Some plans include expectations related to tone of communication, personal conduct, or general cooperation that are not tied to specific, observable actions. For example, "Both parents shall communicate respectfully at all times" is an aspiration, not an enforceable provision. "Both parents shall communicate through [designated platform] regarding child-related matters" is enforceable. Non-enforceable provisions may feel meaningful at the time of drafting but provide little practical recourse when they are not followed.</P>
      <SectionDivider />
      <SH>Logistical Gaps</SH>
      <P>Some provisions address a general structure but leave practical details undefined, exchange timing, transportation responsibilities, travel arrangements, or coordination during schedule changes. When logistical details are not clearly addressed, additional coordination is required in situations where the plan should provide a clear reference point. These gaps tend to surface at the most inconvenient moments.</P>
      <ChildPerspective items={[
        "Drafting problems show up in the child's experience as inconsistencies and uncertainties.",
        "When parents dispute what a provision means, the child often experiences the consequences of that dispute before it is resolved.",
        "When clear, specific language is used in plans, a more stable environment is established for the child, not because the plan is perfect, but because it reduces the frequency of disputes about what it means.",
      ]} />
      <ConsiderBlock>These types of issues may lead to additional discussion or revision as situations arise. In some cases, they affect how consistently the plan is followed. They may also increase the time and cost associated with developing and enforcing a parenting plan.</ConsiderBlock>
      <ExampleBlock>Exchanges shall occur at [time] and [location] unless otherwise agreed. The parent beginning their custodial period shall be responsible for transportation. If a delay occurs, the delayed parent shall notify the other parent as soon as reasonably possible.</ExampleBlock>
      <CommonQs items={[
        {q:"Should I have a professional review a plan even if both parents agree on everything?",a:"Most family law professionals recommend at least a review even when parents have reached full agreement. A plan that works well now may have gaps that create problems later. The cost of a review is almost always less than the cost of addressing those gaps through litigation."},
        {q:"Can a plan be changed if a drafting problem is discovered after it is finalized?",a:"Yes, through the modification process, either by mutual agreement or through a formal legal process. The easier path is to identify and address drafting problems before finalization."},
      ]} />
      <KeyTakeaways items={[
        "Parenting plans are written at one moment in time and lived for years. Language precision matters more than it appears during drafting.",
        "Vague terms create interpretation disputes. Specific language creates a reference point that holds.",
        "Parenting plans function best when they provide structure while allowing room for predictable changes over time.",
        "Logistical gaps surface at the most inconvenient moments. If the plan does not specify, parents still have to figure it out, and that process often produces friction.",
      ]} />
    </div>
  );
}

function ModificationLearn() {
  return (
    <div>
      <Orientation>Parenting plans are designed to provide structure, but circumstances change across both households. How a plan is built to adapt, and how disagreements are handled when they arise, shapes whether the plan continues to serve the child over time or becomes a recurring source of conflict.</Orientation>
      <SH>How Parenting Plans Change Over Time</SH>
      <P>Two different types of change happen within parenting plans over time, and it helps to understand them separately.</P>
      <P>The first is informal flexibility, parents who have a working relationship often adjust scheduling informally as life shifts. A weekend swap here, a schedule change during a school break there. These informal adjustments are common and often practical. The risk is that they may not be enforceable if the relationship later deteriorates and they were never documented.</P>
      <P>The second is formal modification, a meaningful change to the structure of the parenting plan itself. This is not simply a matter of both parents agreeing and writing something down. Courts generally require that a meaningful change in circumstances has occurred, or that a modification clearly serves the best interest of the child. The Questions section below addresses this threshold in more detail.</P>
      <HelpsWorkWell items={[
        "Communicate clearly and in advance when a change is being considered.",
        "Document agreed changes in writing, even when the change seems minor.",
        "Understand which changes may require formal modification and which can be handled by agreement.",
        "Maintain the existing schedule consistently while changes are being discussed.",
      ]} />
      <ChildPerspective items={[
        "The child's routine may change over time. Stability depends on how those changes are handled, not whether they happen.",
        "When changes are made collaboratively and communicated clearly, children adapt more easily.",
        "Abrupt or contested changes are harder on children than planned ones, regardless of the outcome.",
      ]} />
      <CoordBlock
        intro="Managing change within an existing parenting plan involves a few recurring logistics."
        items={[
          "Identifying when a change is needed and raising it through the agreed process",
          "Communicating proposed adjustments clearly and with reasonable lead time",
          "Timing and implementation of changes to minimize disruption",
          "Maintaining the existing arrangement consistently while changes are being worked out",
        ]}
      />
      <ConsiderBlock>Documenting agreed changes in writing protects both parents. Informal modifications are common and often workable in the short term, but they may not be enforceable if the relationship between parents deteriorates later.</ConsiderBlock>
      <ExampleBlock>The parties may agree to modify aspects of the parenting plan as circumstances change. Any agreed-upon modifications shall be documented in writing and signed by both parties.</ExampleBlock>
      <SectionDivider />
      <SH>Formal Modification</SH>
      <P>In some situations, parenting plans may require formal modification through a legal process, when changes significantly affect the parenting arrangement or when parents are unable to reach agreement. Courts typically require a showing that circumstances have meaningfully changed before approving a modification over one parent's objection. The existing plan typically remains in effect while modification is being pursued.</P>
      <CoordBlock
        intro="Formal modification involves a defined legal process with its own logistics."
        items={[
          "Understanding the threshold for formal modification in your jurisdiction",
          "Staying in communication with whoever is guiding your process, whether an attorney, mediator, or other resource",
          "Maintaining the existing schedule during the modification process",
          "Documenting what has changed and why the modification is being sought",
        ]}
      />
      <ExampleBlock>If the parties are unable to reach agreement on a proposed change, either party may seek modification through the appropriate legal process. The existing parenting plan shall remain in effect pending resolution unless otherwise ordered.</ExampleBlock>
      <SectionDivider />
      <SH>Dispute Resolution</SH>
      <P>Parenting plans may include defined methods for addressing disagreements, about scheduling, decisions, or interpretation of the plan, before further action is taken. Having a defined process provides a path forward when direct communication has reached an impasse. Resolutions reached through that process may need to be documented or, in some cases, approved by the court to become formally enforceable.</P>
      <CoordBlock
        intro="Dispute resolution may involve a range of logistics depending on the nature of the disagreement."
        items={[
          "Method for addressing disagreements: direct communication, mediation, parenting coordinator",
          "Whether third-party involvement is available or required before court action",
          "Maintaining the existing schedule during disputes",
          "Documenting disagreements and attempted resolutions",
          "Understanding when court approval may be required to formalize a resolution",
        ]}
      />
      <ConsiderBlock>Not all disagreements require formal resolution. Many can be resolved through direct communication or with the assistance of a mediator. Having a defined escalation path means the process does not have to be invented in the middle of a conflict.</ConsiderBlock>
      <ExampleBlock>In the event of a disagreement, the parties shall make a reasonable effort to resolve the issue through direct communication. If unable to reach agreement, they may seek the assistance of a neutral third party, such as a mediator, unless otherwise agreed.</ExampleBlock>
      <SectionDivider />
      <SH>Maintaining Stability During Disagreements</SH>
      <P>Some parenting plans include explicit provisions stating that the existing schedule and structure remain in effect while disagreements are being addressed. Following the existing plan during disputes will protect the child's stability while disagreements are resolved.</P>
      <ExampleBlock>Unless otherwise agreed in writing or ordered by the court, the existing parenting plan shall remain in effect while any disagreement or modification is being addressed.</ExampleBlock>
      <CommonQs items={[
        {q:"What does a 'substantial change in circumstances' mean for modification?",a:"Courts typically require a significant change in circumstances to approve a modification over one parent's objection, relocation, significant changes in the child's needs, or major changes in a parent's availability are common examples. The threshold varies by jurisdiction. This is worth discussing with a professional familiar with your state's standards."},
        {q:"Can parents change the plan informally without going to court?",a:"Yes, informal modifications are common. Documenting agreed changes in writing matters because informal modifications may not be enforceable if the relationship between parents deteriorates later. A written record protects both parents and provides clarity about what was agreed and when."},
        {q:"What happens if one parent unilaterally changes the schedule without agreement?",a:"Unilateral changes that violate the existing plan may be addressed through the dispute resolution process or through the court. The existing plan remains enforceable until formally modified or a new agreement is documented."},
      ]} />
      <KeyTakeaways items={[
        "Circumstances change across both households. Parenting plans need to adapt, that is expected, not a failure.",
        "Documenting agreed changes in writing protects both parents and provides a clear record of what was agreed.",
        "Formal modification may be required for significant changes, particularly when parents cannot agree. There is generally a threshold that must be met.",
        "Dispute resolution provisions provide a path forward before conflict escalates.",
        "The existing plan remains in effect during disputes. Following it protects the child's stability while disagreements are being addressed.",
      ]} />
    </div>
  );
}

function NegotiationLearn() {
  return (
    <div>
      <Orientation>In some respects, this entire process is a negotiation, from the first informal conversation about arrangements to the final document. This section focuses on what that negotiation experience actually looks like in practice, where it tends to stall, and what helps it move forward.</Orientation>
      <SH>How Parenting Plans Are Reached</SH>
      <P>Parenting plans are developed through discussion and negotiation. Often times this process involves attorneys and mediators. Parents seldom begin with complete agreement, and the structure takes shape gradually as different topics are considered and resolved. Resolution at the end of the process occurs over a period of time rather than all at once. Some areas feel straightforward while others require more time for clarification and adjustment.</P>
      <HelpsWorkWell items={[
        "Understand what each part of the parenting plan is for before you begin negotiating it.",
        "Know how decisions translate into daily life. This makes it easier to evaluate options clearly.",
        "Stay open to how discussions develop in real time, even when you arrive with a position.",
      ]} />
      <ChildPerspective items={[
        "The child may not be directly aware of the process but experiences changes as decisions are made.",
        "Transitions, routines, and expectations may shift during the negotiation period.",
        "How consistently decisions are implemented once they are made matters more to the child than the process itself.",
      ]} />
      <CoordBlock
        intro="The dynamics of negotiation involve a few recurring patterns worth understanding in advance."
        items={[
          "Discussions typically occur over time rather than in a single conversation",
          "Information may be revisited or clarified as the process continues",
          "The tone and subject of communication may shift depending on the topic being addressed",
          "Outside input from professionals may be part of the process at various stages",
        ]}
      />
      <ConsiderBlock>Not all decisions carry the same weight or feel equally straightforward. The pace of conversations varies depending on the topic, the individuals involved, and where the process currently stands.</ConsiderBlock>
      <SectionDivider />
      <SH>Emotional Responses During the Process</SH>
      <P>Discussions around parenting plans may involve topics that carry personal, emotional, or practical weight. At times, conversations can become difficult, pause unexpectedly, or shift in tone as different issues are addressed. It is okay to step away and take a break, for a few minutes or longer. These discussions are charged by emotion, but they need to return to as objective a footing as possible. Recognizing that emotional difficulty during negotiations is expected, not a sign that the process has failed, makes it easier to stay in it.</P>
      <HelpsWorkWell items={[
        "Understand how different parts of the parenting plan function before the conversation begins. This supports more grounded discussions.",
        "Recognize that emotional difficulty is expected, not a sign of failure.",
        "Allow space for breaks when conversations become too charged to be productive.",
      ]} />
      <CoordBlock
        intro="The emotional dynamics of negotiation have their own patterns."
        items={[
          "Topics may need to be revisited after initial conversations when emotions have settled",
          "Professionals may help guide or structure difficult discussions",
          "Pauses in the process do not necessarily mean the process has ended",
        ]}
      />
      <SectionDivider />
      <SH>Working with Professionals</SH>
      <P>Attorneys, mediators, and parenting coordinators can be extremely helpful in organizing discussions, clarifying options, or helping parents move through areas where agreement is more difficult to reach. Having a working understanding of how parenting plan components function improves the quality of those interactions because you will be better equipped to ask specific questions and properly evaluate what is being proposed.</P>
      <CoordBlock
        intro="Working with professionals involves a few practical realities."
        items={[
          "Information may be shared through professionals rather than directly between parents",
          "Discussions may occur in structured settings with defined roles for each participant",
          "Communication may be guided or facilitated rather than free-form",
        ]}
      />
      <ConsiderBlock>What changes when you are prepared is your capacity to engage effectively, the ability to ask specific questions and evaluate what is being proposed. The scope of what is available to negotiate remains the same.</ConsiderBlock>
      <SectionDivider />
      <SH>Agreements and Tradeoffs</SH>
      <P>Parenting plans reflect a combination of priorities, preferences, and practical considerations. Some decisions involve balancing multiple factors simultaneously, schedules, logistics, the child's needs, each parent's circumstances. A decision about time-sharing may affect what is possible for holidays. A decision about legal custody may affect how education and medical care are handled.</P>
      <HelpsWorkWell items={[
        "Understand how different parts of the plan interact before negotiating any single section.",
        "Recognize that movement in one area may require movement in another.",
        "Approach negotiations with awareness of the whole structure, not just the section being discussed.",
      ]} />
      <CoordBlock
        intro="Agreements that span multiple sections of the plan have their own dynamics."
        items={[
          "Discussions may involve multiple topics at once",
          "Earlier agreements may need to be revisited as the overall structure becomes clearer",
          "Decisions in one area may create constraints or opportunities in another",
        ]}
      />
      <CommonQs items={[
        {q:"How long does the process typically take?",a:"The time required varies significantly. Some plans are finalized in weeks; others take months or longer, particularly when formal legal proceedings are involved."},
        {q:"Is it normal for earlier agreements to be revisited?",a:"Yes. Progress in parenting plan negotiations often involves revisiting earlier decisions as the overall structure becomes clearer. Iteration is part of the process."},
        {q:"What if one parent refuses to negotiate or engage?",a:"When direct negotiation is not possible, mediation is often the next step. If mediation fails, court involvement may be necessary. The legal process provides a structure even when informal agreement is not achievable."},
      ]} />
      <KeyTakeaways items={[
        "Parenting plan negotiations rarely move in a straight line. Revisiting earlier decisions is normal.",
        "Emotional difficulty during negotiations is expected. Stepping away when needed and returning is part of the process.",
        "Preparation changes your capacity to engage effectively with professionals, not the scope of what is available to negotiate.",
        "Agreements often involve tradeoffs across multiple areas. A decision in one section may affect what is possible in another.",
        "The process ends when the plan is finalized, either by agreement or through a court order.",
      ]} />
    </div>
  );
}

function AdditionalLearn() {
  const provisions = [
    {
      title:"Travel Provisions",
      why:"Travel provisions appear in many parenting plans because travel intersects directly with parenting time, school schedules, and the other parent's ability to maintain contact with the child.",
      body:"Intrastate travel is generally unrestricted in most plans, though some include a notice requirement for extended trips away. Interstate travel often triggers a notice requirement, notifying the other parent of where the child will be and for how long. Many plans specify a timeframe, typically ranging from 14 to 30 days in advance. International travel typically involves more formal notification requirements, and plans often require sharing of itinerary and contact information for any extended travel. Note: travel provisions vary significantly by jurisdiction and by individual plan. Verifying specifics with a professional familiar with your state is worthwhile.",
      questions:["Is travel, including extended domestic or international travel, likely to be relevant to your situation?","What advance notice of travel plans feels appropriate?","How will itinerary and contact information be shared during travel?"],
    },
    {
      title:"Passport Control",
      why:"Passport provisions are among the most overlooked in parenting plans, until they become urgent. Either parent can generally apply for a child's passport with appropriate documentation.",
      body:"Because passport applications can sometimes be processed without the other parent's direct involvement, some parenting plans address this explicitly. The most common arrangement is simply that one parent holds the passport, often the primary residential parent. More formal arrangements, such as holding the passport with a neutral party, exist but are less common. Options include requiring mutual consent for passport applications, specifying which parent holds the passport when not in use, or placing the passport with a neutral party or professional. The key is knowing where the passport is and having a clear process for when it is needed.",
      questions:["Does your family's situation make passport control a relevant provision?","Where will the child's passport be held?","Is mutual consent for passport applications something your plan should address?"],
    },
    {
      title:"Right of First Refusal",
      why:"Right of first refusal is a provision many parents have never heard of until it becomes relevant. It addresses what happens when a parent needs childcare during their parenting time.",
      body:"When a right of first refusal provision is included, if a parent needs a third party to care for the child for longer than a defined period, commonly four to eight hours, the other parent is offered the opportunity to care for the child before a third party is used. The concept is straightforward. The execution requires careful definition: what length of absence triggers it, how much advance notice the offering parent must give (calling five minutes before needing childcare is not workable), how quickly the other parent must respond, what counts as childcare, and how the provision interacts with work schedules. Poorly defined right of first refusal provisions are a common source of post-finalization conflict.",
      questions:["Is right of first refusal something you want to explore?","If so, what length of absence would trigger it in your situation?","What advance notice would be required, and what would a reasonable response window look like?"],
    },
    {
      title:"New Relationships and Household Changes",
      why:"When a parent enters a new relationship or changes their household composition, it directly affects the environment the child spends time in. Some parenting plans address this; many do not.",
      body:"Provisions in this area can include a minimum relationship duration before a new partner is introduced to the child, a requirement to notify the other parent before introduction, guidelines around overnight guests while the child is present, and expectations around cohabitation. These provisions vary significantly. Some families address them in detail; others leave them to each parent's judgment. The question worth thinking about is whether clarity in advance would reduce friction over time.",
      questions:["Are provisions around new relationships or household changes relevant to your situation?","Is there a notification expectation that would feel appropriate?","Are there specific circumstances that make this worth addressing explicitly?"],
    },
    {
      title:"Extracurricular Activities and Cost Sharing",
      why:"Extracurricular activities create obligations across both households, scheduling, transportation, and financial contribution. When not addressed clearly, disagreements about enrollment, cost, and participation can become recurring friction.",
      body:"This is distinct from the day-to-day management of activities covered in the Education / Medical / Activities section. The focus here is on the cost-sharing provisions themselves: how costs are divided for agreed-upon activities, what happens when one parent enrolls a child without the other's agreement, how expenses are documented and reimbursed, and what counts as an activity requiring joint agreement versus routine participation.",
      questions:["How will costs be divided for agreed-upon activities?","What is the process when one parent wants to enroll the child in an activity the other parent has not yet agreed to?","How will expenses be documented and reimbursement handled?"],
    },
    {
      title:"Technology, Devices, and Social Media",
      why:"Technology provisions in parenting plans address the digital environment the child lives in across both households, not just how parents communicate, but how the child's own digital life is managed.",
      body:"Provisions in this area can include expectations around social media posting of the child by either parent, whether consent is required, what types of content, what platforms, as well as the child's own access to devices and accounts. When is a child allowed to have a phone? What age for social media accounts? What parental controls, if any? Screen time expectations across households. These are increasingly common provisions because differing approaches between households create visible friction for the child. The focus is not primarily on parent-to-parent communication (covered in the Communication section) but on the child's digital environment itself.",
      questions:["Are technology or social media provisions relevant to your family's situation?","Are there specific expectations around social media posting of the child that should be addressed?","How will the child's own device access and social media use be handled as they get older?"],
    },
  ];
  const [openSet, setOpenSet] = useState(new Set());
  const toggle = (i) => { setOpenSet(prev => { const next = new Set(prev); next.has(i)?next.delete(i):next.add(i); return next; }); };
  return (
    <div>
      <Orientation>Parenting plans vary widely in what they include beyond the core provisions. The topics here are examples of provisions that appear in many parenting plans, though the list is not exhaustive. Every family dynamic is a little different, and often a lot different, which means each unique parenting plan reflects that. The goal is to ensure that you know there is optionality surrounding more family-specific topics in a parenting plan. Some of these provisions will be directly relevant to your circumstances. Others may not apply at all.</Orientation>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:16}}>
        {provisions.map((p,i) => {
          const isOpen = openSet.has(i);
          return (
            <div key={i} style={{border:`1.5px solid ${isOpen?AMBER:RULE}`,borderRadius:8,background:isOpen?AMBER_LIGHT:"#fff",overflow:"hidden"}}>
              <div onClick={()=>toggle(i)} style={{padding:"13px 17px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:11,color:isOpen?AMBER:"#ccc",flexShrink:0,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s",lineHeight:1,userSelect:"none",display:"inline-block"}}>▶</span>
                <span style={{fontWeight:600,color:NAVY,fontSize:14}}>{p.title}</span>
              </div>
              {isOpen&&(
                <div style={{padding:"0 17px 18px"}}>
                  <div style={{borderLeft:`3px solid ${AMBER}`,paddingLeft:14,marginBottom:14}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:AMBER,marginBottom:5}}>WHY IT APPEARS IN SOME PLANS</div>
                    <div style={{fontSize:13,color:NAVY,lineHeight:1.7,fontStyle:"italic"}}>{p.why}</div>
                  </div>
                  <P>{p.body}</P>
                  <div style={{background:"#F0F4F8",borderRadius:8,padding:"13px 16px",marginTop:12}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:SLATE,marginBottom:8}}>QUESTIONS WORTH THINKING ABOUT</div>
                    {p.questions.map((q,j) => (
                      <div key={j} style={{display:"flex",gap:8,fontSize:13,color:SLATE,lineHeight:1.7,marginBottom:j<p.questions.length-1?4:0}}>
                        <span style={{color:AMBER,flexShrink:0}}>?</span><span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <KeyTakeaways items={[
        "These are examples of provisions that appear in many parenting plans, not a complete list. Every parenting plan is unique to the family it serves.",
        "There is optionality around more family-specific topics. Knowing these conversations exist before you are sitting in one is the point.",
        "Right of first refusal, passport control, and travel provisions are the ones that most often surprise parents when they come up.",
        "The reflection questions in this section are designed to help you identify which of these topics deserve a conversation with a professional.",
      ]} />
    </div>
  );
}

function ClosingReflect({ session, onAnswer, onFlag }) {
  return (
    <div>
      <div style={{background:NAVY,color:"#fff",padding:"20px 24px",borderRadius:10,marginBottom:26,lineHeight:1.85}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:15,fontStyle:"italic",marginBottom:9,color:"rgba(255,255,255,0.9)"}}>In practice, parenting plans define how daily life is structured over time, across two homes, for the children involved.</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.78)"}}>The sections in this system were designed to provide clarity on how those structures function and are experienced in real situations. Some aspects may feel straightforward. Others will require more time, more discussion, or professional guidance. That is expected. The goal is not to resolve every detail here. The goal is to understand the structure well enough to participate in that resolution effectively.</div>
      </div>
      <ReflectSection sectionId="closing" session={session} onAnswer={onAnswer} onFlag={onFlag} />
    </div>
  );
}

function CompletionPage({ onViewSummary }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 32px",textAlign:"center",maxWidth:560,margin:"0 auto"}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:AMBER,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:24,fontSize:28}}>✓</div>
      <div style={{fontSize:22,fontWeight:600,color:NAVY,marginBottom:12}}>You have completed your preparation.</div>
      <div style={{fontSize:14,color:SLATE,lineHeight:1.8,marginBottom:32}}>
        Everything you have worked through is now assembled in your preparation summary. This is the document to bring to your first meeting with an attorney, mediator, or other professional involved in your process.
      </div>
      <button onClick={onViewSummary} style={{padding:"14px 32px",background:NAVY,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif",marginBottom:16,width:"100%",maxWidth:320}}>
        View My Summary
      </button>
      <div style={{fontSize:13,color:SLATE,lineHeight:1.7,marginTop:16}}>
        You can return to any section at any time to revise your answers. Your responses are saved automatically.
      </div>
      <div style={{fontSize:12,color:"#aaa",marginTop:24,lineHeight:1.6}}>
        This system is for educational and preparation purposes only. It does not constitute legal advice and does not replace an attorney, mediator, or other legal professional.
      </div>
    </div>
  );
}

function SummaryDrawer({ session, onClose }) {
  const allQs = Object.entries(QUESTIONS);
  const flagged = [];
  allQs.forEach(([sid,qs]) => { qs.forEach(q => { if (session.answers[q.id+"__flag"]) flagged.push({sid,q,val:session.answers[q.id]||""}); }); });
  const hasContent = allQs.some(([,qs]) => qs.some(q => (session.answers[q.id]||"").trim().length > 0));
  return (
    <div style={{position:"absolute",top:0,right:0,bottom:0,width:340,background:"#fff",borderLeft:`1px solid ${RULE}`,display:"flex",flexDirection:"column",zIndex:100,boxShadow:"-2px 0 12px rgba(0,0,0,0.06)"}}>
      <div style={{padding:"13px 17px",borderBottom:`1px solid ${RULE}`,background:NAVY,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{color:"#fff",fontWeight:600,fontSize:13}}>Your Preparation Summary</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:17}}>
        {!hasContent?(
          <div style={{color:SLATE,fontSize:13,lineHeight:1.7,textAlign:"center",paddingTop:40}}>
            <div style={{fontSize:28,marginBottom:12}}>◎</div>
            Your summary will appear here as you complete the reflection questions in each section.
          </div>
        ):(
          <>
            {flagged.length>0&&(
              <div style={{marginBottom:22}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:AMBER,marginBottom:9}}>FLAGGED FOR DISCUSSION</div>
                {flagged.map(({sid,q,val},i)=>(
                  <div key={i} style={{padding:"9px 11px",background:AMBER_LIGHT,border:`1px solid ${AMBER}`,borderRadius:6,marginBottom:7}}>
                    <div style={{fontSize:11,color:AMBER,fontWeight:600,marginBottom:3}}>⚑ {SECTIONS.find(s=>s.id===sid)?.short}</div>
                    <div style={{fontSize:11,color:SLATE,fontStyle:"italic",marginBottom:3}}>{q.text}</div>
                    {val&&<div style={{fontSize:12,color:NAVY}}>{val}</div>}
                  </div>
                ))}
              </div>
            )}
            {allQs.map(([sid,qs])=>{
              const answered = qs.filter(q=>(session.answers[q.id]||"").trim().length>0);
              if (!answered.length) return null;
              return (
                <div key={sid} style={{marginBottom:20}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:AMBER,marginBottom:7}}>{SECTIONS.find(s=>s.id===sid)?.label?.toUpperCase()}</div>
                  {answered.map(q=>(
                    <div key={q.id} style={{marginBottom:9,paddingBottom:9,borderBottom:`1px solid ${RULE}`}}>
                      <div style={{fontSize:11,color:SLATE,fontStyle:"italic",marginBottom:2}}>{q.text}</div>
                      <div style={{fontSize:12.5,color:NAVY,lineHeight:1.6}}>{session.answers[q.id]}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
      {hasContent&&<div style={{padding:"13px 17px",borderTop:`1px solid ${RULE}`}}>
        <button onClick={()=>window.print()} style={{width:"100%",padding:"10px",background:NAVY,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Print / Save as PDF</button>
      </div>}
    </div>
  );
}

export default function PPPS() {
  const [session, setSession] = useState(() => initSession());
  const [activeSection, setActiveSection] = useState(session.last_active_section || "intro");
  const [activeTab, setActiveTab] = useState("learn");
  const [showSummary, setShowSummary] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState("");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const contentRef = useRef(null);
  const saveTimer = useRef(null);

  const persist = useCallback((s) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({...s, updated_at: new Date().toISOString()})); } catch(e) {}
  }, []);

  const autosave = useCallback((s) => {
    setSaveIndicator("Saving...");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist(s);
      setSaveIndicator("Saved");
      setTimeout(() => setSaveIndicator(""), 2500);
    }, 700);
  }, [persist]);

  const handleAnswer = useCallback((qid, val) => {
    setSession(prev => {
      const next = {...prev, answers: {...prev.answers, [qid]: val}};
      const allQs = Object.values(QUESTIONS).flat();
      const done = allQs.filter(q => (next.answers[q.id]||"").trim().length > 0).length;
      next.completion_status = done === 0 ? "not_started" : done === allQs.length ? "complete" : "in_progress";
      if (done === allQs.length && !next.completed_at) {
        next.completed_at = new Date().toISOString();
        setShowCompletion(true);
      }
      autosave(next);
      return next;
    });
  }, [autosave]);

  const handleFlag = useCallback((qid, val) => {
    setSession(prev => {
      const next = {...prev, answers: {...prev.answers, [qid+"__flag"]: val}};
      autosave(next);
      return next;
    });
  }, [autosave]);

  const handleNotes = useCallback((val) => {
    setSession(prev => {
      const next = {...prev, quick_notes: val};
      autosave(next);
      return next;
    });
  }, [autosave]);

  const navigateToSection = useCallback((sectionId) => {
    setActiveSection(sectionId);
    const tabs = SECTION_TABS[sectionId] || ["learn"];
    setActiveTab(tabs[0]);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    setSession(prev => {
      const next = {...prev, last_active_section: activeSection, last_active_tab: activeTab};
      persist(next);
      return next;
    });
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeSection, activeTab]);

  const getOverall = () => {
    const qs = Object.values(QUESTIONS).flat();
    const done = qs.filter(q => (session.answers[q.id]||"").trim().length > 0).length;
    return { done, total: qs.length, pct: Math.round(done/qs.length*100) };
  };

  const getSectionProgress = (sid) => {
    const qs = QUESTIONS[sid];
    if (!qs) return null;
    const done = qs.filter(q => (session.answers[q.id]||"").trim().length > 0).length;
    return { done, total: qs.length };
  };

  const tabs = SECTION_TABS[activeSection] || ["learn"];
  const sectionIdx = SECTIONS.findIndex(s => s.id === activeSection);
  const prevSection = sectionIdx > 0 ? SECTIONS[sectionIdx-1] : null;
  const nextSection = sectionIdx < SECTIONS.length-1 ? SECTIONS[sectionIdx+1] : null;
  const { pct } = getOverall();

  const handleNext = () => {
    if (nextSection) { navigateToSection(nextSection.id); }
    else { setShowCompletion(true); }
  };

  const renderContent = () => {
    if (showCompletion) return <CompletionPage onViewSummary={() => { setShowCompletion(false); setShowSummary(true); }} />;
    if (activeSection === "intro") return <IntroLearn />;
    if (activeSection === "process") return activeTab === "reflect" ? <ReflectSection sectionId="process" session={session} onAnswer={handleAnswer} onFlag={handleFlag} /> : <ProcessLearn />;
    if (activeSection === "closing") return <ClosingReflect session={session} onAnswer={handleAnswer} onFlag={handleFlag} />;
    if (activeSection === "additional") return activeTab === "reflect" ? <ReflectSection sectionId="additional" session={session} onAnswer={handleAnswer} onFlag={handleFlag} /> : <AdditionalLearn />;
    if (activeTab === "reflect") return <ReflectSection sectionId={activeSection} session={session} onAnswer={handleAnswer} onFlag={handleFlag} />;
    if (activeSection === "timesharing") return activeTab === "compare" ? <TimesharingCompare /> : <TimesharingLearn />;
    if (activeSection === "holidays") return activeTab === "explore" ? <HolidaysExplore /> : <HolidaysLearn />;
    if (activeSection === "legalcustody") return activeTab === "compare" ? <LegalCustodyCompare /> : <LegalCustodyLearn />;
    if (activeSection === "edmedact") return <EdMedActLearn />;
    if (activeSection === "transportation") return <TransportationLearn />;
    if (activeSection === "communication") return <CommunicationLearn />;
    if (activeSection === "pitfalls") return <PitfallsLearn />;
    if (activeSection === "modification") return <ModificationLearn />;
    if (activeSection === "negotiation") return <NegotiationLearn />;
    return null;
  };

  const layers = ["orientation","core","awareness","closing"];
  const sectionsByLayer = layers.map(layer => ({
    layer, label: LAYER_LABELS[layer],
    sections: SECTIONS.filter(s => s.layer === layer),
  }));

  // Responsive: check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"Inter,sans-serif",background:"#F8F6F1",overflow:"hidden",position:"relative"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Header */}
        <div style={{padding:"11px 16px",background:"#fff",borderBottom:`1px solid ${RULE}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={"data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAQABAADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAEIBwkCBQYEA//EAGcQAAEDAgMEBAULDA4FCgYDAQEAAgMEBQYHEQgSITETQVFhIjJxgZEUFTM3QlJicoKxsxYjNkN0dZKUoaKy0gkXGCRTVVZjc5OVtNHTNDU4g6MlJkRFVGRlwcLwJyhXhaTDRoTh8f/EABoBAQACAwEAAAAAAAAAAAAAAAAEBQIDBgH/xAA2EQEAAgECBAMGBgEFAQEBAQAAAQIDBBEFEiExE0FRIjIzUnGBFUJhkaGxFCM0Q8HR4YLwJP/aAAwDAQACEQMRAD8AuSilQgcUREBFKIIRSiCD3IiICedSiAVHUpRBCdSKUEKURAUKUKCERTzQQinyqEBFKIIUooQFKIgKFKdyCEREBERARO5OfBBCIp5oCFFJ70EJ50RATqTrRA6kTyogIiICIiBqiIexAQopQQpUKUEKVCIHHtREQEUoghFKFBCIiAiIgIiICIpQCoUqEBOpFPlQRxRT3Iggoh0RBKhSiCFPnREEIiIClQpQFClPKghEUoI70UqEBEUlBHnRSUQQhRT3II4oiICIiAilQgJ1KVCAiJ3IHkREQEREAoilBCJ5UQO1OKJ1oHkREKAinuUIHFERARFKCEREBSiIChSoQEQp1oCIiCVClQgckCdakICIiCFKJ1oIRFKAoUqEEqFKdaCECKUEIilAUKUQQiIgIiIIU9yHsRBCIpQEUoghERAREQEREBO5SoQE60RAREQFKhSghTyUKUEIilBCFT1qEBFKdaCEUoghERARSoQEREBEUoIREQE7kRARSiCCiJ1oClEQQiKUEIp86hAROtSgKFKhAU+VQpQQid6ICIiAilEEIiIHWnWiIHlREQEUlEEeVFKhARSiCERSghETrQEREBERAROtEBEUoITuUqEBOtEQFKIghFKICIiAiIghSiICIiAiIeSCFKKUEIilBCIiAiIgIiICKVHcgIiICIiAilQgKFKIIRSiCFKIg4qURBKKVCCFKIghFKICIiAnWiICgKUQCiIgIiICIiCFKIgIiIC6nGd5Zh7CV3v0gaW26hmqyHcj0bC7T8i7dYg2wL160ZE3mJryyW5SQ0EenXvyAvH4DXrZipz5Ir6ywyW5azLIeAb27EmB7FiB7WMfcrdBVvazxWukja4geQkhd2sPbHN59dsibTC5+/JbZp6F/cGvLmD8B7VmHzJmpyZLV9JMduakShFKLWzEREBERBClEQFClEBERAREQEQogIiICIiAFClEAoilBHWoXJQgIiICIiAiIgIilBCIiCEUogJ3IiAiIgdahSiCFKIgIiICIiAiIgIiIIUoiAiIgIiIIUoiApREEIpRAREQQilEEKURBClEQEREEKURAREQEREEKURAUKUQEREEKURAREQEREEIiICIpQQilQghSUQoJREQQpREEIpRAUKUQQilEBQpRAREQEREBERAREQFClEBVW2/ryW0GFcOsfwlnnrpW/EaI2fSP9CtSqIbat59c875qFrvAtVvp6XT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xivzTG7a5qFK1l4czEx5h3cbZMYXujjZ4sQq3PiHyH7zfyLJeG9qXM22BrLkLNe2Dm6ppTDIflRED81U1+FZY92YlaU4hjnv0XpRVgw7te2WXdbiHB1xo+2ShqWVA8uj9w/OskYc2h8pb1uM+qhltmd9ruMD6fT5ThufnKLfSZqd6yk11GK/azK6Lr7Ne7Peqf1RZ7rQ3GH39LUMlb6Wkr7wQVGmNu7dvulERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARQiCUREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARQiCUREBFCICIiCUREBERAREQEREBERAREQEREGPMysrxjSaab6uMY2UyMDegt1y3Kflpxj046+VYBxNsh35kj57FjG317zqdLjTPhf8AhtL9T5grgopOLV5cXSstOTBjye9DXpiPIDNqyb734VkuMLftluqGVGvkbqH/AJqx1eLVdLLUGnvNsrrZMPcVlO+F354C2n6BflVU1PVQuhqoIp4ncHMkYHNPmPBTacWvHvViUS/DqT7s7NVIOo1BBHaEWxfEuSOVeIHOfW4LtkMp+20TTSv17dYi3XzrGuI9kjB9UHPsOIr1apDybNuVUY8xDXfnKXTimG3vRMI1+HZI7Tupip86y9nNkLe8tLGb7WYls1dQOnbBE0NkhqJXu14NYQQdACT4XAArECnYstMteak7wh5Mdsc7WFKhFsYJQKEQSoUrOmT+zlccwMMUeJfqxtdHbqrXRlPTvnmjLTo5jw4sDXAjTTj28QteXNTFHNedobMeK+WdqsFI4ho1c4NHaTort4b2UMvqHckvFwvd5kHjNfO2niPmjAd+cslYZyky1w5uOtOC7NFIzxZpacTSj5cm878qgX4rij3YmUynDrz707NeFgw3iLED9yw2C63U66fvOjklA8pA0HpWScPbOObV3cx0tjprRE/7ZcK1jPzGb7vSFfuNjI2BkbWsa0aBoGgA8i5eRRL8WyT7sRCTTh2OPendU3CmyLXwzR1d4x2KOZpBLbTSua4eSVzgdfkqwWXeA2YNY5rMV4qvm8wMAu9yNQ1nxW6ABewUqFl1WXL70pePBTH7sCIijtoiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIoUoCIiAiIgIiICIiAiIgIiICIiAiIgdaIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIihBKIiAiIghSoRBKIiAiIgIiICIiAiIgIiICIiAiIgIiICHgixHtT5inAOW80dBP0d7vG9SUBafCi1H1yYfEaeB985qzx45yWite8sb3ilZtKse1rmH9W2ZUluoKnpLLYi+lp90+DLNrpNL38QGA9jNRzWGupODW9gA6+pZRygyNxpmK6Othg9Z7G7Qm5VkZAkH80zgZPLwb8JdTXw9NjiJnaIc/PPqMkzEMXdSKxm0tkthvLfLCx3CwtqZ6xtxFPX1lRJvPnEkbiDoPBa0OZwAHXxJ5quaywZq5q81WObDbFblsKVCs5kxs/4ezByOorzW1NVbL5V1NTJTV0J3h0Yf0bWyRng5vgE8NDx5rzPnrgrFrGHDbLMxVWNWB2Lcw/qbxtJg65T7tsvzh6mLj4MVYBo3ydI0bvxmsWPM1Mosa5cVDn3u39PbN7SO50mr6d3YHHTWM9zgO4leEikkhlZLDI+KVjg9kjDo5jgdQ4HqIIBXl601OKYid4llSb6fJEzDa0ix/kBj6PMXLWgvcjmC4xD1Lco2+5qGAbx7g4EPHc7TqWQFyt6TS01nvDoK2i0bwIiLFkIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAoKlEBERBCKUQQiKUBERAREQEREBERAREQEREBERAREQEREEOcGtLnEADiSepUUzDbi/aDzhrpcIW+Wrs9A/wBQ0lS87lNBC13GR7yNNXu1foNXEbo04K8V2t9JdbZVWyvi6WkqonQzxhxbvscNHDUEEagkcFxs1rt1mtsFttNDT0NFTt3IaenjDGMHYAOCk6fP4EzaI3lpzYvFjlmejCuUOzXhHCLoLniQsxLeGaOBnj0pYXfAiOu8R75+vaAFnVoDQABoAOQUotWTLfLPNed2dMdaRtWGKtq+0+u+Q2JGsZvSUcUdazu6KRr3H8EOWvg8ytpGLLYy94Xutml8SvopqZ3kewt/81q23Xx/W5AWyM8F4PMOHAj0q54Tfelq+ir4lX2q2C7daXe9BPoWy7Jiz+sGU+FrSWbj6e1wCQfDLA5/5zitcuEbU6+4ss1kaONwuEFL5nyNafyEraPG0NYGtGgHAALDi9/dqz4bX3rONTBDUU8kFREyWKRpY9j2hzXNPAgg8CD2KvGbuy9h++umumB5osP3B2rjRuaTRSnuA4wn4urfgqxaKqxZr4p3pOywyYq5I2tCk2QldifJPOSPDONbdUWy3X8tpHvk4wOlB+szMkHguGp3ToeAfxA0V2NV12JLFZ8SWia03220txoZho+CojD2nvGvIjqI4jqX3U8TIII4I94sjaGt3nFx0A04k8Se8rPUZ4zTF5jafNjhxeFHLE9H6IihR25KIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIghERBKIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgg8lrRzntHrFm3iu1hm4yK7Tujb2Me7pG/mvC2XrXbtQ3Kku2fOKaiiA6OKojpXOHupIomRvP4TSPMrXhMz4sx+iv4jEeHH1ftsq2n13z5w0x7N6OkklrX93RROLT+GWLYYFrz2WL+3D+eeH5ZHAQV7326XX+eboz/iBi2GA6hY8V38WN/R7w/bwvuIiKsTxERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERBCIpQEREBERAREQEREBERAREQEREBERAREQEREBERB1WL7zT4dwtdL9VkdBbqSWqf3hjC7Tz6aLV7W1NRXVk9bWSGSpqZXTTPJ4ue8lzj6SVePbZxH6z5OutMUgbPe6yOl0B49E367IfJoxrflKi5V9wrHtjm/qqOI33tFfR+1DV1Fvrqe4Ujy2opZWTwuHU9jg5v5QFtEwxdqe/Yctt7pDrT3CljqoviyMDh861aDgdVfbY2xB695I0FI+Tfns9RLb36njutO/H5tx7R5l5xbHvSt/Q4bfa01ZnREVEtxERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBETuQQiKUBERAREQEREBERAREQEREBERAREQEREBERARFxe4NYXOIAA1J7AgpVt04j9csy7bh2KTWGzUO/I3smnO8fzGR+lV6Xo8zsRHFuYl/xGXFzK+vkkh15iIHdjHmY1q6Khpp62tp6KljMk9RKyGJg5uc4gAekrrNNj8LFWv6Oc1F/EyzL8FZnYIxB6mxViLDEjvBraSOthBPuonbj9O8tkb+Cqz6Dq4r3uz3f/qazowvcnP3YX1opJyToOjnBiJPcC5p8y81ePxMNoe6a/JliWx9FA5KVyjohERAREQQpREBERBClEQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEUKUBFCICIiCUREBERAREQEREBERAREQEREBERAREQEREBY82jsSHC2S+JLjFJuVMtIaSmOuh6SYiNpHeN4u8yyGqq7fOJd2jw5hCF/GWR9yqG9zQY4/SXSH5KkaTH4matWnUX5McyqYAAA0chwCyTs2WJ18zbtzjF0kFrp6i5S93RRncP9Y6NY2VoNiCwaWTG2K5I/8Ao4t1O/yMMsg/LF6F0esv4eGZ/wD7qpNLTnywq7B7BH8RvzLm10jHB8LiyRp3mOHMOHEH06L86f2CL4jfmC/RSGiZ2s2f5fX2PE+B7JiGMgi40ENSQOpzmAuHmOo8y71YF2IMQ+uuUD7NJIDLZa6WAN14iKT66zzavePkrPS5HPj8PJavo6TFfnpFhERamwREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARFCCUREBERBClEQEREBERAREQEREBERAREQEREBERAREQEREBERAUK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hoxwOjhqzUDRXB6l1eKMP2bE9mms9+t0FfQzDw4pW6gHqcDza4dThoQeRX22+n9SUMFL080/Qxtj6WZ29I/Qabzj1k9Z7Vsz5ozTzzHXzYYsfhxy+T90RFobRERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARFCCUUKUBQpRBCIiCUREBERAREQEREBERAREQEREBERAREQEREBYC248PeueU0F7jZrLZa+OVzusRS/Wn/nOjPmWfV53MuwMxTgC+4dcATcKCaBmvU8sO4fM7dPmW3Bk8PJW3o15ac9Jq1iLjP7BL8R3zFcgHDg8FrxwcD1Ecx6Vxn9gk+I75l1zm46SsXto37p5sEYZjf4NHaBWytB91KGsZr3gRu/CVdxzHYvb56Xv1+zRutU2QuipRDQxcdQGwRNjOncXB5868jaqCe63SjtdKNZ62eOmiHa6RwYPyuUfTUjHhiJb9RbxMs7L87I9hNiyKsbpI9ye5CS4y9/SuJYf6sMWWl8dkoKe1WejtlIwMp6OBkETR1NY0NH5AvsXL5b895t6r+leWsQIiLBkIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiFAREQEREEKVCIJREQEREBERAREQEREBERAREQEREBERAREQFB5KUQa2c+LF9TeceKrS1gZE24PnhaOQjm0laB3AP08y8QeOoVjdvLD/qLH9lxHGwCO50DqeQgc5YHa6nyskaPkquS6vS5PEw1t+jndTTkyzDlI50j3PeS5ziXEk6kk8yso7KVg9f89LC18e/BbjJcZe7om+Af6x0axYrWbAVg3pcUYpkj5dDboH+mWQfliXmsyeHgtLLSU580LYhERcq6AREQEREBERAREQEREBERARCiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiKEEoiIIUoiCERSgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiDBW23YPXbJp10YzWWzV0VUSBx6NxMT/N4YPyVRhbQMf2OPE2Cb1h+TTduNBNTAnqL2EA+Y6HzLV+WSRuMczSyVhLXtI0IcOBHpBV9wrJvjmnop+I02tFvU61f/ZEsHrFkXZXvZuT3QyXGXv6R3gf8NrFQago57jX09vpWl09XMyniaOZc9waPykLaRYLdBZ7HQ2mlGkFFTR08Q05NY0NH5AvOLX2pWnqy4bTrNn3IiKiWwiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiIIUoiAihSghERBKIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAoUogg8lri2iLD9TedWKLc1obC+tNZDoNBuTgSgDyFzh5lseVOdvew+psX4dxLG3RldRyUcpA93E/fbr3lsjvwVY8Lycubl9ULX05sW/oxtst2H1/wA88OxPYXQUMr7hLw5CFpLD/WGNbDhyCqPsBWHpLpifFEkZ+tRQ2+B+nAlxMknzRK3K84nfmz7ej3Q05cUT6iIir0wRFCApREEKURAUKUQQpREBERBClEQEREBERAREQQpREBERAREQQpREBERAREQFClEBERBCKUQEREBQpRAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEUdalAREQEREBERAREQEREBERAREQEREBERARQpQEREEIiIJREQEREBERAREQEREBERAREQEREBERAREQEREBYO21rCbtktNcGN1ks9dDV6jnuEmJ/5JNfMs4rpMfWIYnwRfMOlzGm5UE9K1zxqGuewta7zEg+ZbcN/DyVt6SwyU56TVjbY5sXrLkZa6h7Cya6zTXCQEcw926z8xjD51mRdZhO0x2DC9qscBBjt9HDSsIGgIjYG6/kXZrzLfxLzb1MdeWsVERFrZiIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiJ1oCIiAiIgIiIChSiAiIgIiICIiAiIgIiICIiAiIgIiIIUoiAiIgI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Wkjg0nU6dpJ61E12ow59rU7pOlw5MO9bdnp3f+YWrbFn2V3n741P0z1tKKwjXbMOWNbXVFbOy9mWomfM/S5OA3nOLjpw7SVjoNTTTzabeb3V4LZqxFVEFdDYJ9rK+/fx/wDd4V3H7lfKz3l9/tJ3+CyLlZl3h3Lez1Vpw4KwU1TUmpk9U1Bldv7jWcCRwGjRwUjWa7Hmxctd92nS6S+K/NL2C+DEFot9+slZZrtSx1VBWQuhnhfyexw0I7vKOIPFfeiqInZY92vPPTJnEOWl1lqGxT3DDT3/AL2uTW69GCeDJ9PEeOW9wa7mNDqBi/vW1iohhqIHwTxMlikaWvY9oc1wPMEHgQsS4y2csrMRyvqGWWSyVLzqZbVN0A1/oyDH+arnBxSIjbLH3Vebh+8745UBQEjrKtfddj5hlc61Y9ljj9yyrtoe4eVzHt+ZdQdkHEWvg41tOnfQS/rqdHENPP5v7RZ0WaPJWfvUeRWqtux7OXB1yx80N97TWvj6Xyf+SyNgnZky0w/LHU3GmrMQ1LCHA3GUGIH+iYGtI7nbywvxLBWOk7sq6DLM9eipWUWVmKsy7uyGzUzqe2MeBV3SZh6CAdeh+2P7GN69NSBxWwLL7CNnwPhOhw3Y4OjpKRmm87i+V54ukeetzjxJ8w0AAXdUVLTUVJFSUdPFTU8TQ2OKJgYxjRyAA4AL9lTarWX1E9ekeiz0+mrhjp3ERFESUKURAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREEIiIJREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREKCNfL6E18voWtTNe5XJuaeLmMuVc1jb5WhrW1UgAHTv0AGvALzXrrdf41uP43J+srevCptWJ5v4V1uI1rMxytqGvl9Ca+X0LVf66XTX/Wlw/G5P1l91rxZiq1Sia2YovlFJrrvQXGZv/q+dezwi3lb+HkcSr8raEpVIsrNqDGFirYaTGf/ADjtRIa+YMbHWRDtBGjZ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"} alt="Polaris Parenting Project" style={{height:36,width:36,objectFit:"contain",flexShrink:0}} />
            <div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:AMBER}}>POLARIS PARENTING PROJECT</div>
              <div style={{fontSize:12,fontWeight:600,color:NAVY,lineHeight:1.2}}>Parenting Plan System</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {saveIndicator&&<div style={{fontSize:11,color:"#bbb"}}>{saveIndicator}</div>}
            <button
              onClick={()=>setRailCollapsed(!railCollapsed)}
              title={railCollapsed?"Show progress":"Hide progress"}
              style={{padding:"6px 10px",background:"#fff",border:`1px solid ${RULE}`,borderRadius:6,cursor:"pointer",fontSize:11,color:SLATE,fontFamily:"Inter,sans-serif"}}
            >
              {railCollapsed?"Progress ▶":"Progress ▼"}
            </button>
            <button onClick={()=>setShowSummary(!showSummary)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:showSummary?NAVY:"#fff",border:`1.5px solid ${showSummary?NAVY:RULE}`,borderRadius:8,cursor:"pointer",color:showSummary?"#fff":SLATE,fontSize:12,fontWeight:500,fontFamily:"Inter,sans-serif"}}>
              <span style={{fontSize:13}}>◎</span>{showSummary?"Close":"Summary"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!showCompletion && tabs.length > 1 && (
          <div style={{background:"#fff",borderBottom:`1px solid ${RULE}`,display:"flex",padding:"0 16px",flexShrink:0}}>
            {tabs.map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"11px 16px",background:"none",border:"none",borderBottom:`2.5px solid ${activeTab===tab?AMBER:"transparent"}`,color:activeTab===tab?NAVY:SLATE,fontWeight:activeTab===tab?600:400,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif",marginBottom:-1}}>
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div ref={contentRef} style={{flex:1,overflowY:"auto",padding:showCompletion?"0":"20px 20px 72px"}}>
          {!showCompletion && (
            <div style={{maxWidth:680,marginBottom:16}}>
              <div style={{fontSize:11,color:"#bbb",marginBottom:2}}>Section {sectionIdx+1} of {SECTIONS.length}</div>
              <div style={{fontSize:18,fontWeight:600,color:NAVY}}>{SECTIONS[sectionIdx]?.label}</div>
            </div>
          )}
          <div style={{maxWidth:showCompletion?"none":680}}>
            {renderContent()}
          </div>
          {!showCompletion && (
            <div style={{maxWidth:680,display:"flex",justifyContent:"space-between",marginTop:36,paddingTop:18,borderTop:`1px solid ${RULE}`}}>
              {prevSection
                ?<button onClick={()=>navigateToSection(prevSection.id)} style={{padding:"9px 16px",background:"#fff",border:`1px solid ${RULE}`,borderRadius:8,cursor:"pointer",color:SLATE,fontSize:13,fontFamily:"Inter,sans-serif"}}>← {prevSection.short}</button>
                :<div/>}
              <button onClick={handleNext} style={{padding:"9px 16px",background:NAVY,border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontSize:13,fontWeight:500,fontFamily:"Inter,sans-serif"}}>
                {nextSection ? `${nextSection.short} →` : "Complete →"}
              </button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        {!showCompletion && (
          <div style={{position:"absolute",bottom:0,left:0,right:showSummary?340:0,background:"rgba(27,43,75,0.94)",color:"rgba(255,255,255,0.6)",fontSize:10,textAlign:"center",padding:"6px 16px",lineHeight:1.5,zIndex:50}}>
            This system is for educational and preparation purposes only. It does not constitute legal advice and does not replace an attorney, mediator, or other legal professional.
          </div>
        )}
      </div>

      {/* RIGHT RAIL */}
      {!railCollapsed && (
        <div style={{width:210,background:"#fff",borderLeft:`1px solid ${RULE}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 13px 8px",borderBottom:`1px solid ${RULE}`}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:"#444",marginBottom:2}}>YOUR PROGRESS</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:11,color:NAVY,fontWeight:500}}>Parenting Plan System</div>
              <div style={{fontSize:11,color:AMBER,fontWeight:600}}>{pct}%</div>
            </div>
            <div style={{height:3,background:RULE,borderRadius:2}}>
              <div style={{height:"100%",width:pct+"%",background:AMBER,borderRadius:2,transition:"width 0.3s"}}></div>
            </div>
          </div>

          <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
            {sectionsByLayer.map(({layer, label, sections}) => (
              <div key={layer}>
                <div style={{padding:"7px 13px 2px",fontSize:9,fontWeight:700,letterSpacing:"0.08em",color:"#aaa",textTransform:"uppercase"}}>{label}</div>
                {sections.map((s) => {
                  const prog = getSectionProgress(s.id);
                  const isActive = s.id === activeSection && !showCompletion;
                  const isDone = prog && prog.done === prog.total && prog.total > 0;
                  const globalIdx = SECTIONS.findIndex(sec => sec.id === s.id);
                  return (
                    <div key={s.id} onClick={()=>{ setShowCompletion(false); navigateToSection(s.id); }} style={{padding:"5px 11px 5px 13px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:7,background:isActive?"rgba(201,151,74,0.07)":"transparent",borderLeft:`2.5px solid ${isActive?AMBER:"transparent"}`}}>
                      <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,marginTop:1,background:isDone?AMBER:isActive?"rgba(201,151,74,0.2)":"#F0EDE8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:isDone?"#fff":isActive?AMBER:"#bbb",fontWeight:600}}>
                        {isDone?"✓":globalIdx+1}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:isActive?AMBER:isDone?"#bbb":NAVY,fontWeight:isActive?600:400,lineHeight:1.35}}>{s.short}</div>
                        {prog&&<div style={{fontSize:9,color:"#ccc",marginTop:1}}>{prog.done}/{prog.total}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{padding:"10px 11px 36px",borderTop:`1px solid ${RULE}`}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:"#444",marginBottom:4}}>QUICK NOTES</div>
            <textarea value={session.quick_notes} onChange={e=>handleNotes(e.target.value)} placeholder="Park thoughts here as you read..." rows={4} style={{width:"100%",border:`1px solid ${RULE}`,borderRadius:6,padding:"6px 8px",fontSize:11,color:NAVY,fontFamily:"Inter,sans-serif",resize:"none",background:"#FAFAF8",boxSizing:"border-box",outline:"none"}} />
          </div>
        </div>
      )}

      {/* SUMMARY DRAWER */}
      {showSummary&&<SummaryDrawer session={session} onClose={()=>setShowSummary(false)} />}
    </div>
  );
}
