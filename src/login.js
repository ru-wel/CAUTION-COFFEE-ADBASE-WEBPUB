import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Sign in screen.
const auth = getAuth();

const signIn = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // return userCredential;
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("An error has occured." `${errorCode} : ${errorMessage}`);
    });
}

export default signIn;    
