import { sendPasswordResetEmail } from "firebase/auth";
import { db } from "../firebase/firebase";


function ForgotPassword(){
    

    const handleSubmit = async(e)=>{
        e.preventDefault();
        try{
         await sendPasswordResetEmail(db,emalVal);
         const emalVal = e.target.email.value;
         console.log("Email has been sent");
         
        } catch (error) {
            console.error("Error sending email", error.message);
            alert(error.message);
        }
    }
    return(
        <div>
            <h1>Forgot Password</h1>
            <form onSubmit={(e)=>handleSubmit(e)}>
                <input name="email" /><br/><br/>
                <button>Reset</button>
            </form>
        </div>
    )
}
export default ForgotPassword;