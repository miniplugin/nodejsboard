var express = require('express');
var router = express.Router();
var dateFormat = require('dateformat');
// 파일 업로드, 다운로드 구현(아래 2줄)
var { fileUpload, downloadFile } = require('./fileupload');
const fs = require('fs');
router.get("/download", downloadFile);

router.get('/', function (req, res, next) {
    res.redirect('/board/boardList');
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
    //res.json({ message: 'ok' });
    res.redirect('/board/boardList');
});
//기술 참조 : https://developers.google.com/identity/gsi/web/guides/verify-google-id-token?hl=ko
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();
router.post('/loginChk', async function (req, res, next) {
    console.log('구글 로그인 정보 세션에 담그기');
    let obj = JSON.parse(JSON.stringify(req.body));
    let credential = obj.credential;
    let csrf_token = obj.g_csrf_token;
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: "54081620771-6gn2pmgpnvbptk8o568rmdrfqqg6m2s8.apps.googleusercontent.com",
    });
    const payload = ticket.getPayload();
    console.log('csrf_token 정보 : ', csrf_token);
    console.log('payload 정보 : ', payload);
    console.log('user 정보 : ', payload['name']);
    console.log('user email 주소 : ', payload['email']);
    req.session.logined = true;//서버에서 사용
    req.session.name = payload['name'];//서버에서 사용
    req.session.email = payload['email'];//서버에서 사용
    //backURL=req.header('Referer') || '/';
    //res.redirect(backURL);
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
        res.redirect('/board/loginForm');
        return;
    }
    res.render('board3/boardForm', { row: "" });
});

router.post('/boardForm', function (req, res, next) {
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    if (!req.body.brdno) { // 보안 때문에 query 대신
        res.render('board3/boardForm', { row: "" });
        return;
    }

    // update 시 입력 폼에 값 채우기
    db.collection('board').doc(req.body.brdno).get()
        .then((doc) => {
            var childData = doc.data();
            res.render('board3/boardForm', { row: childData });
        })
});

router.post('/boardSave', fileUpload.single('uploaded_file'), function (req, res, next) {
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    var postData = req.body;
    if (!postData.brdno) {  // new
        postData.brddate = Date.now();
        var doc = db.collection("board").doc();
        postData.brdno = doc.id;
        postData.brdwriter = req.session.name;
        postData.brdEmail = req.session.email;
        if (req.file) {
            let path = req.file.path.replace(/\\/g, "/"); //윈도우서버용 경로때문에 추가
            postData.path = path;
            postData.publicUrl = req.file.publicUrl;
            //postData.fileRef = req.file.fileRef; //에러나서 제외
            //postData.bucketRef = req.file.bucketRef; //에러나서 제외
        }
        doc.set(postData);
    } else { // update
        var doc = db.collection("board").doc(postData.brdno);
        console.log("여기1", postData.deleteFile);
        if (req.file || postData.deleteFile == "1") {
            db.collection('board').doc(postData.brdno).get()
                .then((subdoc) => {
                    var childData = subdoc.data();
                    console.log("여기2", childData.brdFile);
                    if (childData.path) { // 기존 파일 지우고 신규 파일 등록 시
                        fs.unlink(childData.path, (err) => {
                            console.log(err);
                        });
                        postData.path = null;
                        postData.publicUrl = null;
                    }
                    if (req.file) { //신규파일 등록
                        let path = req.file.path.replace(/\\/g, "/"); //윈도우서버용 경로때문에 추가
                        postData.path = path;                    
                        postData.publicUrl = req.file.publicUrl;
                    }
                    doc.update(postData);
                })
        } else { // 문자만 수정
            doc.update(postData);
            console.log("여기3");
        }
    }
    //res.redirect('/board/boardList');
    res.json({ message: 'ok' });
});

router.post('/boardDelete', function (req, res, next) {
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    db.collection('board').doc(req.body.brdno).get()
        .then((doc) => {
            var childData = doc.data();
            console.log(childData.path);
            if (childData.path) {
                fs.unlink(childData.path, (err) => {
                    console.log(err);
                });
            }
        })
    db.collection('board').doc(req.body.brdno).delete()
    res.redirect('/board/boardList');
});

module.exports = router;
