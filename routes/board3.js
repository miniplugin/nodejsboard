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
    res.locals.logined = null;//ejs에서 사용
    res.locals.name = null;//ejs에서 사용
    res.locals.email = null;//ejs에서 사용);
    res.locals.admined = null;//ejs에서 사용
    res.locals.userno = null;//ejs에서 사용
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
    if (payload['email'] == "kimilguk@knou.ac.kr") {
        req.session.admined = true;//서버에서 사용
    } else {
        req.session.admined = false;//서버에서 사용
    }
    //backURL=req.header('Referer') || '/';
    //res.redirect(backURL);
    res.json({ message: 'ok' });
});
// 페이징 변수 초기화 start : 시작점 doc정보, next: 다음 목록에 대한 정보
var pagingObj = {
    prev: null,
    next: null,
    size: 3,
}
let mypromise = (prevDate, keyword) => {
    return new Promise((resolve, reject) => {
        let query = db.collection('board').orderBy("brddate", "asc");
        if (keyword) {
            console.log(keyword);
            query = query.where('brdtitle', 'array-contains', keyword);
            //.where('brdwriter', '>=', keyword)
        }
        if (prevDate) {
            console.log("페이징 번호1 : ", Number(prevDate));
            //query = query.startAt(req.query.start); 실행이 적용되지 않아서 where 조건으로 변경
            query = query.where('brddate', '>', Number(prevDate));
        }
        query.limit(pagingObj.size)
            .get()
            .then((snapshot) => {
                console.log('여기', snapshot.docs[pagingObj.size - 1].data().brddate);
                resolve(snapshot.docs[pagingObj.size - 1].data().brddate);
            })
            .catch((err) => {
                console.log('Error getting documents', err);
                reject("실행에러")
            });
    });
}
// promose 데이터 업데이트 시 비동기화 때문에 정렬이 깨진 후 날짜별 재정렬
function custom_sort(b, a) { // 현재 내림차순
    return new Date(a.brddate).getTime() - new Date(b.brddate).getTime();
}
//파이어베이스 잡계 함수사용 https://firebase.google.com/docs/firestore/query-data/aggregation-queries?hl=ko#node.js
let subpromise = (childData) => {
    return new Promise((resolve, reject) => {
        const collectionRef = db.collection('reply');
        const q = collectionRef.where('brdno', '==', childData.brdno);
        q.count()
            .get()
            .then((sub_snapshot) => {
                console.log('댓글개수', sub_snapshot.data().count);
                childData.reply = sub_snapshot.data().count;
                resolve(childData);
            })
            .catch((err) => {
                console.log('Error getting documents', err);
                reject(null)
            });
    });
}
router.get('/boardList', async function (req, res, next) {
    let keyword = '';
    if (req.query.keyword != undefined) {
        keyword = req.query.keyword;//.where('brdtitle', 'array-contains', keyword)
    }

    var query = db.collection('board').orderBy("brddate", "desc");
    if (keyword) {
        console.log(keyword);
        query = query.where('brdtitle', 'array-contains', keyword);
        //.where('brdwriter', '>=', keyword)
    }
    if (req.query.prev) {
        console.log("페이징 번호1 : ", Number(req.query.prev));
        //query = query.startAt(req.query.start); 실행이 적용되지 않아서 where 조건으로 변경
        query = query.where('brddate', '>', Number(req.query.prev));
        await mypromise(req.query.prev, keyword)
            .then((result) => {
                query = query.where('brddate', '<=', Number(result));
                console.log('여기2', result);
            })
            .catch((err) => {
                console.log(`Error getting documents ${err}`);
            });
    }
    if (req.query.next) {
        console.log("페이징 번호1 : ", Number(req.query.next));
        //query = query.startAt(req.query.start); 실행이 적용되지 않아서 where 조건으로 변경
        query = query.where('brddate', '<', Number(req.query.next));
    }
    query.limit(pagingObj.size)
        .get()
        .then(async (snapshot) => {
            pagingObj = {
                size: pagingObj.size,
                prev: snapshot.docs[0], // document들 안에서 가장 첫번째 것을 가져온다. (내림차순이라서 변수명이 반대이다.)
                next: snapshot.docs.length === pagingObj.size ? snapshot.docs[snapshot.docs.length - 1] : null
                // 가져오는 데이터 갯수를 4개로 지정했는데 3개 밖에 없을 수 있다, 
                // 이때 next가 지정한 데이터 갯수(4) 가 아니라면 null을 넣어준다. 다음(next)이 없다는 뜻.
            }
            if (snapshot.docs.length == 0) {
                res.send('<script>alert("페이징 자료가 없습니다. 목록으로 돌아갑니다.");window.history.back();</script>');
                return;
            }
            console.log("페이징 번호2 : ", snapshot.docs.length, "===", pagingObj.size);
            let rows = []; // DB출력 리스트 변수
            //맵사용 참고 : https://gist.github.com/joserocha3/de69124865bf25b634f3f3bad3ef17c3
            await Promise.all(snapshot.docs.map(async doc => { //snapshot.forEach(async (doc) => 대신 map 사용
                try {
                    var childData = doc.data();
                    childData.brddate_format = dateFormat(childData.brddate, "yyyy-mm-dd");//날짜 재정렬 custom_sort() 함수 때문에 제외
                    childData.brdtitle = (childData.brdtitle).join(" "); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
                    //console.log('순서1', childData);
                    //게시물별 댓글 갯수 구하기 시작
                    await subpromise(childData)
                        .then((result) => {
                            //console.log('순서2', result);
                            rows.push(result); //ejs에 보낼 데이터 추가
                        })
                        .catch((err) => {
                            console.log(`Error getting documents ${err}`);
                        });
                } catch (err) {
                    console.log('Error getting documents', err)
                }
            }));
            rows.sort(custom_sort);
            //console.log('순서3', rows);
            res.render('board3/boardList', { rows: rows, pagingObj: pagingObj });
            /*
            var i = 0; //반복문 끝 확인
            snapshot.forEach(async (doc) => { //forEach문 내에선 async ~ await 구분이 작동하지 않는다. 그래서 아래 처럼... 대신 위 처럼 map 사용
                var childData = doc.data();
                childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd");
                childData.brdtitle = (childData.brdtitle).join(" "); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
                //게시물별 댓글 갯수 구하기 시작
                await subpromise(childData.brdno)
                    .then((result) => {
                        console.log('순서2', result);
                        childData.reply = result;
                        rows.push(childData); //ejs에 보낼 데이터 추가
                        i = i + 1;
                        if (snapshot.docs.length == i) {
                            //console.log('순서3', rows);
                            res.render('board3/boardList', { rows: rows, pagingObj: pagingObj });
                        }
                    })
                    .catch((err) => {
                        console.log(`Error getting documents ${err}`);
                    });
                //게시물별 댓글 갯수 구하기 끝
            });
            */
        })
        .catch((err) => {
            console.log('Error getting documents', err);
        });
});

