// TO BE REFACTORED //

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged} from "firebase/auth"; 
import { doc, setDoc, getDoc, addDoc, collection, getDocs, query, where, updateDoc, arrayUnion, limit, orderBy, onSnapshot, deleteField} from "firebase/firestore"; 

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
            if (user.email === "acdizon@gmail.com"){
                res.render('index.ejs', { reviews, isLoggedIn : true, isAdmin: true, message : req.query.message });
            } else {
                res.render('index.ejs', { reviews, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('index.ejs', { reviews, isLoggedIn : false, isAdmin: false, message : req.query.message});
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
        if (user.email === "acdizon@gmail.com"){
            res.render('signup.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('signup.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('signup.ejs', {isLoggedIn : false, isAdmin: false});
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
        if (user.email === "acdizon@gmail.com"){
            res.render('login.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('login.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('login.ejs', {isLoggedIn : false, isAdmin: false});
    }
});

app.post('/login', async function (req, res) {

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
    try {
        await signOut(auth);
        console.log("User signed out successfully!");
        res.redirect("/logout-success");
    } catch (error) {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error(`An error occurred during logout: ${errorCode} - ${errorMessage}`);
        res.status(500).send("An error occurred while logging out.");
    }
});

app.get('/logout-success', (req, res) => {
    res.render("logout.ejs");
})

app.get('/profile', async (req, res) => {
    const user = auth.currentUser; 

    if (user) {
        const uid = user.uid;

        try {
            // Define the document reference
            const docRef = doc(db, 'users', uid);

            // Retrieve the document snapshot
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const username = docSnap.data().username;
                const orderQuery = query(
                    collection(db, 'orders'),
                    where('username', '==', username),
                    orderBy('date', 'desc') // Sorts by date in descending order (latest first)
                );
                const cartSnap = await getDocs(orderQuery);
                const userData = docSnap.data();
                let orderData = [];

                if (!cartSnap.empty) { // Check if there are documents in the snapshot
                    orderData = cartSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
                }
                if (user.email === "acdizon@gmail.com"){
                    res.render('profile.ejs', { user: userData, orders: orderData, isLoggedIn : true, isAdmin: true, message : req.query.message });
                } else {
                    res.render('profile.ejs', { user: userData, orders: orderData, isLoggedIn: true, isAdmin: false });  // isLoggedIn TO BE REFACTORED
                }
            } else {
                // No user document found
                console.log("No user document found");
                res.status(404).send("User not found");
            }
        } catch (error) {
            console.error("Error fetching document:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        // User is signed out, cannot access profile
        res.status(401).send("Please log in to access your profile");
    }
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
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('review.ejs', { reviews, isLoggedIn : true, isAdmin: true, message : req.query.message });
            } else {
                res.render('review.ejs', { reviews, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('review.ejs', { reviews, isLoggedIn : false, isAdmin: false, message : req.query.message});
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

    const user = auth.currentUser; 

    if (user) {
        const uid = user.uid;

        try {
            // Define the document reference
            const userDocRef = doc(db, 'users', uid);

            // Retrieve the document snapshot
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                const userData = docSnap.data();

                // Add the new review to the "reviews" collection
                const docRef = await addDoc(collection(db, "reviews"), {
                    username: userData.username,
                    rating: data.rating,
                    message: data.message,
                    dateCreated: data.date
                });
                console.log("Review added successfully.");

                // Update user database with new review
                const currentReviews = userData.reviews || []; // IF WALANG LAMAN YUNG REVIEWS ARRAY, CREATE NEW ARRAY

                // Append new review to the existing or created array
                currentReviews.push({
                    reviewID: docRef.id,
                    rating: data.rating,
                    message: data.message,
                    dateCreated: data.date
                });

                // Update database with merged reviews
                await setDoc(userDocRef, { reviews: currentReviews }, { merge: true });
                console.log("User updated successfully.");

                // Redirect after successful review addition
                return res.redirect("/review");
            } else {
                console.log("No such document!");
                return res.status(404).send("User not found");
            }
        } catch (error) {
            // Handle potential errors
            console.error("Error:", error);
            return res.status(500).send("Internal Server Error");
        }
    } else {
        // User is not signed in, cannot write a review
        const message = "Please sign in to write a review";
        return res.redirect(`/review?message=${encodeURIComponent(message)}`);
    }
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
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('merch.ejs', { merch, isLoggedIn : true, isAdmin: true, message : req.query.message });
            } else {
                res.render('merch.ejs', { merch, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('merch.ejs', { merch, isLoggedIn : false, isAdmin: false, message : req.query.message});
        }

    } catch (error) {
        console.error("Error fetching merch:", error);
        res.status(500).send("Error fetching merch"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/menu', async function (req, res) {
    try {
        // Retrieve all documents from the "reviews" collection
        
        const sort = req.query.filter
        let isFiltered = false;
        const menu = [];
        const filteredMenu = [];

        if (!sort) { // isFiltered is false
            const querySnapshot = await getDocs(collection(db, "menu"));
            // Collect all menu items in an array
            querySnapshot.forEach((doc) => {
                menu.push(doc.data());
            });
        } 
        else if (sort === 'atoz') {
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "menu"));
            querySnapshot.forEach((doc) => {
                filteredMenu.push(doc.data());
            });

            filteredMenu.forEach(category => {
                // Iterate over each category
                for (let key in category) {
                    // Append all items to the single array
                    category[key].forEach(item => {
                        menu.push(item);
                    });
                }
            });

            menu.sort((a, b) => {
                if (a.menuName < b.menuName) {
                    return -1;
                }
                if (a.menuName > b.menuName) {
                    return 1;
                }
                return 0;
            });
        }
        else if (sort === 'pricelth') { // Sort by price in ascending order
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "menu"));
            querySnapshot.forEach((doc) => {
                filteredMenu.push(doc.data());
            });

            filteredMenu.forEach(category => {
                // Iterate over each category
                for (let key in category) {
                    // Append all items to the single array
                    category[key].forEach(item => {
                        menu.push(item);
                    });
                }
            });

            // Sort menu items by price in ascending order
            menu.sort((a, b) => {
                if (a.price < b.price) {
                    return -1;
                }
                if (a.price > b.price) {
                    return 1;
                }
                return 0;
            });
        }
        else if (sort === 'pricehtl') { // Sort by price in ascending order
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "menu"));
            querySnapshot.forEach((doc) => {
                filteredMenu.push(doc.data());
            });

            filteredMenu.forEach(category => {
                // Iterate over each category
                for (let key in category) {
                    // Append all items to the single array
                    category[key].forEach(item => {
                        menu.push(item);
                    });
                }
            });

            // Sort menu items by price in ascending order
            menu.sort((a, b) => {
                if (a.price > b.price) {
                    return -1; // a comes before b
                }
                if (a.price < b.price) {
                    return 1; // a comes after b
                }
                return 0; // a and b are equal
            });
        }
            
        const user = auth.currentUser;
        if (user) {
            // User is signed in
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('menu.ejs', { menu, isLoggedIn : true, isAdmin: true, isFiltered, message : req.query.message });
            } else {
                res.render('menu.ejs', { menu, isLoggedIn : true, isAdmin: false, isFiltered, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('menu.ejs', { menu, isLoggedIn : false, isAdmin: false, isFiltered, message : req.query.message});
        }

    } catch (error) {
        console.error("Error fetching menu:", error);
        res.status(500).send("Error fetching menu"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/gear', async function (req, res) {
    try {

        const sort = req.query.filter
        let isFiltered = false;
        const gear = [];

        if (!sort) { // isFiltered is false
            const querySnapshot = await getDocs(collection(db, "cnbgear"));
            // Collect all menu items in an array
            querySnapshot.forEach((doc) => {
                gear.push(doc.data());
            });
        } 
        else if (sort === 'atoz') {
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "cnbgear"));
            querySnapshot.forEach((doc) => {
                gear.push(doc.data());
            });

            gear.sort((a, b) => {
                if (a.gearName < b.gearName) {
                    return -1;
                }
                if (a.gearName > b.gearName) {
                    return 1;
                }
                return 0;
            });
        }
        else if (sort === 'pricelth') { // Sort by price in ascending order
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "cnbgear"));
            querySnapshot.forEach((doc) => {
                gear.push(doc.data());
            });

            // Sort menu items by price in ascending order
            gear.sort((a, b) => {
                if (a.price < b.price) {
                    return -1;
                }
                if (a.price > b.price) {
                    return 1;
                }
                return 0;
            });
        }
        else if (sort === 'pricehtl') { // Sort by price in ascending order
            isFiltered = true;
            const querySnapshot = await getDocs(collection(db, "cnbgear"));
            querySnapshot.forEach((doc) => {
                gear.push(doc.data());
            });

            // Sort menu items by price in ascending order
            gear.sort((a, b) => {
                if (a.price > b.price) {
                    return -1; // a comes before b
                }
                if (a.price < b.price) {
                    return 1; // a comes after b
                }
                return 0; // a and b are equal
            });
        }

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('gear.ejs', { gear, isLoggedIn : true, isAdmin: true, isFiltered, message : req.query.message });
            } else {
                res.render('gear.ejs', { gear, isLoggedIn : true, isAdmin: false, isFiltered, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('gear.ejs', { gear, isLoggedIn : false, isAdmin: false, isFiltered, message : req.query.message});
        }

    } catch (error) {
        console.error("Error fetching gear:", error);
        res.status(500).send("Error fetching gear"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
});

app.get('/cart', async (req, res) => {
    const user = auth.currentUser; 

    if (user) {
        const uid = user.uid;

        try {
            // Define the document reference for the user
            const docRef = doc(db, 'users', uid);

            // Retrieve the document snapshot
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const username = docSnap.data().username;

                // Query the cart for the current user
                const cartQuery = query(collection(db, 'cart'), where('username', '==', username));
                const cartSnap = await getDocs(cartQuery);

                if (!cartSnap.empty) {
                    let cartID;
                    cartSnap.forEach((doc) => {
                        cartID = doc.id;
                    });

                    const cartRef = doc(db, "cart", cartID);
                    const cartDoc = await getDoc(cartRef);

                    if (cartDoc.exists()) {
                        const cartData = cartDoc.data();
                        // Render the cart page with the cart data
                        if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                            return res.render('cart.ejs', { cart: cartData, isLoggedIn : true, isAdmin: true, message : req.query.message });
                        } else {
                            return res.render('cart.ejs', { cart: cartData, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
                        }
                    } else {
                        console.log("No such cart document!");
                    }
                } else {
                    // Render the cart page with empty data if the cart is empty
                    return res.render('cart.ejs', { cart: "", isLoggedIn: true, isAdmin: false, });
                }
            } else {
                console.log("No such user document!");
            }
        } catch (error) {
            // Handle potential errors
            console.error("Error fetching document:", error);
            return res.status(500).send("Internal Server Error");
        }
    } else {
        // User is not signed in, respond accordingly
        return res.status(401).send("Please Log In to Access Your Cart");
    }
});

app.post('/add-to-cart', async function (req, res) {

    const user = auth.currentUser;

    if (user) {
        const uid = user.uid;

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

                    const cartRef = doc(db, "cart", cartID);
                    const cartDoc = await getDoc(cartRef);
                    const cartData = cartDoc.data();
                    const products = cartData.products || []; // IF WALANG LAMAN YUNG PRODUCTS ARRAY, CREATE NEW ARRAY
                    const existingProductIndex = products.findIndex(product => product.product_name === req.body.title); // FIND INDEX OF EXISTING PRODUCT INSIDE CART

                    if (existingProductIndex > -1) { // IF PRODUCT EXISTS IN CART, ONLY UPDATE ITS QUANTITY
                        console.log("Item already in cart, updating quantity");
                        products[existingProductIndex].quantity += parseInt(req.body.quantity);
                        await updateDoc(cartRef, { products: products });
                    } else {
                        await updateDoc(cartRef, {
                            products: arrayUnion({
                                product_name: req.body.title,
                                price: parseInt(req.body.price),
                                quantity: req.body.quantity
                            })
                        });
                    }
                } else {
                    // If no cart exists, create a new cart
                    await addDoc(collection(db, "cart"), {
                        username: username,
                        products: [{
                            product_name: req.body.title,
                            price: parseInt(req.body.price),
                            quantity: req.body.quantity
                        }]
                    });
                }
                return res.json({ success: true, message: 'Product added to cart' }); // Return to prevent further execution
            } else {
                console.log("No such document!");
                return res.status(404).json({ error: "User document not found" }); // Send error response if no user document
            }
        } catch (error) {
            console.error("Error:", error);
            return res.status(500).json({ error: 'An error occurred' }); // Handle potential errors
        }
    } else {
        // User is signed out, respond accordingly
        return res.status(401).json({ error: "Please log in to add items to the cart" });
    }
});

app.patch('/cart', async function (req, res) {

    // Use auth.currentUser to check the current user
    const user = auth.currentUser;

    if (user) {
        const uid = user.uid;

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

                    const cartRef = doc(db, "cart", cartID);
                    const cartDoc = await getDoc(cartRef);
                    const cartData = cartDoc.data();
                    const products = cartData.products;

                    // Update product quantity
                    if (req.body.index < products.length && req.body.index >= 0) {
                        products[req.body.index].quantity = parseInt(req.body.quantity);
                        await updateDoc(cartRef, { products: products });
                        
                        // Send success response
                        return res.json({ success: true, message: 'Cart updated successfully' });
                    } else {
                        // Handle invalid product index
                        return res.status(400).json({ error: 'Invalid product index' });
                    }
                } else {
                    // No cart found for user
                    return res.status(404).json({ error: "No cart found for the user" });
                }
            } else {
                // No user document found
                return res.status(404).json({ error: "No user document found" });
            }
        } catch (error) {
            // Handle potential errors
            console.error("Error:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else {
        // User is signed out, respond accordingly
        return res.status(401).json({ error: "Please log in to update the cart" });
    }
});

app.delete('/cart', async function (req, res) {

    // Use auth.currentUser to check the current user
    const user = auth.currentUser;

    if (user) {
        const uid = user.uid;

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

                    const cartRef = doc(db, "cart", cartID);
                    const cartDoc = await getDoc(cartRef);                    
                    const data = cartDoc.data();
                    
                    const updatedItems = data.products.filter(product => product.product_name !== req.body.title);

                    // Update the document with the new array
                    await updateDoc(cartRef, {
                        products: updatedItems
                    });

                    // Send success response
                    return res.json({ success: true, message: 'Item removed successfully' });
                } else {
                    // Cart not found for the user
                    return res.status(404).json({ success: false, message: 'Cart not found' });
                }
            } else {
                // No user document found
                return res.status(404).json({ success: false, message: 'User not found' });
            }
        } catch (error) {
            // Handle potential errors
            console.error("Error:", error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    } else {
        // User is signed out, respond accordingly
        return res.status(401).json({ success: false, message: 'Please log in to access your cart' });
    }
});

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
        if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
            res.render('search.ejs', { product, query, isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('search.ejs', { product, query, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('search.ejs', { product, query, isLoggedIn : false, isAdmin: false, message : req.query.message});
    }
})

app.get('/feature', (req, res) => {
    const user = auth.currentUser;
        if (user) {
            // User is signed in
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('feature.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
            } else {
                res.render('feature.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('feature.ejs', { isLoggedIn : false, isAdmin: false, message : req.query.message});
        }
});

app.get('/checkout', async (req, res) => {
    const user = auth.currentUser; // Get the currently signed-in user

    if (user) {
        const uid = user.uid;

        try {
            // Define the document reference
            const docRef = doc(db, 'users', uid);

            // Retrieve the document snapshot
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const username = docSnap.data().username;
                
                // FIND CART OF THE USER IN DB
                const cartQuery = query(collection(db, 'cart'), where('username', '==', username));
                const cartSnap = await getDocs(cartQuery);

                if (!cartSnap.empty) {
                    let cartID;
                    cartSnap.forEach((doc) => {
                        cartID = doc.id;
                    });

                    const cartRef = doc(db, "cart", cartID);
                    const cartDoc = await getDoc(cartRef);

                    if (cartDoc.exists()) {
                        // Cart data is available
                        const cartData = cartDoc.data();
                        if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                            res.render('checkout.ejs', { cart: cartData, isLoggedIn : true, isAdmin: true, message : req.query.message });
                        } else {
                            res.render('checkout.ejs', { cart: cartData, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
                        }
                    } else {
                        // Cart document does not exist
                        console.log("No such document!");
                        res.status(404).send("No cart document found");
                    }
                } else {
                    // No cart items found
                    res.status(404).send("Please add an item to your cart");
                }
            } else {
                // User document does not exist
                console.log("No user document found");
                res.status(404).send("User not found");
            }
        } catch (error) {
            console.error("Error fetching document:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        // User is signed out, cannot access checkout
        res.status(401).send("Please log in to access your cart");
    }
});

app.post('/checkout', async (req, res) => {
    const user = auth.currentUser; // Get the currently signed-in user

    if (user) {
        const uid = user.uid;

        try {
            const fetchDocument = async (uid) => {
                // Define the document reference
                const userDocRef = doc(db, 'users', uid);

                // Retrieve the document snapshot
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                    const userData = docSnap.data();
                    const username = userData.username;

                    // FIND CART OF THE USER IN DB
                    const cartQuery = query(collection(db, 'cart'), where('username', '==', username));
                    const cartSnap = await getDocs(cartQuery);

                    if (!cartSnap.empty) { // USER ALREADY HAS CART IN DB
                        let cartID;
                        cartSnap.forEach((doc) => {
                            cartID = doc.id;
                        });

                        const cartRef = doc(db, "cart", cartID);
                        const cartDoc = await getDoc(cartRef);

                        const cartData = cartDoc.data();

                        delete cartData.username;

                        const docRef = await addDoc(collection(db, "orders"), {
                            username: username,
                            fName: req.body.fName,
                            lName: req.body.lName,
                            address: req.body.address,
                            pNumber: req.body.pNumber,
                            pMethod: req.body.pMethod,
                            products: cartData.products,
                            date: new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            }),
                            totalPrice: parseInt(req.body.totalPrice)
                        });

                        console.log("Order added successfully!");
                        console.log("Document written with ID: ", docRef.id);

                        await updateDoc(cartRef, {
                            products: deleteField()
                        });

                        console.log("Cart cleared successfully");

                        res.redirect('/profile');
                    } else {
                        console.log("No cart document found!");
                        res.status(404).send("Cart is empty");
                    }
                } else {
                    console.log("No user document found!");
                    res.status(404).send("User not found");
                }
            };

            await fetchDocument(uid);
        } catch (error) {
            console.error("Error:", error);
            res.status(500).send("Internal Server Error");
        }
    } else {
        // User is signed out, cannot checkout
        res.status(401).send("Please log in to checkout");
    }
});

app.get('/dashboard', async (req, res) =>{
    const user = auth.currentUser;
    if (user.email === "acdizon@gmail.com"){
        try {
            const users = [];
            const querySnapshot = await getDocs(collection(db, "users"));
            querySnapshot.forEach((doc) => {
                // doc.data() is never undefined for query doc snapshots
                users.push({ id: doc.id, ...doc.data() });
            });
            res.render('dashboard.ejs', { users, isLoggedIn : true, isAdmin: true, })
        } catch (error) {
            console.log(error);
            res.status(500).send("An error has occurred!");
        }
    } else {
        res.status(401).send("You are not an admin");
    }
})

app.get('/contact', async (req, res) =>{

    const user = auth.currentUser;
    
    if (user) {
        // User is signed in
        if (user.email === "acdizon@gmail.com"){
            res.render('contact.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('contact.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('contact.ejs', { isLoggedIn : false, isAdmin: false, message : req.query.message});
    }
})

app.post('/contact', async (req, res) =>{

    var data = {
        name: req.body.name,
        contact: req.body.contact,
        email: req.body.email,
        message: req.body.message,
        date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })
    }

    const user = auth.currentUser; 

    if (user) {
        const uid = user.uid;

        try {
            // Define the document reference
            const userDocRef = doc(db, 'users', uid);

            // Retrieve the document snapshot
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                // Document data is available ----- GET USERNAME FROM DATABASE BASED ON USERID
                const userData = docSnap.data();
                
                // Add the new review to the "messages" collection
                const docRef = await addDoc(collection(db, "messages"), {
                    username: userData.username,
                    name: data.name,
                    contact: data.contact,
                    email: userData.email,
                    message: data.message,
                    dateCreated: data.date
                });
                console.log("Message sent successfully.");

                return res.redirect("/contact");
            } else {
                console.log("No such document!");
                return res.status(404).send("User not found");
            }
        } catch (error) {
            // Handle potential errors
            console.error("Error:", error);
            return res.status(500).send("Internal Server Error");
        }
    } else {
        // User is not signed in, cannot write a review
        const message = "Please sign in to send a message";
        return res.redirect(`/review?message=${encodeURIComponent(message)}`);
    }
})

app.get('/email', async (req, res) =>{

    const user = auth.currentUser;
    
    if (user) {
        // User is signed in
        if (user.email === "acdizon@gmail.com"){
            res.render('email.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('email.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('email.ejs', { isLoggedIn : false, isAdmin: false, message : req.query.message});
    }
})

app.get('/socmed', async (req, res) =>{

    const user = auth.currentUser;
    
    if (user) {
        // User is signed in
        if (user.email === "acdizon@gmail.com"){
            res.render('socmed.ejs', { isLoggedIn : true, isAdmin: true, message : req.query.message });
        } else {
            res.render('socmed.ejs', { isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
        }
    } else {
        res.render('socmed.ejs', { isLoggedIn : false, isAdmin: false, message : req.query.message});
    }
})

app.get('/messages', async (req, res) =>{
    try {
        // Retrieve all documents from the "messages" collection

        const q = query(collection(db, "messages"), orderBy("dateCreated", "desc"));
        const querySnapshot = await getDocs(q);
        const messages = [];

        // Collect all messages in an array
        querySnapshot.forEach((doc) => {
            messages.push(doc.data());
        });

        const user = auth.currentUser;
        if (user) {
            // User is signed in
            if (user.email === "acdizon@gmail.com"){ // isLoggedIn TO BE REFACTORED
                res.render('messages.ejs', { messages, isLoggedIn : true, isAdmin: true, message : req.query.message });
            } else {
                res.render('messages.ejs', { messages, isLoggedIn : true, isAdmin: false, message : req.query.message });     // isLoggedIn TO BE REFACTORED
            }
        } else {
            res.render('messages.ejs', { messages, isLoggedIn : false, isAdmin: false, message : req.query.message});
        }
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).send("Error fetching messages"); // <------------- POSSIBLE ERROR HANDLING (SEND STATUS CODES)
    }
})

app.listen(3000, ()  => {
    console.log("Listening at Port 3000");
});

// const PORT = process.env.PORT || 3000; // KAPAG IHOHOST NA, ILAGAY SA .ENV FILE UNG PORT NUMBER GIVEN BY HOSTING ITSELF

// app.listen(PORT, () => {
//     console.log(`Listening at Port ${PORT}`);
// })




