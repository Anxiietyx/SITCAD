export const initialState = {
  children: [],
  isLoadingChildren: true,
  addChildOpen: false,
  newChild: { name: '', age: '' },
  isSubmitting: false,
  reports: [],
  isLoadingReports: true,
};

export const parentReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_NEW_CHILD_FIELD':
      return { 
        ...state, 
        newChild: { ...state.newChild, [action.field]: action.value } 
      };
    case 'ADD_CHILD_SUCCESS':
      return {
        ...state,
        children: [...state.children, action.payload],
        newChild: { name: '', age: '' },
        addChildOpen: false,
      };
    case 'SET_ADD_CHILD_OPEN':
      return { ...state, addChildOpen: action.payload };
    default:
      return state;
  }
};
