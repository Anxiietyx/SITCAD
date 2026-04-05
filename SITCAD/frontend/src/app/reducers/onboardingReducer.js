export const initialState = {
  role: null,
  acceptTerms: false,
  error: '',
  loading: false,
};

export const onboardingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ROLE':
      return { ...state, role: action.payload };
    case 'SET_ACCEPT_TERMS':
      return { ...state, acceptTerms: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};
