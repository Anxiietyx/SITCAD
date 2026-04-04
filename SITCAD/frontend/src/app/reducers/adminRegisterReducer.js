export const initialAdminRegisterState = {
  email: '',
  password: '',
  fullName: '',
  adminSecret: '',
  error: '',
  loading: false,
};

export function adminRegisterReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'RESET_ERROR':
      return {
        ...state,
        error: '',
      };
    default:
      return state;
  }
}
