export const initialState = {
  stats: { teacher: null, parent: null, admin: null, total: null },
  users: [],
  roleFilter: null,
  loading: false,
  loadingUsers: false,
  error: null,
};

export const adminReducer = (state, action) => {
  switch (action.type) {
    case "SET_STATS":
      return { ...state, stats: action.payload, loading: false };
    case "SET_USERS":
      return { ...state, users: action.payload, loadingUsers: false };
    case "SET_ROLE_FILTER":
      return { ...state, roleFilter: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_LOADING_USERS":
      return { ...state, loadingUsers: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
};
