export const dailyPreStartChecklist = {
  template_key: 'daily_pre_start',
  template_label: 'Daily Pre-Start V1 - 2026',
  sections: [
    {
      id: 'general',
      title: 'General',
      fields: [
        { id: 'injury_concerns', type: 'tri_state', label: 'Injury concerns' },
        { id: 'ppe_checked', type: 'tri_state', label: 'PPE checked on all workers' },
        { id: 'todays_work_activities', type: 'textarea', label: "Today's work activities", optional: true },
        { id: 'ppe_selection', type: 'selectable_tree', tree_ref: 'ppe', optional: true },
        { id: 'hazards_selection', type: 'selectable_tree', tree_ref: 'hazards', suggest_controls_category: true, optional: true },
        { id: 'controls_selection', type: 'selectable_tree', tree_ref: 'controls', optional: true }
      ]
    },
    {
      id: 'section_1',
      title: '1. Site access & General Conditions',
      fields: [
        { id: 'access_routes_clear', type: 'tri_state', label: 'Access routes clear and suitable for deliveries and workers' },
        { id: 'emergency_egress_unobstructed', type: 'tri_state', label: 'Emergency access/egress points are unobstructed' },
        { id: 'induction_register_current', type: 'tri_state', label: 'Site induction register is current (new workers inducted)' },
        { id: 'bins_available_segregated', type: 'tri_state', label: 'Bins available and segregated (metal, general, etc.)' },
        { id: 'evacuation_procedure_reviewed', type: 'tri_state', label: 'Evacuation procedure reviewed and understood' },
        { id: 'first_aid_kit_stocked', type: 'tri_state', label: 'First aid kit stocked and accessible' }
      ]
    },
    {
      id: 'section_2',
      title: '2. Weather & Environmental Hazards',
      fields: [
        { id: 'wind_conditions_acceptable', type: 'tri_state', label: 'Wind conditions acceptable for facade/working at height tasks' },
        { id: 'rain_moisture_not_affecting', type: 'tri_state', label: 'Rain or moisture not affecting EWP/scissor lift traction or materials' },
        { id: 'dust_noise_managed', type: 'tri_state', label: 'Dust/noise managed appropriately if applicable' }
      ]
    },
    {
      id: 'section_3',
      title: '3. Plant & Equipment (EWP, Scissor Lifts, Tools)',
      fields: [
        { id: 'ewp_prestart_checklists', type: 'tri_state', label: 'Daily pre-start checklists completed for EWPs/scissor lifts' },
        { id: 'operators_ticketed', type: 'tri_state', label: 'Operators are ticketed, signed on, and authorised' },
        { id: 'spotters_in_place', type: 'tri_state', label: 'Spotters in place where required' },
        { id: 'exclusion_zones_marked', type: 'tri_state', label: 'Plant exclusion zones clearly marked' },
        { id: 'equipment_parking_secure', type: 'tri_state', label: 'Equipment parking/charging/stowage areas safe and secure' },
        { id: 'tools_tagged_tested', type: 'tri_state', label: 'All tools and equipment are tagged, tested, used and stored properly' }
      ]
    },
    {
      id: 'section_4',
      title: '4. Working at Heights',
      fields: [
        { id: 'swms_height_tasks', type: 'tri_state', label: 'SWMS in place for all height-related tasks' },
        { id: 'harnesses_worn_checked', type: 'tri_state', label: 'Harnesses worn, checked, and attached to anchor points' },
        { id: 'edge_protection_installed', type: 'tri_state', label: 'Edge protection and handrails installed where required' },
        { id: 'fall_arrest_inspected', type: 'tri_state', label: 'Fall arrest systems inspected and within service' },
        { id: 'scaffold_platforms_compliant', type: 'tri_state', label: 'Scaffold and platforms tagged and compliant' }
      ]
    },
    {
      id: 'section_5',
      title: '5. Personnel and Contractor Supervision',
      fields: [
        { id: 'personnel_signed_in', type: 'tri_state', label: 'All personnel signed in and present on site' },
        { id: 'licences_verified', type: 'tri_state', label: 'High-risk work licences and white cards verified' },
        { id: 'toolbox_talk_delivered', type: 'tri_state', label: 'Toolbox talk delivered if required' },
        { id: 'swms_reviewed_signed', type: 'tri_state', label: 'Safe Work Method Statements (SWMS) reviewed, signed and followed' },
        { id: 'new_starters_supervised', type: 'tri_state', label: 'New starters supervised, mentored and added into site systems' },
        { id: 'trades_aware_zones', type: 'tri_state', label: 'All trades aware of overlapping work and zones' }
      ]
    },
    {
      id: 'section_6',
      title: '6. Site-Specific Hazards & Controls',
      fields: [
        { id: 'material_stacking_secure', type: 'tri_state', label: 'Material stacking/storage secure and stable' },
        { id: 'overhead_zones_marked', type: 'tri_state', label: 'Overhead work zones identified, and exclusion areas marked' },
        { id: 'traffic_management_plan', type: 'tri_state', label: 'Traffic management plan in place and followed' },
        { id: 'ladders_walkways_compliant', type: 'tri_state', label: 'Ladders, walkways, and access points stable and compliant' },
        {
          id: 'working_near_live_services',
          type: 'tri_state',
          label: 'Working near live services?',
          notes_if_yes: true,
          notes_hint: 'If yes, add controls in the notes section.'
        },
        { id: 'trip_hazards_marked', type: 'tri_state', label: 'Trip hazards removed or clearly marked' }
      ]
    },
    {
      id: 'section_7',
      title: '7. Communication & Documentation',
      fields: [
        { id: 'daily_briefing_conducted', type: 'tri_state', label: 'Daily pre-start briefing conducted' },
        { id: 'safety_alerts_displayed', type: 'tri_state', label: 'Safety alerts or updates displayed' }
      ]
    }
  ]
} as const
