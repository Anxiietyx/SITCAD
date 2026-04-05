export const initialState = {
  students: [],
  isLoadingStudents: true,
  assignDialogOpen: false,
  unassignedStudents: [],
  selectedStudentId: null,
  classroom: '',
  isSubmitting: false,
  isLoadingUnassigned: false,
};

export const teacherReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_STUDENTS':
      return { ...state, students: action.payload, isLoadingStudents: false };
    case 'SET_UNASSIGNED_STUDENTS':
      return { ...state, unassignedStudents: action.payload, isLoadingUnassigned: false };
    case 'SET_ASSIGN_DIALOG_OPEN':
      return { ...state, assignDialogOpen: action.payload };
    case 'ASSIGN_STUDENT_SUCCESS':
      return {
        ...state,
        students: [...state.students, action.payload],
        selectedStudentId: null,
        classroom: '',
        assignDialogOpen: false,
        isSubmitting: false,
      };
    default:
      return state;
  }
};
