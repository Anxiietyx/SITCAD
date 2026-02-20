import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../../../firebase/firebase";
import { setDoc, doc } from "firebase/firestore";
import googleLogo from "../../../assets/google.png";

function SignInWithGoogle() {
    function googleLogin() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).then(async (result) => {
            console.log(result);
            const user = result.user;
            if (result.user) {
                await setDoc(doc(db, "User", user.uid),{
                    email: user.email,
                    //photo:user.photoURL,
                    //Name: user.displayName
                });
                window.location.href = '/profile';
            }
        });
    }
    return (
    <div>
      <p className="continue-p">--Or continue with--</p>
      <div
        style={{ display: "flex", justifyContent: "center", cursor: "pointer" }}
        onClick={googleLogin}
      >
        <img src={googleLogo} width={"60%"} />
      </div>
    </div>
  );
}

export default SignInWithGoogle;