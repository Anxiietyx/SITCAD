export const initialState = {
  stats: { teacher: null, parent: null, admin: null },
  loading: false,
  error: null,
};

export const adminReducer = (state, action) => {
  switch (action.type) {
    case "SET_STATS":
      return { ...state, stats: action.payload, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};
