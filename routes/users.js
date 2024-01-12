var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});
var dateFormat = require('dateformat');
const { db } = require('../firebase_config');
const crypto = require('crypto');//사용자 비번 암호화에 내장 모듈사용
/**
 * 파이어베이스 firebase-admin에 signInWithEmailAndPassword 함수가 없어서 DB로그인 추가
 */
let cryptoPass = (userpwd, useremail) => {
  const salt = useremail;
  const hashPassword = crypto
    .createHash('sha512')
    .update(userpwd + salt)
    .digest('base64');
  return hashPassword;
}
router.post('/login', function (req, res) {
  if(req.body.useremail == '' || req.body.userpwd == '') {
    return res.status(400).json({
      message: 'fail',
    });
  }
  let useremail = '';
  console.log('아이디:', req.body.useremail);
  if (req.body.useremail != undefined) {
    useremail = req.body.useremail;
  }
  let userpwd = '';
  if (req.body.userpwd != undefined) {
    userpwd = req.body.userpwd;
  }
  var query = db.collection('users').orderBy("userdate", "desc");
  if (useremail) {
    query = query.where('useremail', '==', useremail);
  }
  if (userpwd) {
    userpwd = cryptoPass(userpwd, useremail);
    query = query.where('userpwd', '==', userpwd);
  }
  query.get()
    .then(async (snapshot) => {
      console.log(useremail, userpwd, snapshot.docs.length);
      if (snapshot.docs.length > 0) {
        await Promise.all(snapshot.docs.map(async doc => { //snapshot.forEach(async (doc) => 대신 map 사용
          try {
            var childData = doc.data();
            req.session.logined = true;//서버에서 사용
            req.session.name = childData.username;//서버에서 사용
            req.session.email = childData.useremail;//서버에서 사용
            req.session.userno = childData.userno;//서버에서 사용
            if (childData.useremail == "kimilguk@knou.ac.kr") {
              req.session.admined = true;//서버에서 사용
            } else {
              req.session.admined = false;//서버에서 사용
            }
            console.log(useremail, userpwd);
            return res.json({ message: 'ok' });
          } catch (err) {
            console.log('Error getting documents', err);
            return res.status(400).json({
              message: 'fail',
            });
          }
        }));
      }else{
        return res.status(400).json({
          message: 'fail',
        });
      }
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });
  //res.redirect('/');
});
// 페이징 변수 초기화 start : 시작점 doc정보, next: 다음 목록에 대한 정보
var pagingObj = {
  prev: null,
  next: null,
  size: 3,
}
let mypromise = (prevDate, keyword) => {
  return new Promise((resolve, reject) => {
    let query = db.collection('users').orderBy("userdate", "asc");
    if (keyword) {
      console.log(keyword);
      query = query.where('username', '==', keyword);
    }
    if (prevDate) {
      console.log("페이징 번호1 : ", Number(prevDate));
      query = query.where('userdate', '>', Number(prevDate));
    }
    query.limit(pagingObj.size)
      .get()
      .then((snapshot) => {
        console.log('여기', snapshot.docs[pagingObj.size - 1].data().userdate);
        resolve(snapshot.docs[pagingObj.size - 1].data().userdate);
      })
      .catch((err) => {
        console.log('Error getting documents', err);
        reject("실행에러")
      });
  });
}
// promose 데이터 업데이트 시 비동기화 때문에 정렬이 깨진 후 날짜별 재정렬
function custom_sort(b, a) { // 현재 내림차순
  return new Date(a.userdate).getTime() - new Date(b.userdate).getTime();
}
router.get('/userList', async function (req, res, next) {
  if (req.session.admined != true) {
    res.send('<script>alert("사용자 목록은 관리자만 보기 가능합니다.");window.location.replace("/");</script>');
    return;
  }
  let keyword = '';
  if (req.query.keyword != undefined) {
    keyword = req.query.keyword;//.where('brdtitle', 'array-contains', keyword)
  }
  var query = db.collection('users').orderBy("userdate", "desc");
  if (keyword) {
    console.log(keyword);
    query = query.where('username', '==', keyword);
  }
  if (req.query.prev) {
    console.log("페이징 번호1 : ", Number(req.query.prev));
    query = query.where('userdate', '>', Number(req.query.prev));
    await mypromise(req.query.prev, keyword)
      .then((result) => {
        query = query.where('userdate', '<=', Number(result));
        console.log('여기2', result);
      })
      .catch((err) => {
        console.log(`Error getting documents ${err}`);
      });
  }
  if (req.query.next) {
    console.log("페이징 번호1 : ", Number(req.query.next));
    query = query.where('userdate', '<', Number(req.query.next));
  }
  query.limit(pagingObj.size)
    .get()
    .then(async (snapshot) => {
      pagingObj = {
        size: pagingObj.size,
        prev: snapshot.docs[0], // document들 안에서 가장 첫번째 것을 가져온다. (내림차순이라서 변수명이 반대이다.)
        next: snapshot.docs.length === pagingObj.size ? snapshot.docs[snapshot.docs.length - 1] : null
      }
      if (snapshot.docs.length == 0) {
        res.send('<script>alert("페이징 자료가 없습니다. 목록으로 돌아갑니다.");window.history.back();</script>');
        return;
      }
      console.log("페이징 번호2 : ", snapshot.docs.length, "===", pagingObj.size);
      let rows = []; // DB출력 리스트 변수
      await Promise.all(snapshot.docs.map(async doc => { //snapshot.forEach(async (doc) => 대신 map 사용
        try {
          var childData = doc.data();
          childData.userdate_format = dateFormat(childData.userdate, "yyyy-mm-dd");//날짜 재정렬 custom_sort() 함수 때문에 제외
          rows.push(childData);
        } catch (err) {
          console.log('Error getting documents', err)
        }
      }));
      rows.sort(custom_sort);
      //console.log('순서3', rows);
      res.render('users/userList', { rows: rows, pagingObj: pagingObj });
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });
});

