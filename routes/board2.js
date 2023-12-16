var express = require('express');
var router = express.Router();
var dateFormat = require('dateformat');

router.get('/', function(req, res, next) {
    res.redirect('boardList');
});
/* 노드js 에서 firebase사용 기술자료 : https://forest71.tistory.com/170, 
// https://velog.io/@zero-black/Firebase-firebase-admin-sdk-%EC%84%B8%ED%8C%85%ED%95%98%EA%B8%B0
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
const admin = require('firebase-admin');
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
var db = admin.firestore();

router.get('/boardList', function(req, res, next) {
    db.collection('board').orderBy("brddate", "desc").get()
        .then((snapshot) => {
            var rows = [];
            snapshot.forEach((doc) => {
                var childData = doc.data();
                childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd");
                rows.push(childData);
            });
            res.render('board2/boardList', {rows: rows});
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});

router.get('/boardRead', function(req, res, next) {
    db.collection('board').doc(req.query.brdno).get()
        .then((doc) => {
            var childData = doc.data();
            
            childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd hh:mm");
            res.render('board2/boardRead', {row: childData});
        })
});

router.get('/boardForm', function(req,res,next){
    if (!req.query.brdno) { // new
        res.render('board2/boardForm', {row: ""});
        return;
    }
    
    // update
    db.collection('board').doc(req.query.brdno).get()
          .then((doc) => {
              var childData = doc.data();
              res.render('board2/boardForm', {row: childData});
          })
});

router.post('/boardSave', function(req,res,next){
    var postData = req.body;
    if (!postData.brdno) {  // new
        postData.brddate = Date.now();
        var doc = db.collection("board").doc();
        postData.brdno = doc.id;
        doc.set(postData);
    } else {                // update
        var doc = db.collection("board").doc(postData.brdno);
        doc.update(postData);
    }
    
    res.redirect('boardList');
});

router.get('/boardDelete', function(req,res,next){
    db.collection('board').doc(req.query.brdno).delete()

    res.redirect('boardList');
});

module.exports = router;
