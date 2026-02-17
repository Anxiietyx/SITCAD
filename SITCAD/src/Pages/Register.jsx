import { Link } from "react-router-dom"
import { createUserWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { auth, db } from "../firebase/firebase";
import { setDoc, doc } from "firebase/firestore";

function Register(){
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      console.log(user);
      if (user) {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          photo:""
        });
      }
      console.log("User Registered Successfully!!");
    } catch (error) {
      console.log(error.message);
    }
  };
            
        return (
            <div>
            <form onSubmit={handleRegister}>
                <h1>Sign Up</h1>

                <label>Email: </label>
                <input type="email" onChange={(e) => setEmail(e.target.value)} required/>

                <br/>

                <label>Password: </label>
                <input type='password' onChange={(e) => setPassword(e.target.value)} required/>

                <br/>

                <button type="submit">Sign up</button>

                <p>Have an account ?
                    <Link to="/login">
                        <button type="button">Login</button>
                    </Link>
                </p>

            </form>
            </div>
        );
        
    }
export default Register
