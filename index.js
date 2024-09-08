import express from 'express';
import { initializeApp } from "firebase/app";
// import { initializeApp as adminInitializeApp} from 'firebase-admin/app'; // FIREBASE ADMIN
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth"; // TO BE REFACTORED?
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, getDocs} from "firebase/firestore"; // TO BE REFACTORED? POSSIBLY : import * as firestore from 'firebase/firestore';
import bodyParser from 'body-parser';
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

dotenv.config(); // PROCESS .ENV FILE

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};

// const admin = adminInitializeApp(); // FIREBASE ADMIN

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const firestore = initializeApp(firebaseConfig);
const db = getFirestore(firestore);
const auth = getAuth(firestore);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname,'css')));
app.use(express.static(path.join(__dirname,'media'))); // SERVE STATIC FILES
// app.use(checkAuth) // CUSTOM MIDDLEWARE

app.get('/', (req, res) =>{ // --------- NEED PA SI FIREBASE ADMIN PARA MAS MAGING SECURE
    
    // const unsubscribe = onAuthStateChanged(auth, (user) => {
    //     if (user) {
    //       // User is signed in
    //         res.render('index.ejs', {email:user.email, isLoggedIn : true}) // EMAIL FOR PLACEHOLDER ONLY
    //     } else {
    //         res.render('index.ejs', {isLoggedIn : false});
    //     }
    //     unsubscribe();
    // });

    const user = auth.currentUser;
    if (user) {
        // User is signed in
        res.render('index.ejs', {email:user.email, isLoggedIn : true}) // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
    } else {
        res.render('index.ejs', {isLoggedIn : false});
    }
});

app.get('/signup', (req, res) => {
    const user = auth.currentUser;
    if (user) {
        // User is signed in
        res.render('signup.ejs', {isLoggedIn : true})
    } else {
        res.render('signup.ejs', {isLoggedIn : false});
    }
})

app.post('/signup_process', async function (req, res) {

    var data = { 
        fName: req.body.fName,
        lName: req.body.lName, 
        email: req.body.email,
        username: req.body.uName,
        password: req.body.password
    }

    try {
        // Create a user in Firebase Auth ------ WALA PANG ERROR HANDLING
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;
        const userID = user.uid;
    
        // Add user data to Firestore ------ WALA PANG ERROR HANDLING
        await setDoc(doc(db, "users", userID), {
            fName: data.fName,
            lName: data.lName,
            email: data.email,
            username: data.username,
            // password: data.password // Remember to hash passwords ----- TABALU IF LAGE KE PA KING DB
        });
        console.log("User created successfully. Document written with ID: ", userID); // ----- TO BE REMOVED
        const response = {
            message: "Document added successfully",
            documentId: userID // ----- TO BE REMOVED
        };
        console.log(response);
        res.redirect("/login");
    } catch (error) {
        console.error("Error: ", error);
        const response = {
            message: "Error adding document",
            error: error.message
        };
        console.log(response);
        res.redirect('/signup')
    }
});

app.get('/login', (req, res) => {
    const user = auth.currentUser;
    if (user) {
        // User is signed in
        res.render('login.ejs', {isLoggedIn : true})
    } else {
        res.render('login.ejs', {isLoggedIn : false});
    }
});

app.post('/login_process', async function (req, res) {
    signInWithEmailAndPassword(auth, req.body.email, req.body.password)
    .then((userCredential) => {
        // Signed in 
        // const user = userCredential.user;
        console.log("User logged in successfully!");
        res.redirect("/");
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("An error has occured." `${errorCode} : ${errorMessage}`);
    });
});

app.post('/logout', (req, res) => {
    signOut(auth).then(() => {
        // Sign-out successful.
        console.log("User signed out successfully!");        
        res.redirect("/");
    }).catch((error) => {
        // An error happened.
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("An error has occured." `${errorCode} : ${errorMessage}`);
    });
})

app.get('/profile', (req, res) => {
    onAuthStateChanged(auth, (user) => { // TO BE REFACTORED TO A FUNCTION ?
        if (user) {
            // User is signed in, 
            const uid = user.uid;
            async function fetchDocument(uid) { // DAPAT MAY ASYNC FUNCTION KAPAG GAGAMIT NG AW(a)IT OR NASA PINAKATAAS NG FUNCTION YUNG AW(a)IT
            try {
                // Define the document reference
                const docRef = doc(db, 'users', uid);
        
                // Retrieve the document snapshot
                const docSnap = await getDoc(docRef);
        
                if (docSnap.exists()) {
                    // Document data is available
                    const userData = docSnap.data();
                    res.render('profile.ejs', {uid:uid, user:userData, isLoggedIn : true})
                } else {
                    // Document does not exist
                    console.log("No such document!");
                }
            } catch (error) {
                // Handle potential errors
                console.error("Error fetching document:", error);
            }
        }
        fetchDocument(uid);
        } else {
          // User is signed out
          // ... -------- TO BE CONTINUED / TO BE HANDLED
        //   console.log("Please Log In");
        }
    });
});

