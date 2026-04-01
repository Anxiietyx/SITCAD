export const initialReportState = {
  reportType: 'comprehensive',
  reportPeriod: 'term1',
  selectedStudents: [],
  generating: false,
  reports: [],
};

export function reportReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };
    case 'TOGGLE_STUDENT':
      return {
        ...state,
        selectedStudents: state.selectedStudents.includes(action.payload)
          ? state.selectedStudents.filter((id) => id !== action.payload)
          : [...state.selectedStudents, action.payload],
      };
    case 'SELECT_ALL_STUDENTS':
      return {
        ...state,
        selectedStudents: action.payload,
      };
    case 'SET_GENERATING':
      return {
        ...state,
        generating: action.payload,
      };
    case 'SET_REPORTS':
      return {
        ...state,
        reports: action.payload,
      };
    default:
      return state;
  }
}
