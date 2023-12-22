const firebase = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");
const fbInstance = firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    storageBucket: 'nodejsboard-1129e.appspot.com'
});
let db = firebase.firestore();

module.exports = { firebase, db, fbInstance };