app.get('/review', async function (req, res) {
    try {
        // Retrieve all documents from the "reviews" collection
        const querySnapshot = await getDocs(collection(db, "reviews"));
        const reviews = [];

        // Collect all reviews in an array
        querySnapshot.forEach((doc) => {
            reviews.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('review.ejs', { reviews, isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('review.ejs', { reviews, isLoggedIn : false, message : req.query.message});
        }
        
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Error fetching reviews"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.post('/review_process', async function (req, res) {

    var data = {
        rating: req.body.rating,
        message: req.body.message,
        date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    onAuthStateChanged(auth, async function (user) { // TO BE REFACTORED TO A FUNCTION ?
        var message
        if (user) {
            // User is signed in, 
            const uid = user.uid;
            async function fetchDocument(uid) { // DAPAT MAY ASYNC FUNCTION KAPAG GAGAMIT NG AW(a)IT OR NASA PINAKATAAS NG FUNCTION YUNG AW(a)IT
                            
            try {

                // Define the document reference
                const userDocRef = doc(db, 'users', uid);
        
                // Retrieve the document snapshot
                const docSnap = await getDoc(userDocRef);
                
                if (docSnap.exists()) {
                    // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                    const userData = docSnap.data();

                    const docRef = await addDoc(collection(db, "reviews"), {
                        username: userData.username,
                        rating: data.rating,
                        message: data.message,
                        dateCreated: data.date
                    }); 
                    console.log("Review added successfully.");

                    // UPDATE USER DATABASE WITH NEW REVIEW

                    const currentReviews = userData.reviews || []; // IF WALANG LAMAN YUNG REVIEWS ARRAY, CREATE NEW ARRAY

                    currentReviews.push({           // APPEND NEW REVIEW TO THE CREATED ARRAY ^
                        reviewID: docRef.id,  
                        rating: data.rating,
                        message: data.message,
                        dateCreated: data.date
                    });

                    await setDoc(userDocRef, { reviews: currentReviews }, { merge: true });     // UPDATE DATABASE , MERGE:TRUE TO MERGE NEW DATA

                    console.log("User updated successfully.");
                    res.redirect("/review");
                } else {
                    // Document does not exist
                    console.log("No such document!");
                }
            } catch (error) {
                // Handle potential errors
                console.error("Error:", error);
            }
        }
        fetchDocument(uid);
        } else {
          // User is signed out
          // ... -------- TO BE CONTINUED
          // BAWAL MAGREVIEW KAPAG DI NAKASIGN IN
          message = "Please sign in to write a review"
          res.redirect(`/review?message=${encodeURIComponent(message)}`);
        }
    });
});

app.get('/merch', async function (req, res) {
    try {
        // Retrieve all documents from the "reviews" collection
        const querySnapshot = await getDocs(collection(db, "merchandise"));
        const merch = [];

        // Collect all reviews in an array
        querySnapshot.forEach((doc) => {
            merch.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('merch.ejs', { merch, isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('merch.ejs', { merch, isLoggedIn : false, message : req.query.message});
        }
        
    } catch (error) {
        console.error("Error fetching merch:", error);
        res.status(500).send("Error fetching merch"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/menu', async function (req, res) {
    try {
        // Retrieve all documents from the "reviews" collection
        const querySnapshot = await getDocs(collection(db, "menu"));
        const menu = [];

        // Collect all reviews in an array
        querySnapshot.forEach((doc) => {
            menu.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('menu.ejs', { menu, isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('menu.ejs', { menu, isLoggedIn : false, message : req.query.message});
        }
        
    } catch (error) {
        console.error("Error fetching menu:", error);
        res.status(500).send("Error fetching menu"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/gear', async function (req, res) {
    try {
        // Retrieve all documents from the "reviews" collection
        const querySnapshot = await getDocs(collection(db, "cnbgear"));
        const gear = [];

        // Collect all reviews in an array
        querySnapshot.forEach((doc) => {
            gear.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('gear.ejs', { gear, isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('gear.ejs', { gear, isLoggedIn : false, message : req.query.message});
        }
        
    } catch (error) {
        console.error("Error fetching menu:", error);
        res.status(500).send("Error fetching menu"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.listen(3000, ()  => {
    console.log("Listening at Port 3000");
});

// const PORT = process.env.PORT || 3000; // KAPAG IHOHOST NA, ILAGAY SA .ENV FILE UNG PORT NUMBER GIVEN BY HOSTING ITSELF

// app.listen(PORT, () => { 
//     console.log(`Listening at Port ${PORT}`);
// });


