
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from "react";
// import '../../../index.css';
import { auth } from '../../firebase/firebase'; 
import SignInWithGoogle from "./ivanFiles/signinwithGoogle";


function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Move handleSubmit INSIDE the Login component
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
           
            await signInWithEmailAndPassword(auth, email, password);
            console.log("User logged in successfully!");
            window.location.href = '/profile'; // Or use navigate from react-router-dom
        } catch (error) {
            console.error("Error logging in:", error.message); 
            alert(error.message); 
        }
    };


    return (
        <>
            
            
        <div className="container">
            <form onSubmit={handleSubmit}>
                <div className="form_area">
                    <h3 className="title">This is the login page</h3>
                    <label class='sub_title'>Email: </label>
                    <input
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form_style"
                        required 
                    />

                    <br />

                    <label className="sub_title">Password: </label>
                    <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form_style"
                        required 
                    />

                    <br />

                    <button type='submit' className="btn">Submit</button>

                    <p>New User ?
                        <Link to="/register" >
                            <button type="button">Register</button>
                        </Link>
                    </p>
                    <SignInWithGoogle/>
                </div>
            </form>
        </div>
        </>
    );
}

export default Login;
