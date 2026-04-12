export const initialState = {
  // Step tracking: "form" → "generating" → "review" → (saved → back to form)
  step: "form",
  loading: false,
  lessonPlan: null,
  showSavedMsg: false,
  // Form fields (P-A)
  ageGroup: "5",
  learningArea: "literacy_bm",
  duration: "30",
  topic: "",
  additionalNotes: "",
  moralEducation: "moral",   // "moral" | "islam"
  language: "bm",            // "bm" | "en"
  planType: "subject",       // "subject" | "unit"
  durationWeeks: "3",        // "1"-"6" for unit plans
  imageStyle: "cartoon",     // "cartoon" | "photorealistic"
};

export const lessonReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "START_GENERATION":
      return { ...state, step: "generating", loading: true };
    case "FINISH_GENERATION":
      return { ...state, step: action.payload ? "review" : "form", loading: false, lessonPlan: action.payload };
    case "UPDATE_PLAN_FIELD":
      return { ...state, lessonPlan: { ...state.lessonPlan, [action.field]: action.value } };
    case "SET_SAVED_MSG":
      return { ...state, showSavedMsg: action.payload };
    case "RESET_FORM":
      return { ...initialState };
    default:
      return state;
  }
};
