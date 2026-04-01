export const initialRegisterState = {
  email: '',
  password: '',
  fullName: '',
  role: 'teacher',
  acceptTerms: false,
  error: '',
  loading: false,
};

export function registerReducer(state, action) {
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
