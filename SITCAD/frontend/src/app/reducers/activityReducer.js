export const initialState = {
  // Flow step: "select" → "generating" → "results"
  step: "select",

  // Plan & activity selection
  selectedPlanId: null,
  selectedActivities: [],   // indices of activities chosen from the plan
  activityImageStyles: {},  // { [idx]: "cartoon" | "photorealistic" } — per-activity override

  // Generated results (from AI)
  generatedResults: [],     // [{title, description, type, duration, generated_content}]

  // Activity list view
  selectedActivity: null,   // for viewing an existing activity detail

  // Assign
  assignTo: "all",
  selectedStudents: [],
};

export const activityReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SELECT_PLAN":
      return {
        ...state,
        selectedPlanId: action.payload,
        selectedActivities: [],
        activityImageStyles: {},
      };

    case "SET_ACTIVITY_IMAGE_STYLE": {
      return {
        ...state,
        activityImageStyles: {
          ...state.activityImageStyles,
          [action.idx]: action.style,
        },
      };
    }

    case "TOGGLE_ACTIVITY": {
      const idx = action.payload;
      const selected = state.selectedActivities.includes(idx)
        ? state.selectedActivities.filter((i) => i !== idx)
        : [...state.selectedActivities, idx];
      return { ...state, selectedActivities: selected };
    }

    case "START_GENERATION":
      return { ...state, step: "generating" };

    case "FINISH_GENERATION":
      return {
        ...state,
        step: action.payload ? "results" : "select",
        generatedResults: action.payload || [],
      };

    case "RESET_FLOW":
      return {
        ...initialState,
        selectedActivity: state.selectedActivity,
      };

    case "TOGGLE_STUDENT":
      return {
        ...state,
        selectedStudents: state.selectedStudents.includes(action.studentId)
          ? state.selectedStudents.filter((id) => id !== action.studentId)
          : [...state.selectedStudents, action.studentId],
      };

    case "SELECT_ACTIVITY":
      return { ...state, selectedActivity: action.payload };

    default:
      return state;
  }
};
