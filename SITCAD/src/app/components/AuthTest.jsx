import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase/firebase";

export function AuthTest() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user); // Set the logged-in user
      } else {
        setCurrentUser(null); // No user is logged in
      }
    });

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Extract user information
      const user = result.user;
      console.log("Google Login Result:", result);

      if (user) {
        setCurrentUser(user); // Update the state with the logged-in user
        console.log("User logged in successfully:", user);
      }
    } catch (error) {
      console.error("Error during Google login:", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully.");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">Authentication Status</h1>
        {currentUser ? (
          <div className="text-center">
            <p className="text-green-600 font-medium">User is logged in.</p>
            <p className="mt-2">
              <span className="font-bold">Email:</span> {currentUser.email}
            </p>
            <p>
              <span className="font-bold">Display Name:</span> {currentUser.displayName}
            </p>
            <p>
              <span className="font-bold">UID:</span> {currentUser.uid}
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-yellow-600 font-medium mb-4">No user is logged in.</p>
            <button
              onClick={handleGoogleLogin}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Log In with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