router.get('/userRead', function (req, res, next) {
  db.collection('users').doc(req.query.userno).get()
    .then((doc) => {
      var childData = doc.data();
      childData.userdate = dateFormat(childData.userdate, "yyyy-mm-dd hh:mm");
      res.render('users/userRead', { row: childData });
    })
});

router.get('/userForm', function (req, res, next) {
  res.render('users/userForm', { row: "" });
});

router.post('/userForm', function (req, res, next) {
  if (!req.session.logined) {
    res.redirect('/board/loginForm');
    return;
  }
  if (!req.body.userno) { // new
    res.render('users/userForm', { row: "" });
    return;
  }
  // update
  db.collection('users').doc(req.body.userno).get()
    .then((doc) => {
      var childData = doc.data();
      if (req.session.email != childData.useremail && req.session.admined != true) {
        res.send('<script>alert("수정/삭제는 본인만 가능합니다.");window.location.replace("/users/userList");</script>');
        return;
      }
      res.render('users/userForm', { row: childData });
    })
});

router.post('/userSave', async function (req, res, next) {
  var postData = req.body;
  if (!postData.userno) {  // new
    postData.userdate = Date.now();
    var doc = db.collection("users").doc();
    postData.userno = doc.id;
    postData.userpwd = cryptoPass(postData.userpwd, postData.useremail);
    doc.set(postData);
  } else {                // update
    var doc = db.collection("users").doc(postData.userno);
    var childData;
    await doc.get().then((subdoc) => {
      childData = subdoc.data();
    });
    console.log(postData.userpwd);
    if (postData.userpwd) {
      postData.userpwd = cryptoPass(postData.userpwd, postData.useremail);
    }else{
      postData.userpwd = childData.userpwd;
    }
    postData.useremail = req.session.email; //이메일은 한번 등록하면 변경하지 못하도록 강제로 등록
    doc.update(postData);
  }
  if (req.session.admined != true) {
    res.send('<script>alert("사용자 등록/수정 되었습니다. 홈으로 이동 합니다.");window.location.replace("/");</script>');
    return;
  } else {
    res.redirect('/users/userList');
  }
});

router.post('/userDelete', function (req, res, next) {
  if (!req.session.logined) {
    res.redirect('/board/loginForm');
    return;
  }
  db.collection('users').doc(req.body.userno).get()
    .then(async (doc) => {
      var childData = doc.data();
      console.log(req.session.email, "-", req.session.admined);
      if (req.session.email != childData.useremail && req.session.admined != true) {
        return res.status(400).json({
          message: '수정/삭제는 본인만 가능합니다.',
        });
      } else {
        db.collection('users').doc(req.body.userno).delete();//게시글 삭제
        if (req.session.admined != true) {
          res.send('<script>alert("사용자 삭제 되었습니다.");window.location.replace("/");</script>');
          return;
        } else {
          res.redirect('/users/userList');
        }
      }

    })
});

module.exports = router;
