var express = require('express');
var router = express.Router();
var dateFormat = require('dateformat');

const { firebase, db } = require('../firebase_config');

// 페이징 변수 초기화 start : 시작점 doc정보, next: 다음 목록에 대한 정보
var pagingObj = {
    prev: null,
    next: null,
    size: 2,
}
let mypromise = (prevDate, brdno) => {
    return new Promise((resolve, reject) => {
        let query = db.collection('reply').orderBy("brddate", "asc");
        if (brdno) {
            query = query.where('brdno', '==', brdno);
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
router.get('/reply_list', async function (req, res, next) {
    var query = db.collection('reply').orderBy("brddate", "desc");
    if (req.query.brdno) {
        console.log(req.query.brdno);
        query = query.where('brdno', '==', req.query.brdno);
    }
    if (req.query.prev) {
        console.log("페이징 번호2 : ", Number(req.query.prev));
        //query = query.startAt(req.query.start); 실행이 적용되지 않아서 where 조건으로 변경
        query = query.where('brddate', '>', Number(req.query.prev));
        await mypromise(req.query.prev, req.query.brdno)
            .then((result) => {
                query = query.where('brddate', '<=', Number(result));
                console.log('여기2', result);
            })
            .catch((err) => {
                console.log(`Error getting documents ${err}`);
            });
    }
    if (req.query.next) {
        console.log("페이징 번호3 : ", Number(req.query.next));
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
            console.log("페이징 번호4 : ", snapshot.docs.length, "===", pagingObj.size);
            if (snapshot.docs.length == 0) {
                res.json({ pagingObj: pagingObj, message: 'nopaging' });
            } else {
                let rows = []; // DB출력 리스트 변수
                snapshot.forEach(async (doc) => {
                    var childData = doc.data();
                    childData.brddate = dateFormat(childData.brddate, "yyyy-mm-dd hh:mm");
                    rows.push(childData); //ejs에 보낼 데이터 추가
                });
                //console.log('댓글리스트', rows);
                res.json({ rows: rows, pagingObj: pagingObj, message: 'ok' });
            }
        })
        .catch((err) => {
            console.log('Error getting documents', err);
            res.json({ message: 'fail' });
        });
});

router.post('/reply_write', function (req, res, next) {
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    var postData = req.body;
    if (!postData.replyno) {  // new
        postData.brddate = Date.now();
        var doc = db.collection("reply").doc();
        postData.replyno = doc.id;
        postData.brdno = postData.brdno;
        postData.brdEmail = req.session.email;
        postData.replyer = req.session.name;
        postData.reply_text = postData.reply_text;
        doc.set(postData);
        res.json({ message: 'ok' });
    } else { // update
        if (req.session.email != postData.brdEmail && req.session.admined != true) {
            res.json({ message: '수정/삭제는 본인이 작성한 글만 가능합니다.' });
        } else {
            var doc = db.collection("reply").doc(postData.replyno);
            postData.brdEmail = req.session.email;//해킹방지
            postData.replyer = req.session.name;//해킹방지
            doc.update(postData);
            res.json({ message: 'ok' });
        }
    }    
});

router.post('/reply_delete', function (req, res, next) {
    console.log('여기-', req.body.replyno);
    if (!req.session.logined) {
        res.redirect('/board/loginForm');
        return;
    }
    //console.log(req.session.email, '확인', req.body.brdEmail);
    if (req.session.email != req.body.brdEmail && req.session.admined != true) {
        res.json({ message: '수정/삭제는 본인이 작성한 글만 가능합니다.' });
    }else{
        db.collection('reply').doc(req.body.replyno).delete()
        res.json({ message: 'ok' });
    }
});

module.exports = router;
