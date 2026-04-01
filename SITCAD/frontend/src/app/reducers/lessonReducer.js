export const initialState = {
  loading: false,
  lessonPlan: null,
  showSavedMsg: false,
  targetScore: "70",
  scoringType: "percentage",
  ageGroup: "5-6",
  learningArea: "literacy",
  topic: "",
  duration: "30",
  additionalNotes: "",
};

export const lessonReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "START_GENERATION":
      return { ...state, loading: true };
    case "FINISH_GENERATION":
      return { ...state, loading: false, lessonPlan: action.payload };
    case "SET_SAVED_MSG":
      return { ...state, showSavedMsg: action.payload };
    default:
      return state;
  }
};