router.get('/boardRead', function (req, res, next) {
    db.collection('board').doc(req.query.brdno).get()
        .then(async (doc) => {
            var childData = doc.data();
            await subpromise(childData)
                .then((result) => {
                    result.brddate = dateFormat(childData.brddate, "yyyy-mm-dd hh:mm");
                    result.brdtitle = (childData.brdtitle).join(" "); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
                    childData = result;//ejs에 보낼 데이터 추가
                })
                .catch((err) => {
                    console.log(`Error getting documents ${err}`);
                });
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
            console.log(req.session.email, "-", req.session.admined);
            if (req.session.email != childData.brdEmail && req.session.admined != true) {
                res.send('<script>alert("수정/삭제는 본인이 작성한 글만 가능합니다.");window.location.replace("/board/boardList");</script>');
                return;
            }
            childData.brdtitle = (childData.brdtitle).join(" "); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
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
        postData.brdtitle = (postData.brdtitle).split(' '); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
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
                        /** localStorege 일때 사용
                        fs.unlink(childData.path, (err) => {
                            console.log(err);
                        });
                        */
                        firebase.storage().bucket().file(childData.path).exists()
                            .then((result) => {
                                console.log(result);
                                if (result) {
                                    firebase.storage().bucket().file(childData.path).delete();
                                }
                            })
                            .catch((err) => {
                                console.log(err)
                            });
                        postData.path = null;
                        postData.publicUrl = null;
                    }
                    if (req.file) { //신규파일 등록
                        let path = req.file.path.replace(/\\/g, "/"); //윈도우서버용 경로때문에 추가
                        postData.path = path;
                        postData.publicUrl = req.file.publicUrl;
                    }
                    postData.brdtitle = (postData.brdtitle).split(' '); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
                    doc.update(postData);
                })
        } else { // 문자만 수정
            postData.brdtitle = (postData.brdtitle).split(' '); //파이어베이스DB는 텍스트검색을 지원하지 않기 때문에 배열로 저장
            doc.update(postData);
            console.log("여기3");
        }
    }
    //res.redirect('/board/boardList');
    res.json({ message: 'ok' });
});

router.post('/boardDelete', function (req, res, next) {
    console.log('여기-', req.body.brdno);
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    db.collection('board').doc(req.body.brdno).get()
        .then(async (doc) => {
            var childData = doc.data();
            console.log(req.session.email, "-", req.session.admined);
            if (req.session.email != childData.brdEmail && req.session.admined != true) {
                return res.status(400).json({
                    message: '수정/삭제는 본인이 작성한 글만 가능합니다.',
                });
                //res.send('<script>alert("수정/삭제는 본인이 작성한 글만 가능합니다.");window.location.replace("/board/boardList");</script>');
                //return;
            } else {
                console.log(childData.path);
                if (childData.path) {
                    /** localStorage 일때 사용
                    fs.unlink(childData.path, (err) => {
                        console.log(err);
                    });
                    */
                    firebase.storage().bucket().file(childData.path).exists()
                        .then((result) => {
                            console.log(result);
                            if (result) {
                                firebase.storage().bucket().file(childData.path).delete();
                            }
                        })
                        .catch((err) => {
                            console.log(err)
                        });
                }
                await db.collection('reply').where('brdno', '==', req.body.brdno).get()
                    .then(async (doc_list) => {
                        await Promise.all(doc_list.docs.map(async doc => { //snapshot.forEach(async (doc) => 대신 map 사용
                            try {
                                var childData = doc.data();
                                db.collection('reply').doc(childData.replyno).delete();//댓글 삭제
                            } catch (err) {
                                console.log('Error getting documents', err)
                            }
                        }));
                    });
                db.collection('board').doc(req.body.brdno).delete();//게시글 삭제
                res.redirect('/board/boardList');
            }

        })
});

module.exports = router;
