var express = require('express');
var router = express.Router();
var dateFormat = require('dateformat');

router.get('/', function (req, res, next) {
    res.redirect('boardList');
});
/* 노드js 에서 firebase사용 기술자료 : https://forest71.tistory.com/170
// https://firebase.google.com/docs/reference/js/v8/firebase.auth.GoogleAuthProvider
var config = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
};
var firebase = require("firebase");
firebase.initializeApp(config);
var db = firebase.firestore();
*/
/*
const admin = require('firebase-admin');
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
var db = admin.firestore();
*/
const { firebase, db } = require('../firebase_config');
router.get('/loginForm', function (req, res, next) {
    res.render('board3/loginForm');
});

router.get('/logout', function (req, res, next) {
    req.session.destroy();
    res.redirect('/');
});

router.post('/loginChk', async function (req, res, next) {
    console.log('구글 로그인 정보 세션에 담그기');
    let user = req.body;
    console.log(user);
    console.log('user 정보 : ', user.name);
    console.log('user email 주소 : ', user.email);
    req.session.logined = true;//서버에서 사용
    req.session.name = user.name;//서버에서 사용
    req.session.email = user.email;//서버에서 사용
    res.json({ message: 'ok' });
});

router.get('/boardList', function (req, res, next) {
    db.collection('board').orderBy("brddate", "desc").get()
        .then((snapshot) => {
            var rows = [];
            snapshot.forEach((doc) => {
                var childData = doc.data();
                childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd");
                rows.push(childData);
            });
            res.render('board3/boardList', { rows: rows });
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});


router.get('/boardRead', function (req, res, next) {
    db.collection('board').doc(req.query.brdno).get()
        .then((doc) => {
            var childData = doc.data();

            childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd hh:mm");
            res.render('board3/boardRead', { row: childData });
        })
});

router.get('/boardForm', function (req, res, next) {
    if (!req.session.logined) {
        res.redirect('loginForm');
        return;
    }
    if (!req.query.brdno) { // new
        res.render('board3/boardForm', { row: "" });
        return;
    }

    // update
    db.collection('board').doc(req.query.brdno).get()
        .then((doc) => {
            var childData = doc.data();
            res.render('board3/boardForm', { row: childData });
        })
});

router.post('/boardSave', function (req, res, next) {
    if (!req.session) {
        res.redirect('loginForm');
        return;
    }
    var postData = req.body;
    if (!postData.brdno) {  // new
        postData.brddate = Date.now();
        var doc = db.collection("board").doc();
        postData.brdno = doc.id;
        postData.brdwriter = req.session.name;
        postData.brdEmail = req.session.email;
        doc.set(postData);
    } else {                // update
        var doc = db.collection("board").doc(postData.brdno);
        doc.update(postData);
    }
    res.redirect('boardList');
});

router.get('/boardDelete', function (req, res, next) {
    if (!req.session) {
        res.redirect('loginForm');
        return;
    }
    db.collection('board').doc(req.query.brdno).delete()
    res.redirect('boardList');
});

module.exports = router;
