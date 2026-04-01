export const initialState = {
  open: false,
  selectedActivity: null,
  creationMode: "manual",
  targetScore: "70",
  scoringType: "percentage",
  title: "",
  description: "",
  type: "literacy",
  duration: "20",
  assignTo: "all",
  selectedStudents: [],
};

export const activityReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "TOGGLE_STUDENT":
      return {
        ...state,
        selectedStudents: state.selectedStudents.includes(action.studentId)
          ? state.selectedStudents.filter((id) => id !== action.studentId)
          : [...state.selectedStudents, action.studentId],
      };
    case "RESET_FORM":
      return {
        ...initialState,
        selectedActivity: state.selectedActivity, // Keep selectedActivity across resets
      };
    case "SET_OPEN":
      return { ...state, open: action.payload };
    case "SELECT_ACTIVITY":
      return { ...state, selectedActivity: action.payload };
    default:
      return state;
  }
};
