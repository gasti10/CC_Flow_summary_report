export const dailyPreStartTrees = {
  ppe: {
    name: 'PPE',
    categories: [
      { id: 'high_visibility', title: 'High Visibility Required', items: [] },
      { id: 'head_protection', title: 'Head Protection', items: [{ id: 'hard_hat', title: 'Hard Hat' }] },
      {
        id: 'eye_face_protection',
        title: 'Eye/Face Protection',
        items: [
          { id: 'safety_glasses', title: 'Safety Glasses' },
          { id: 'face_shield', title: 'Face Shield' },
          { id: 'goggles', title: 'Goggles' }
        ]
      },
      { id: 'fall_protection', title: 'Fall Protection', items: [{ id: 'harness', title: 'Harness' }] },
      {
        id: 'foot_leg_protection',
        title: 'Foot & Leg Protection',
        items: [
          { id: 'long_pants', title: 'Long pants' },
          { id: 'steel_cap_boots', title: 'Steel cap work boots' }
        ]
      }
    ]
  },
  hazards: {
    name: 'Hazards',
    categories: [
      {
        id: 'environmental_hazards',
        title: 'Environmental Hazards',
        suggest_controls_category: 'environmental_controls',
        items: [
          { id: 'work_area_dirty', title: 'Work area dirty' },
          { id: 'dust_mist_fumes', title: 'Dust / mist / fumes' },
          { id: 'noise_in_area', title: 'Noise in area' },
          { id: 'extreme_temperatures', title: 'Extreme temperatures' }
        ]
      },
      {
        id: 'ergonomic_hazards',
        title: 'Ergonomic Hazards',
        suggest_controls_category: 'ergonomic_controls',
        items: [
          { id: 'over_extension', title: 'Over Extension' },
          { id: 'lift_too_heavy', title: 'Lift too heavy/awkward to lift' }
        ]
      },
      {
        id: 'overhead_hazards',
        title: 'Overhead Hazards',
        suggest_controls_category: 'overhead_controls',
        items: [
          { id: 'falling_objects', title: 'Falling objects' },
          { id: 'power_lines', title: 'Power lines' },
          { id: 'hoisting_overhead', title: 'Hoisting or moving loads overhead' }
        ]
      }
    ]
  },
  controls: {
    name: 'Controls',
    categories: [
      {
        id: 'environmental_controls',
        title: 'Environmental Controls',
        items: [
          { id: 'end_of_day_cleanup', title: 'Schedule end-of-day clean-ups for all crews.' },
          { id: 'dust_suppression', title: 'Use dust barriers or wet suppression methods.' },
          { id: 'weather_monitoring', title: 'Monitor weather and reschedule hazardous tasks.' }
        ]
      },
      {
        id: 'ergonomic_controls',
        title: 'Ergonomic Controls',
        items: [
          { id: 'reach_posture', title: 'Keep tools/materials within safe reach.' },
          { id: 'mechanical_aids', title: 'Use trolleys, hoists, forklifts or lifting aids.' }
        ]
      },
      {
        id: 'overhead_controls',
        title: 'Overhead Controls',
        items: [
          { id: 'tool_lanyards', title: 'Use tool lanyards and securing devices.' },
          { id: 'overhead_barriers', title: 'Install barriers and warning signage.' },
          { id: 'hoisting_controls', title: 'Use rated lifting equipment and tag lines.' }
        ]
      }
    ]
  }
} as const
