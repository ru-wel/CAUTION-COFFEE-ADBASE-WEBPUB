// TO BE REFACTORED //

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from "firebase/auth"; 
import { doc, setDoc, getDoc, addDoc, collection, getDocs, query, where, updateDoc, arrayUnion, limit, orderBy, onSnapshot} from "firebase/firestore"; 

// TO BE REFACTORED //

import express from 'express';
import bodyParser from 'body-parser';
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { db, auth } from "./src/db_config.js"; // DB CONFIG MODULE
import signIn from "./src/login.js";
import products from "./src/products.js";

const __dirname = dirname(fileURLToPath(import.meta.url)); // SERVE STATIC FILES
const app = express();

app.use(bodyParser.urlencoded({ extended: true })); // PARSE DATA FROM HTML FORMS
app.use(express.json()); // PARSE DATA FROM FETCH
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname,'css')));
app.use(express.static(path.join(__dirname,'media'))); // SERVE STATIC FILES ^
// app.use(checkAuth) // CUSTOM MIDDLEWARE

app.get('/', async (req, res) =>{ // --------- NEED PA SI FIREBASE ADMIN PARA MAS MAGING SECURE

    try {
        // Retrieve all documents from the "reviews" collection
        const q = query(collection(db, "reviews"), orderBy("dateCreated", "desc"), limit(3));

        const querySnapshot = await getDocs(q);
        const reviews = [];

        // Collect all reviews in an array
        querySnapshot.forEach((doc) => {
            reviews.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('index.ejs', { email:user.email, reviews, isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('index.ejs', { reviews, isLoggedIn : false, message : req.query.message});
        }

    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Error fetching reviews"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
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

app.post('/login', async function (req, res) {
    // signInWithEmailAndPassword(auth, req.body.email, req.body.password)
    // .then((userCredential) => {
    //     // Signed in
    //     // const user = userCredential.user;
    //     console.log("User logged in successfully!");
    //     res.redirect("/");
    // })
    // .catch((error) => {
    //     const errorCode = error.code;
    //     const errorMessage = error.message;
    //     console.log("An error has occured." `${errorCode} : ${errorMessage}`);
    // });

    // BUG (NEED TO REFRESH TO LOAD ISLOGGEDIN)
    try {
        await signIn(req.body.email, req.body.password);
        console.log("User logged in successfully!");
        res.redirect("/"); // Redirect to profile page or home page
    } catch (error) {
        console.error(error.message);
        res.redirect('/login'); // Redirect back to login page with an error
    };
    // BUG (NEED TO REFRESH TO LOAD ISLOGGEDIN)
});

app.post('/logout', async (req, res) => {
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
                    res.render('profile.ejs', {user:userData, isLoggedIn : true})
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
        // const querySnapshot = await getDocs(collection(db, "reviews"));

        const q = query(collection(db, "reviews"), orderBy("dateCreated", "desc"));
        const querySnapshot = await getDocs(q);
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

                    currentReviews.push({  // APPEND NEW REVIEW TO THE CREATED ARRAY ^
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
        console.error("Error fetching gear:", error);
        res.status(500).send("Error fetching gear"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/cart', (req, res) => {
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
                const username = docSnap.data().username;
                const cartQuery = query(collection(db, 'cart'), where('username', '==', username)); // FIND CART OF THE USER IN DB
                const cartSnap = await getDocs(cartQuery);

                if (!cartSnap.empty){
                    let cartID;
                    cartSnap.forEach((doc) => {
                        cartID = doc.id;
                    });
                    const cartRef = doc(db, "cart", cartID)
                    const cartDoc = await getDoc(cartRef);

                    if (cartDoc.exists()) {
                        // Document data is available
                        const cartData = cartDoc.data();
                        res.render('cart.ejs', {cart:cartData, isLoggedIn : true})
                    } else {
                        // Document does not exist
                        console.log("No such document!");
                    }
                } else { res.render('cart.ejs', {cart : "", isLoggedIn : true} )}

            } catch (error) {
                // Handle potential errors
                console.error("Error fetching document:", error);
            }
        }
        fetchDocument(uid);
        } else {
        //   res.status(404).send("Please Log In to Access Your Cart")
        }
    });
})

app.post('/add-to-cart', async function (req, res) {

    // TO DO : CONNECT TO DATABASE + ADD DATA VALIDATION + ADD VALIDATION WHEN ADDED TO CART

    onAuthStateChanged(auth, async function (user) { // TO BE REFACTORED TO A FUNCTION ?
        var message // TO BE REMOVED
        if (user) {
            // User is signed in,
            const uid = user.uid;

            const fetchDocument = async (uid) => { // DAPAT MAY ASYNC FUNCTION KAPAG GAGAMIT NG AW(a)IT OR NASA PINAKATAAS NG FUNCTION YUNG AW(a)IT

            try {

                // Define the document reference
                const userDocRef = doc(db, 'users', uid);

                // Retrieve the document snapshot
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                    const userData = docSnap.data();
                    const username = userData.username;

                    const cartQuery = query(collection(db, 'cart'), where('username', '==', username)); // FIND CART OF THE USER IN DB
                    const cartSnap = await getDocs(cartQuery);

                    if (!cartSnap.empty) { // USER ALREADY HAS CART IN DB

                        // UPDATE EXISTING CART
                        let cartID;
                        cartSnap.forEach((doc) => {
                            cartID = doc.id;
                        });

                        const cartRef = doc(db, "cart", cartID)
                        const cartDoc = await getDoc(cartRef);
                        const cartData = cartDoc.data();
                        const products = cartData.products || []; // IF WALANG LAMAN YUNG PRODUCTS ARRAY, CREATE NEW ARRAY
                        const existingProductIndex = products.findIndex(product => product.product_name === req.body.title); // FIND INDEX OF EXISTING PRODUCT INSIDE CART

                        if (existingProductIndex > -1) { // IF PRODUCT EXISTS IN CART, ONLY UPDATE ITS QUANTITY
                            products[existingProductIndex].quantity += parseInt(req.body.quantity);
                            await updateDoc(cartRef, {
                                products: products
                            });
                        } else{
                            await updateDoc(cartRef, {
                                products: arrayUnion({
                                    product_name: req.body.title,
                                    price: parseInt(req.body.price),
                                    quantity: req.body.quantity
                                })
                            });
                        }
                    } else {
                        await addDoc(collection(db, "cart"), { // TO DO : GAWING OBJECT PER PRODUCT
                            username: username,
                            products: [{
                                product_name : req.body.title,
                                price : parseInt(req.body.price),
                                quantity : req.body.quantity
                            }]
                        });
                    }
                    res.json({ success: true, message: 'Product added to cart' }); // NEEDED IN FOR ORDER FOR .then(data => { PROMISE TO FIRE
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
        } else { // ------ TO BE REMOVED/EDITED
          // User is signed out
          // ... -------- TO BE CONTINUED
          // BAWAL MAG ADD TO CART KAPAG DI NAKASIGN IN

          res.status(404).send("Please Log In to Access Your Cart")
        }
    });
})

app.patch('/cart', async function (req, res) {

    onAuthStateChanged(auth, async function (user) { // TO BE REFACTORED TO A FUNCTION ?
        if (user) {
            // User is signed in,
            const uid = user.uid;

            const fetchDocument = async (uid) => { // DAPAT MAY ASYNC FUNCTION KAPAG GAGAMIT NG AW(a)IT OR NASA PINAKATAAS NG FUNCTION YUNG AW(a)IT

            try {

                // Define the document reference
                const userDocRef = doc(db, 'users', uid);

                // Retrieve the document snapshot
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                    const userData = docSnap.data();
                    const username = userData.username;

                    const cartQuery = query(collection(db, 'cart'), where('username', '==', username)); // FIND CART OF THE USER IN DB
                    const cartSnap = await getDocs(cartQuery);

                    if (!cartSnap.empty) { // USER ALREADY HAS CART IN DB

                        // UPDATE EXISTING CART
                        let cartID;
                        cartSnap.forEach((doc) => {
                            cartID = doc.id;
                        });

                        const cartRef = doc(db, "cart", cartID)
                        const cartDoc = await getDoc(cartRef);
                        const cartData = cartDoc.data();
                        const products = cartData.products

                        products[req.body.index].quantity = parseInt(req.body.quantity);
                        await updateDoc(cartRef, {
                            products: products
                        });
                    } else {
                        // Document does not exist
                        console.log("No such document!");
                    }
                    res.json({ success: true, message: 'Cart updated successfully' }); // NEEDED IN FOR ORDER FOR .then(data => { PROMISE TO FIRE
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
        } else { // ------ TO BE REMOVED/EDITED
          // User is signed out
          // ... -------- TO BE CONTINUED
          // BAWAL MAG ADD TO CART KAPAG DI NAKASIGN IN
          res.status(404).send("Please Log In to Access Your Cart")
        }
    });
})

app.delete('/cart', async function (req, res) {

    onAuthStateChanged(auth, async function (user) { // TO BE REFACTORED TO A FUNCTION ?
        if (user) {
            // User is signed in,
            const uid = user.uid;

            const fetchDocument = async (uid) => { // DAPAT MAY ASYNC FUNCTION KAPAG GAGAMIT NG AW(a)IT OR NASA PINAKATAAS NG FUNCTION YUNG AW(a)IT

            try {

                // Define the document reference
                const userDocRef = doc(db, 'users', uid);

                // Retrieve the document snapshot
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                    const userData = docSnap.data();
                    const username = userData.username;

                    const cartQuery = query(collection(db, 'cart'), where('username', '==', username)); // FIND CART OF THE USER IN DB
                    const cartSnap = await getDocs(cartQuery);

                    if (!cartSnap.empty) { // USER ALREADY HAS CART IN DB

                        // UPDATE EXISTING CART
                        let cartID;
                        cartSnap.forEach((doc) => {
                            cartID = doc.id;
                        });

                        const cartRef = doc(db, "cart", cartID)
                        const cartDoc = await getDoc(cartRef);                    
                        const data = cartDoc.data();
                        
                        const updatedItems = data.products.filter(product => product.product_name !== req.body.title);

                        // Update the document with the new array
                        await updateDoc(cartRef, {
                            products : updatedItems 
                        });

                    } else {
                        // Document does not exist
                        console.log("No such document!");
                        res.json({ success: false, message: 'Cart not found' });
                    }
                    res.json({ success: true, message: 'Item removed successfully' }); // NEEDED IN FOR ORDER FOR .then(data => { PROMISE TO FIRE
                } else {
                    // Document does not exist
                    console.log("No such document!");
                    res.json({ success: false, message: 'Cart not found' });
                }
            } catch (error) {
                // Handle potential errors
                console.error("Error:", error);
            }
        }
        fetchDocument(uid);
        } else { // ------ TO BE REMOVED/EDITED
          // User is signed out
          // ... -------- TO BE CONTINUED
          // BAWAL MAG ADD TO CART KAPAG DI NAKASIGN IN
          res.status(404).send("Please Log In to Access Your Cart")
        }
    });
})

app.get('/search', (req, res) => { 
    
    const product = [];
    const query = req.query.query;

    // QUERY VALIDATION 

    products.forEach(item => {
        const newitem = item.name.toLowerCase();
        if (newitem.includes(query)){
            product.push(item);
        }
    })
    
    const user = auth.currentUser;
    
    if (user) {
        // User is signed in
        res.render('search.ejs', { product, query, isLoggedIn : true, message : req.query.message }); // isLoggedIn TO BE REFACTORED
    } else {
        res.render('search.ejs', { product, query, isLoggedIn : false, message : req.query.message});
    }
})

app.get('/feature', (req, res) => {
    const user = auth.currentUser;
        if (user) {
            // User is signed in
            res.render('feature.ejs', { isLoggedIn : true, message : req.query.message }); // EMAIL FOR PLACEHOLDER ONLY : isLoggedIn TO BE REFACTORED
        } else {
            res.render('feature.ejs', { isLoggedIn : false, message : req.query.message});
        }
});

app.listen(3000, ()  => {
    console.log("Listening at Port 3000");
});

// const PORT = process.env.PORT || 3000; // KAPAG IHOHOST NA, ILAGAY SA .ENV FILE UNG PORT NUMBER GIVEN BY HOSTING ITSELF

// app.listen(PORT, () => {
//     console.log(`Listening at Port ${PORT}`);
// })




